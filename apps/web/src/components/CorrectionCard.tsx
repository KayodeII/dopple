import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { useWrite } from '../lib/queries';
import { FIELD_LABELS, longDate, showValue } from '../lib/record';
import type { CorrectionChanges, PendingCorrection } from '../lib/types';
import { Button, Card, ErrorNote, Field } from './ui';

/** One open correction request: what changes, from what, and the admin's decision. */
export function CorrectionCard({
  showStudent = false,
  correction: c,
}: {
  correction: PendingCorrection;
  showStudent?: boolean;
}) {
  const [declining, setDeclining] = useState(false);
  const refresh = [['corrections'], ['students']];
  const apply = useWrite(
    () => api(`/corrections/${c.id}/apply`, { method: 'POST' }),
    refresh,
  );
  const decline = useWrite(
    (reply: string) =>
      api(`/corrections/${c.id}/decline`, { method: 'POST', body: { reply } }),
    refresh,
  );

  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-[14px] text-fg-3">
        {showStudent && (
          <>
            <Link
              to={`/students/${c.student.id}`}
              className="font-semibold text-fg underline-offset-4 hover:underline"
            >
              {c.student.firstName} {c.student.lastName}
            </Link>
            {' · '}
          </>
        )}
        {c.requestedBy.name} asked on {longDate(c.createdAt)}
      </p>
      <dl className="flex flex-col gap-2">
        {Object.entries(c.changes).map(([field, value]) => (
          <div key={field} className="flex flex-wrap gap-x-3">
            <dt className="w-44 text-[14px] text-fg-3">
              {FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field}
            </dt>
            <dd className="min-w-0 break-words">
              <span className="text-fg-3 line-through">
                {showValue(field, c.current[field as keyof CorrectionChanges])}
              </span>{' '}
              → <span className="font-semibold">{showValue(field, value)}</span>
            </dd>
          </div>
        ))}
      </dl>
      {c.note && <p className="text-[15px]">“{c.note}”</p>}
      <ErrorNote error={apply.error ?? decline.error} />
      {declining ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const reply = String(
              new FormData(event.currentTarget).get('reply'),
            );
            decline.mutate(reply);
          }}
        >
          <Field
            label="Why not? The parent sees this"
            name="reply"
            required
            maxLength={500}
            placeholder="Please bring the birth certificate to the office"
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" disabled={decline.isPending}>
              Decline
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() => setDeclining(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => apply.mutate(undefined)}
            disabled={apply.isPending}
          >
            Apply changes
          </Button>
          <Button variant="quiet" onClick={() => setDeclining(true)}>
            Decline…
          </Button>
        </div>
      )}
    </Card>
  );
}
