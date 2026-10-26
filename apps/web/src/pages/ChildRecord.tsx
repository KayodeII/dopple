import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import {
  HealthFields,
  readHealthForm,
  readStudentForm,
  StudentFields,
} from '../components/StudentForm';
import { Details, HealthList } from '../components/StudentRecord';
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Section,
} from '../components/ui';
import { api } from '../lib/api';
import { formatPhone } from '../lib/phone';
import {
  answerText,
  changedFields,
  FIELD_LABELS,
  longDate,
  PURPOSE_LABELS,
  showValue,
} from '../lib/record';
import { useChild, useMyCorrections, useWrite } from '../lib/queries';
import type {
  ChildRecord as ChildDetail,
  ConsentPurpose,
  CorrectionChanges,
} from '../lib/types';

/**
 * Everything the school holds about a parent's child, their consent, and a way to
 * ask for corrections (ADR 0017).
 */
export function ChildRecord() {
  const { id = '' } = useParams();
  const child = useChild(id);
  if (child.isPending) return <Loading />;
  if (!child.data) return <ErrorNote error={child.error} />;
  const c = child.data;

  return (
    <>
      <Link to="/" className="text-sm text-fg-3 hover:text-fg">
        ← Your children
      </Link>
      <PageHeader
        eyebrow={`Admission no. ${c.admissionNo}`}
        title={`${c.firstName} ${c.lastName}`}
      />
      <p className="max-w-[62ch] text-fg-2">
        This is everything the school keeps about {c.firstName}. If something is
        wrong, ask for a correction at the bottom of the page.
      </p>
      <Details student={c} />
      <Section title="Health">
        {c.health ? (
          <HealthList health={c.health} />
        ) : (
          <Empty>No health details on record.</Empty>
        )}
      </Section>
      <Section title="Parents and guardians">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {c.guardians.map((g) => (
            <li key={g.id}>
              <Card className="flex h-full flex-col gap-1.5">
                <span className="font-mono text-[12.5px] text-fg-3">
                  {g.relationship}
                  {g.you && ' · you'}
                </span>
                <span className="font-semibold">{g.name}</span>
                {g.phone && <span>{formatPhone(g.phone)}</span>}
                {g.email && (
                  <span className="truncate text-[14px] text-fg-2">
                    {g.email}
                  </span>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </Section>
      <YourConsent child={c} />
      <AskForCorrection child={c} />
    </>
  );
}

const ERASES: Partial<Record<ConsentPurpose, string>> = {
  health: 'The school will erase the health details it holds.',
  photo: 'The school will erase the passport photo it holds.',
};

function YourConsent({ child }: { child: ChildDetail }) {
  return (
    <Section title="Your consent">
      <p className="max-w-[62ch] text-fg-3">
        You can change your answer at any time.
      </p>
      <ul className="flex flex-col gap-3">
        {(Object.keys(PURPOSE_LABELS) as ConsentPurpose[]).map((purpose) => (
          <li key={purpose}>
            <ConsentCard child={child} purpose={purpose} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ConsentCard({
  child,
  purpose,
}: {
  child: ChildDetail;
  purpose: ConsentPurpose;
}) {
  const answer = child.consents[purpose];
  const [confirming, setConfirming] = useState(false);
  const save = useWrite(
    (given: boolean) =>
      api(`/children/${child.id}/consents/${purpose}`, {
        method: 'PUT',
        body: { given },
      }),
    [['children', 'one', child.id]],
  );
  const answerWith = (given: boolean) =>
    save.mutate(given, { onSuccess: () => setConfirming(false) });

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold">{PURPOSE_LABELS[purpose]}</h3>
        <span
          className={`text-[14px] ${
            answer?.given ? 'text-fg-2' : answer ? 'text-coral' : 'text-fg-3'
          }`}
        >
          {answerText(answer)}
        </span>
      </div>
      <blockquote className="max-w-[70ch] border-l-2 border-edge-2 pl-4 text-[15px] text-fg-2">
        {child.consentWording[purpose]}
      </blockquote>
      <ErrorNote error={save.error} />
      {confirming ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px]">
            {ERASES[purpose] ??
              'The school will review what it keeps about your child.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={save.isPending}
              onClick={() => answerWith(false)}
            >
              Yes, withdraw
            </Button>
            <Button variant="quiet" onClick={() => setConfirming(false)}>
              Keep my consent
            </Button>
          </div>
        </div>
      ) : answer?.given ? (
        <Button
          variant="quiet"
          className="w-fit"
          onClick={() => setConfirming(true)}
        >
          Withdraw consent
        </Button>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button disabled={save.isPending} onClick={() => answerWith(true)}>
            I agree
          </Button>
          {!answer && (
            <Button
              variant="quiet"
              disabled={save.isPending}
              onClick={() => answerWith(false)}
            >
              I don’t agree
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

const STATUS = {
  pending: 'Waiting for the school',
  applied: 'Corrected',
  declined: 'Not changed',
};

function AskForCorrection({ child }: { child: ChildDetail }) {
  const [asking, setAsking] = useState(false);
  const [unchanged, setUnchanged] = useState(false);
  const mine = useMyCorrections(child.id);
  const canCorrectHealth = !!child.consents.health?.given;
  const send = useWrite(
    (body: { changes: CorrectionChanges; note: string | null }) =>
      api(`/children/${child.id}/corrections`, { method: 'POST', body }),
    [['corrections', 'mine', child.id]],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const {
      admissionNo: _no,
      admittedOn: _on,
      ...record
    } = readStudentForm(form);
    const proposed = canCorrectHealth
      ? { ...record, ...readHealthForm(form) }
      : record;
    const changes = changedFields({ ...child, ...child.health }, proposed);
    setUnchanged(Object.keys(changes).length === 0);
    if (Object.keys(changes).length === 0) return;
    const note = String(form.get('note') ?? '').trim() || null;
    send.mutate({ changes, note }, { onSuccess: () => setAsking(false) });
  }

  return (
    <Section
      title="Ask for a correction"
      action={
        !asking && (
          <Button variant="quiet" onClick={() => setAsking(true)}>
            Something is wrong
          </Button>
        )
      }
    >
      {asking && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-5 rounded-2xl bg-card p-5"
        >
          <p className="text-[15px] text-fg-2">
            Change what is wrong and send it. The school checks every change
            before it goes on the record.
          </p>
          <StudentFields student={child} schoolFields={false} />
          {canCorrectHealth && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[13px] font-semibold tracking-wide text-fg-3 uppercase">
                Health
              </legend>
              <HealthFields health={child.health} />
            </fieldset>
          )}
          <Field
            label="Anything the school should know (optional)"
            name="note"
            maxLength={500}
            placeholder="We moved house in August"
          />
          {unchanged && (
            <p role="alert" className="text-[15px] text-coral">
              Nothing has changed yet. Edit what is wrong first.
            </p>
          )}
          <ErrorNote error={send.error} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={send.isPending}>
              Send to the school
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() => setAsking(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      <ErrorNote error={mine.error} />
      {mine.data?.length ? (
        <ul className="flex flex-col gap-3" aria-label="Your requests">
          {mine.data.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[14px] text-fg-3">
                    Asked on {longDate(c.createdAt)}
                  </span>
                  <span
                    className={`text-[14px] font-semibold ${
                      c.status === 'declined' ? 'text-coral' : 'text-fg-2'
                    }`}
                  >
                    {STATUS[c.status]}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {Object.entries(c.changes).map(([field, value]) => (
                    <li key={field}>
                      <span className="text-fg-3">
                        {FIELD_LABELS[field as keyof typeof FIELD_LABELS] ??
                          field}
                        :
                      </span>{' '}
                      {showValue(field, value)}
                    </li>
                  ))}
                </ul>
                {c.reply && (
                  <p className="text-[15px]">The school said: “{c.reply}”</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
