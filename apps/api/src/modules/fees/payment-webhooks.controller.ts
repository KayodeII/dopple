import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { tenants } from '../../database/schema.js';
import { InjectDb, type Database } from '../../database/tokens.js';
import { TENANT_KEY, type Tenant } from '../../tenancy/tenant.js';
import { Public } from '../auth/decorators.js';
import {
  InjectPaymentProvider,
  InvalidWebhookError,
  type PaymentEvent,
  type PaymentProvider,
  type WebhookDelivery,
} from '../payments/payment-provider.js';
import { FakeProvider } from '../payments/providers/fake.provider.js';
import { FeesService } from './fees.service.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Where the payment provider tells us about payments. Platform-level: no school host,
 * no signed-in user. Trust comes from the provider's signature, checked by the adapter.
 */
@Public()
@Controller('payments')
export class PaymentWebhooksController {
  private readonly logger = new Logger(PaymentWebhooksController.name);

  constructor(
    @InjectPaymentProvider() private readonly payments: PaymentProvider,
    @InjectDb() private readonly db: Database,
    private readonly cls: ClsService,
    private readonly fees: FeesService,
  ) {}

  @Post('webhooks/:provider')
  @HttpCode(200)
  async webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (provider !== this.payments.name || !req.rawBody) {
      throw new NotFoundException();
    }
    await this.receive({ headers: req.headers, rawBody: req.rawBody });
    return { received: true };
  }

  /** The fake provider's payment page: pays at once and goes back to the school. */
  @Get('fake/pay')
  @Redirect()
  async fakePay(@Query('checkout_id') checkoutId: string) {
    if (!(this.payments instanceof FakeProvider)) throw new NotFoundException();
    const paid = this.payments.pay(checkoutId ?? '');
    if (!paid)
      throw new NotFoundException('No such checkout (was the API restarted?)');
    await this.receive(paid.delivery);
    return { url: paid.returnUrl };
  }

  private async receive(delivery: WebhookDelivery) {
    let event: PaymentEvent | null;
    try {
      event = this.payments.parseWebhook(delivery);
    } catch (error) {
      if (error instanceof InvalidWebhookError) {
        this.logger.warn(`rejected webhook: ${error.message}`);
        throw new BadRequestException('Invalid webhook');
      }
      throw error;
    }
    if (!event) return;

    // account.updated events carry no metadata; their status is refreshed when an admin looks.
    const tenantId = 'metadata' in event ? event.metadata.tenantId : undefined;
    if (!tenantId || !uuid.test(tenantId)) return;

    const [tenant] = await this.db
      .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), eq(tenants.status, 'active')));
    if (!tenant) return;

    this.cls.set<Tenant>(TENANT_KEY, tenant);
    await this.fees.handleEvent(event);
  }
}
