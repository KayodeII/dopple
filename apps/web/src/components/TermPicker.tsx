import { Select } from './ui';
import type { TermInSession } from '../lib/dates';

/** Chooses a term; labels say which school year it belongs to when there is more than one. */
export function TermPicker({
  terms,
  value,
  onChange,
}: {
  terms: TermInSession[];
  value: string | undefined;
  onChange: (termId: string) => void;
}) {
  const years = new Set(terms.map((t) => t.session.id)).size;
  return (
    <div className="w-full max-w-[280px]">
      <Select
        label="Term"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {terms.map(({ term, session }) => (
          <option key={term.id} value={term.id}>
            {years > 1 ? `${term.name}, ${session.name}` : term.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
