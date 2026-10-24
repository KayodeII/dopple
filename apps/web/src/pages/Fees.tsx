import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Section,
  Select,
} from '../components/ui';
import { api } from '../lib/api';
import { currentSession, isoDate } from '../lib/dates';
import { formatNaira, parseNaira } from '../lib/money';
import {
  useClasses,
  useFees,
  useMyFees,
  usePaymentAccount,
  useSessions,
  useStudents,
  useWrite,
} from '../lib/queries';
import { useUser } from '../lib/session';
import type { Fee } from '../lib/types';

/** Admins bill students and see what is paid; students and parents see and pay their own. */
export function Fees() {
  const user = useUser();
  if (user.role === 'admin') return <SchoolFees />;
  if (user.role === 'student' || user.role === 'parent') return <MyFees />;
  return (
    <>
      <PageHeader eyebrow="Money" title="Fees" />
      <Empty>Fees are handled by the school office.</Empty>
    </>
  );
}

function SchoolFees() {
  const fees = useFees();
  const [billing, setBilling] = useState(false);
  const owed = (fees.data ?? []).reduce(
    (sum, fee) =>
      sum + fee.amountMinor - Math.min(fee.paidMinor, fee.amountMinor),
    0,
  );
  const paid = (fees.data ?? []).reduce((sum, fee) => sum + fee.paidMinor, 0);

  return (
    <>
      <PageHeader eyebrow="Money" title="Fees">
        {!billing && (
          <Button onClick={() => setBilling(true)}>Bill a fee</Button>
        )}
      </PageHeader>
      <PaymentsSetup />
      {billing && <BillFee onClose={() => setBilling(false)} />}
      <Section title="All fees">
        <ErrorNote error={fees.error} />
        {fees.isPending ? (
          <Loading />
        ) : fees.data?.length === 0 ? (
          <Empty>No fees yet. Bill a class or a student to start.</Empty>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Total label="Paid" value={formatNaira(paid)} />
              <Total label="Still owed" value={formatNaira(owed)} />
            </div>
            <FeeTable fees={fees.data ?? []} />
          </>
        )}
      </Section>
    </>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-[160px] flex-1">
      <p className="text-[13px] text-fg-3">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </Card>
  );
}

/** Connecting the school's own account with the payment provider, so fees settle to the school. */
function PaymentsSetup() {
  const account = usePaymentAccount();
  const connect = useWrite(
    () => api('/fees/account', { method: 'POST' }),
    [['fees', 'account']],
  );
  const data = account.data;
  if (account.isPending) return null;
  if (account.error) return <ErrorNote error={account.error} />;

  if (!data?.connected) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">Take fees online</h2>
        <p className="text-fg-2">
          Parents and students pay by card or bank transfer, and the money goes
          straight to the school’s own account.
        </p>
        <ErrorNote error={connect.error} />
        <div>
          <Button
            onClick={() => connect.mutate(undefined)}
            disabled={connect.isPending}
          >
            Set up online payments
          </Button>
        </div>
      </Card>
    );
  }
  if (data.status === 'active') {
    return (
      <p className="text-[15px] text-fg-2">
        <span
          aria-hidden="true"
          className="mr-2 inline-block size-2 rounded-full bg-seafoam"
        />
        Taking payments online.
        {data.provider === 'fake' &&
          ' Test mode: payments go through at once and no real money moves.'}
      </p>
    );
  }
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h2 className="text-lg font-semibold">
        {data.status === 'restricted'
          ? 'Online payments are paused'
          : 'Online payments are being set up'}
      </h2>
      <p className="text-fg-2">
        The payment provider is checking the school’s details. Fees can be
        billed meanwhile; paying online starts once it is done.
      </p>
      {!!data.requirementsDue?.length && (
        <p className="text-[14px] text-fg-3">
          Still needed: {data.requirementsDue.join(', ')}
        </p>
      )}
    </Card>
  );
}

function BillFee({ onClose }: { onClose: () => void }) {
  const sessions = useSessions();
  const session = sessions.data
    ? currentSession(sessions.data, isoDate(new Date()))
    : undefined;
  const classes = useClasses(session?.id);
  const students = useStudents('');
  const [amountError, setAmountError] = useState<string>();
  const bill = useWrite(
    (input: object) =>
      api<{ created: number }>('/fees', { method: 'POST', body: input }),
    [['fees']],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountMinor = parseNaira(String(form.get('amount')));
    if (!amountMinor) {
      setAmountError('Enter an amount in naira, like 50,000');
      return;
    }
    setAmountError(undefined);
    const [kind, id] = String(form.get('who')).split(':');
    bill.mutate(
      {
        description: String(form.get('description')),
        amountMinor,
        dueOn: String(form.get('dueOn')) || null,
        ...(kind === 'class' ? { classId: id } : { studentIds: [id] }),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Section title="Bill a fee">
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl bg-card p-5"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Field
            label="What it is for"
            name="description"
            placeholder="First term tuition"
            required
            maxLength={120}
          />
          <Field
            label="Amount (₦)"
            name="amount"
            inputMode="decimal"
            placeholder="50,000"
            required
          />
          <Field label="Due date (optional)" name="dueOn" type="date" />
          <Select label="Who pays" name="who" required defaultValue="">
            <option value="" disabled>
              Choose a class or a student
            </option>
            {!!classes.data?.length && (
              <optgroup
                label={`Whole class${session ? `, ${session.name}` : ''}`}
              >
                {classes.data.map((c) => (
                  <option key={c.id} value={`class:${c.id}`}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            {!!students.data?.length && (
              <optgroup label="One student">
                {students.data.map((s) => (
                  <option key={s.id} value={`student:${s.id}`}>
                    {s.lastName}, {s.firstName} ({s.admissionNo})
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </div>
        {amountError && (
          <p role="alert" className="text-[15px] text-coral">
            {amountError}
          </p>
        )}
        <ErrorNote error={bill.error} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={bill.isPending}>
            Bill fee
          </Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Section>
  );
}

function FeeTable({ fees }: { fees: Fee[] }) {
  const remove = useWrite(
    (id: string) => api(`/fees/${id}`, { method: 'DELETE' }),
    [['fees']],
  );
  return (
    <>
      <ErrorNote error={remove.error} />
      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="text-[13px] text-fg-3">
            <tr>
              <th className="px-4 py-3 font-normal">Student</th>
              <th className="px-4 py-3 font-normal">For</th>
              <th className="px-4 py-3 text-right font-normal">Amount</th>
              <th className="px-4 py-3 text-right font-normal">Paid</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="border-t border-edge">
                <td className="px-4 py-3">
                  <span className="font-semibold">
                    {fee.student.lastName}, {fee.student.firstName}
                  </span>{' '}
                  <span className="font-mono text-[12.5px] text-fg-3">
                    {fee.student.admissionNo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {fee.description}
                  {fee.dueOn && (
                    <span className="block text-[13px] text-fg-3">
                      Due {fee.dueOn}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNaira(fee.amountMinor)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNaira(fee.paidMinor)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={fee.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {fee.status === 'unpaid' && (
                    <button
                      type="button"
                      className="min-h-11 rounded-lg px-2 text-[13px] text-fg-2 hover:bg-raised"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(fee.id)}
                      aria-label={`Delete ${fee.description} for ${fee.student.firstName}`}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: Fee['status'] }) {
  const look = {
    paid: 'bg-seafoam text-ink',
    'part-paid': 'bg-sun text-ink',
    unpaid: 'border border-edge-2 text-fg-2',
  }[status];
  const label = { paid: 'Paid', 'part-paid': 'Part paid', unpaid: 'Unpaid' }[
    status
  ];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${look}`}
    >
      {label}
    </span>
  );
}

function MyFees() {
  const user = useUser();
  const fees = useMyFees();
  const parent = user.role === 'parent';
  const [params] = useSearchParams();
  const pay = useWrite(
    (id: string) => api<{ url: string }>(`/fees/${id}/pay`, { method: 'POST' }),
    [],
  );

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title={parent ? 'Your children’s fees' : 'My fees'}
      />
      {params.has('paid') && (
        <p role="status" className="rounded-xl bg-card px-4 py-3 text-[15px]">
          Thank you. Your payment was received; it shows as paid here once the
          payment provider confirms it.
        </p>
      )}
      <ErrorNote error={fees.error ?? pay.error} />
      {fees.isPending ? (
        <Loading />
      ) : fees.data?.length === 0 ? (
        <Empty>
          {parent
            ? 'Nothing to pay for your children.'
            : 'You have no fees to pay.'}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {fees.data?.map((fee) => {
            const left = fee.amountMinor - fee.paidMinor;
            return (
              <li key={fee.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex flex-col gap-1">
                    {parent && (
                      <span className="font-mono text-[12.5px] text-fg-3">
                        {fee.student.firstName} {fee.student.lastName}
                      </span>
                    )}
                    <span className="font-semibold">{fee.description}</span>
                    <span className="text-[14px] text-fg-3">
                      {formatNaira(fee.amountMinor)}
                      {fee.dueOn && ` · due ${fee.dueOn}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={fee.status} />
                    {left > 0 && (
                      <Button
                        disabled={pay.isPending}
                        onClick={() =>
                          pay.mutate(fee.id, {
                            onSuccess: ({ url }) => window.location.assign(url),
                          })
                        }
                      >
                        Pay {formatNaira(left)}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
