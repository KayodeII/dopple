import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import { InjectEnv } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import {
  enrolments,
  feePayments,
  fees,
  paymentAccounts,
  paymentEvents,
  students,
  tenants,
  users,
} from '../../database/schema.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';
import { feePaymentsReceived } from '../../observability/metrics.js';
import { schoolOrigin } from '../../tenancy/school-url.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import {
  InjectPaymentProvider,
  type PaymentEvent,
  type PaymentProvider,
} from '../payments/payment-provider.js';
import type { CreateFeesBody } from './fees.dto.js';

/** What a fee looks like to the web app: what is owed, and how much of it is paid. */
const feeColumns = {
  id: fees.id,
  description: fees.description,
  amountMinor: fees.amountMinor,
  currency: fees.currency,
  dueOn: fees.dueOn,
  paidMinor: sql<number>`(
    select coalesce(sum(${feePayments.amountMinor}), 0)::bigint from ${feePayments}
    where ${feePayments.tenantId} = ${fees.tenantId}
      and ${feePayments.feeId} = ${fees.id}
      and ${feePayments.status} = 'succeeded'
  )`.mapWith(Number),
  student: {
    id: students.id,
    admissionNo: students.admissionNo,
    firstName: students.firstName,
    lastName: students.lastName,
  },
};

const sameStudent = and(
  eq(students.tenantId, fees.tenantId),
  eq(students.id, fees.studentId),
);

const withStatus = <T extends { amountMinor: number; paidMinor: number }>(
  fee: T,
) => ({
  ...fee,
  status:
    fee.paidMinor >= fee.amountMinor
      ? ('paid' as const)
      : fee.paidMinor > 0
        ? ('part-paid' as const)
        : ('unpaid' as const),
});

/**
 * School fees (ADR 0013). Every call to the payment provider goes through the
 * PaymentProvider adapter; nothing here knows which provider it is.
 */
@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly cls: ClsService,
    @InjectPaymentProvider() private readonly payments: PaymentProvider,
    @InjectEnv() private readonly env: Env,
  ) {}

  /** The school's account with the current provider, refreshed while it is being verified. */
  async account() {
    const row = await this.tenantDb.run((tx) => this.findAccount(tx));
    if (!row) return { provider: this.payments.name, connected: false };
    if (row.status === 'active') return this.toAccount(row);

    const fresh = await this.payments.getSchoolAccount(row.accountId);
    const updated = await this.tenantDb.run(async (tx) => {
      const [saved] = await tx
        .update(paymentAccounts)
        .set({
          status: fresh.status,
          requirementsDue: fresh.requirementsDue,
          updatedAt: new Date(),
        })
        .where(eq(paymentAccounts.provider, this.payments.name))
        .returning();
      return saved;
    });
    return this.toAccount(updated);
  }

  /** Opens the school's own account with the provider. Safe to call twice. */
  async connectAccount() {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    const existing = await this.tenantDb.run(async (tx, tenant) => ({
      account: await this.findAccount(tx),
      schoolName: tenant.name,
      contactEmail: (
        await tx
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, userId))
      )[0]?.email,
    }));
    if (existing.account) return this.toAccount(existing.account);

    const account = await this.payments.createSchoolAccount({
      schoolName: existing.schoolName,
      contactEmail: existing.contactEmail!,
    });
    return this.tenantDb.run(async (tx, tenant) => {
      await tx
        .insert(paymentAccounts)
        .values({
          tenantId: tenant.id,
          provider: this.payments.name,
          accountId: account.accountId,
          status: account.status,
          requirementsDue: account.requirementsDue,
        })
        // Two admins pressing the button at once: the first account wins.
        .onConflictDoNothing();
      return this.toAccount((await this.findAccount(tx))!);
    });
  }

  list(query: { studentId?: string }) {
    return this.listWhere(
      query.studentId ? eq(fees.studentId, query.studentId) : undefined,
    );
  }

  /** A student's own fees. Parents see their children's once guardians exist. */
  mine() {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.listWhere(eq(students.userId, userId));
  }

  create(input: CreateFeesBody) {
    return this.tenantDb.run(async (tx, tenant) => {
      const studentIds = input.classId
        ? (
            await tx
              .select({ id: enrolments.studentId })
              .from(enrolments)
              .where(eq(enrolments.classId, input.classId))
          ).map((row) => row.id)
        : [...new Set(input.studentIds)];

      if (input.studentIds) {
        const found = await tx
          .select({ id: students.id })
          .from(students)
          .where(inArray(students.id, studentIds));
        if (found.length !== studentIds.length) {
          throw new UnprocessableEntityException(
            'Some students were not found',
          );
        }
      }
      if (studentIds.length === 0) {
        throw new UnprocessableEntityException('No students in that class');
      }

      const created = await tx
        .insert(fees)
        .values(
          studentIds.map((studentId) => ({
            tenantId: tenant.id,
            studentId,
            description: input.description,
            amountMinor: input.amountMinor,
            dueOn: input.dueOn,
          })),
        )
        .returning({ id: fees.id });
      return { created: created.length };
    });
  }

  /** Only a fee nobody has tried to pay can go: payments are the school's money record. */
  remove(id: string) {
    return this.tenantDb.run(async (tx) => {
      const [payment] = await tx
        .select({ id: feePayments.id })
        .from(feePayments)
        .where(eq(feePayments.feeId, id))
        .limit(1);
      if (payment) {
        throw new ConflictException(
          'This fee has payments, so it cannot be deleted',
        );
      }
      const deleted = await tx
        .delete(fees)
        .where(eq(fees.id, id))
        .returning({ id: fees.id });
      if (deleted.length === 0) throw new NotFoundException('Fee not found');
    });
  }

  /** Starts paying what is left of a fee, and returns the provider's payment page. */
  async startPayment(feeId: string) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    const pending = await this.tenantDb.run(async (tx, tenant) => {
      const [fee] = await tx
        .select({ ...feeColumns, userId: students.userId })
        .from(fees)
        .innerJoin(students, sameStudent)
        .where(eq(fees.id, feeId));
      if (!fee) throw new NotFoundException('Fee not found');
      if (fee.userId !== userId) {
        throw new ForbiddenException('You can only pay your own fees');
      }
      const owed = fee.amountMinor - fee.paidMinor;
      if (owed <= 0) throw new ConflictException('This fee is already paid');

      const account = await this.findAccount(tx);
      if (account?.status !== 'active') {
        throw new ConflictException(
          'This school cannot take payments online yet',
        );
      }

      const [{ email }] = await tx
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId));
      const [{ customDomain }] = await tx
        .select({ customDomain: tenants.customDomain })
        .from(tenants)
        .where(eq(tenants.id, tenant.id));
      const [payment] = await tx
        .insert(feePayments)
        .values({
          tenantId: tenant.id,
          feeId,
          provider: this.payments.name,
          amountMinor: owed,
          payerId: userId,
        })
        .returning({ id: feePayments.id });

      const origin = schoolOrigin(this.env, {
        slug: tenant.slug,
        customDomain,
      });
      return {
        paymentId: payment.id,
        checkout: {
          accountId: account.accountId,
          amountMinor: owed,
          currency: 'NGN' as const,
          reference: payment.id,
          payerEmail: email,
          successUrl: `${origin}/fees?paid=${payment.id}`,
          cancelUrl: `${origin}/fees`,
          metadata: { tenantId: tenant.id },
        },
      };
    });

    try {
      const checkout = await this.payments.createCheckout(pending.checkout);
      await this.tenantDb.run((tx) =>
        tx
          .update(feePayments)
          .set({ checkoutId: checkout.checkoutId })
          .where(eq(feePayments.id, pending.paymentId)),
      );
      return { paymentId: pending.paymentId, url: checkout.url };
    } catch (error) {
      await this.tenantDb.run((tx) =>
        tx
          .update(feePayments)
          .set({ status: 'failed' })
          .where(eq(feePayments.id, pending.paymentId)),
      );
      throw error;
    }
  }

  /**
   * A verified webhook event, in the school its metadata names (the caller has set the
   * tenant). The metadata is ours and signed by the provider, and the event must also
   * come from this school's own account, so another school's event cannot touch it.
   */
  handleEvent(event: PaymentEvent) {
    return this.tenantDb.run(async (tx, tenant) => {
      const account = await this.findAccount(tx);
      if (!account || account.accountId !== event.accountId) {
        this.logger.warn(
          { eventId: event.eventId, tenant: tenant.slug },
          'payment event from an account that is not the school’s; ignored',
        );
        return;
      }

      const [first] = await tx
        .insert(paymentEvents)
        .values({
          tenantId: tenant.id,
          provider: this.payments.name,
          eventId: event.eventId,
          type: event.type,
        })
        .onConflictDoNothing()
        .returning({ eventId: paymentEvents.eventId });
      if (!first) return; // delivered before

      if (event.type === 'account.updated') {
        const fresh = await this.payments.getSchoolAccount(account.accountId);
        await tx
          .update(paymentAccounts)
          .set({
            status: fresh.status,
            requirementsDue: fresh.requirementsDue,
            updatedAt: new Date(),
          })
          .where(eq(paymentAccounts.provider, this.payments.name));
        return;
      }

      const reference = event.reference ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(reference)) return;
      const [payment] = await tx
        .select({
          amountMinor: feePayments.amountMinor,
          status: feePayments.status,
          currency: fees.currency,
        })
        .from(feePayments)
        .innerJoin(
          fees,
          and(
            eq(fees.tenantId, feePayments.tenantId),
            eq(fees.id, feePayments.feeId),
          ),
        )
        .where(
          and(
            eq(feePayments.id, reference),
            eq(feePayments.provider, this.payments.name),
          ),
        );
      if (!payment || payment.status === 'succeeded') return;

      if (event.type === 'payment.failed') {
        await tx
          .update(feePayments)
          .set({ status: 'failed' })
          .where(eq(feePayments.id, reference));
        return;
      }
      if (
        event.amountMinor < payment.amountMinor ||
        event.currency !== payment.currency
      ) {
        this.logger.warn(
          { eventId: event.eventId, tenant: tenant.slug },
          'payment amount or currency does not match; left pending for review',
        );
        return;
      }
      await tx
        .update(feePayments)
        .set({ status: 'succeeded', paidAt: new Date() })
        .where(eq(feePayments.id, reference));
      feePaymentsReceived.add(1, { provider: this.payments.name });
    });
  }

  private listWhere(where: SQL | undefined) {
    return this.tenantDb.run(async (tx) => {
      const rows = await tx
        .select(feeColumns)
        .from(fees)
        .innerJoin(students, sameStudent)
        .where(where)
        .orderBy(desc(fees.createdAt), students.lastName, students.firstName);
      return rows.map(withStatus);
    });
  }

  private async findAccount(tx: Transaction) {
    const [row] = await tx
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.provider, this.payments.name));
    return row;
  }

  private toAccount(row: typeof paymentAccounts.$inferSelect) {
    return {
      provider: row.provider,
      connected: true,
      status: row.status,
      requirementsDue: row.requirementsDue,
    };
  }
}
