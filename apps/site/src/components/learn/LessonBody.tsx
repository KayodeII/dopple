import type { LessonBlock } from '@/lib/learn';
import {
  sectionText,
  splitTerm,
  type LessonSection,
  type SubjectTheme,
} from '@/lib/lesson-look';
import { ListenButton } from './ListenButton';
import { WorkedExample, type ExampleCopy } from './WorkedExample';

export interface LessonCopy {
  listen: string;
  stop: string;
  remember: string;
  example: ExampleCopy;
}

/**
 * The lesson as a path of numbered steps, one per heading. Content is plain text blocks,
 * never HTML (ADR 0011).
 */
export function LessonBody({
  sections,
  theme,
  copy,
}: {
  sections: LessonSection[];
  theme: SubjectTheme;
  copy: LessonCopy;
}) {
  return (
    <div className="flex flex-col gap-14">
      {sections.map((section) => {
        const listen = (
          <ListenButton
            text={sectionText(section)}
            label={copy.listen}
            stopLabel={copy.stop}
          />
        );
        if (!section.id) {
          return (
            <div key="intro" className="flex flex-col items-start gap-4">
              <Blocks blocks={section.blocks} theme={theme} copy={copy} lead />
              {listen}
            </div>
          );
        }
        return (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="relative scroll-mt-8 pl-13 sm:pl-20"
          >
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 flex h-full flex-col items-center"
            >
              <span
                className={`grid size-10 place-items-center rounded-full font-display text-[17px] font-extrabold text-ink sm:size-14 sm:text-[22px] ${theme.bg}`}
              >
                {section.step}
              </span>
              <span className="mt-3 w-0.5 flex-1 rounded-full bg-rule-strong" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <h2
                id={`${section.id}-title`}
                className="pt-1 font-display text-[26px] leading-tight font-bold tracking-tight sm:pt-2.5 sm:text-[32px]"
              >
                {section.title}
              </h2>
              {listen}
            </div>
            <div className="mt-5">
              <Blocks blocks={section.blocks} theme={theme} copy={copy} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Blocks({
  blocks,
  theme,
  copy,
  lead = false,
}: {
  blocks: LessonBlock[];
  theme: SubjectTheme;
  copy: LessonCopy;
  lead?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h':
            return null;
          case 'p':
            return (
              <p
                key={i}
                className={
                  lead && i === 0
                    ? 'max-w-[34ch] font-display text-[23px] leading-snug font-medium tracking-tight sm:text-[28px]'
                    : 'max-w-[62ch] text-[18px] leading-[1.7] sm:text-[19px]'
                }
              >
                {block.text}
              </p>
            );
          case 'list':
            return <List key={i} items={block.items} theme={theme} />;
          case 'example':
            return (
              <WorkedExample
                key={i}
                title={block.title}
                steps={block.steps}
                copy={copy.example}
              />
            );
          case 'tip':
            return <StickyNote key={i} text={block.text} heading={copy.remember} />;
        }
      })}
    </div>
  );
}

/** List items as small cards; "Term: meaning" items get the term in bold. */
function List({ items, theme }: { items: string[]; theme: SubjectTheme }) {
  const twoColumns = items.length >= 4 && items.every((item) => item.length <= 64);
  return (
    <ul className={`grid gap-2.5 ${twoColumns ? 'sm:grid-cols-2' : ''}`}>
      {items.map((item) => {
        const [term, rest] = splitTerm(item);
        return (
          <li
            key={item}
            className="flex gap-3 rounded-2xl border border-rule-strong bg-white px-4 py-3.5 text-[17px] leading-snug"
          >
            <span
              aria-hidden="true"
              className={`mt-[7px] size-2.5 shrink-0 rounded-full ${theme.dot}`}
            />
            <span>
              {term && <strong className="font-semibold">{term}: </strong>}
              {rest}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function StickyNote({ text, heading }: { text: string; heading: string }) {
  return (
    <aside className="relative mx-1 mt-3 max-w-[560px] -rotate-[0.8deg] rounded-md bg-sun px-6 pt-7 pb-6 text-ink shadow-[0_18px_30px_-18px_rgb(11_11_10/0.45)]">
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 rounded-sm bg-paper/75"
      />
      <p className="font-hand text-[30px] leading-none font-bold">{heading}</p>
      <p className="mt-2 text-[18px] leading-relaxed">{text}</p>
    </aside>
  );
}
