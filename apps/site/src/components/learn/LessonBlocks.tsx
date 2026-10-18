import type { LessonBlock } from '@/lib/learn';

/** Renders lesson blocks as plain text elements; content never carries HTML (ADR 0011). */
export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="flex flex-col gap-5 text-[18px] leading-relaxed">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h':
            return (
              <h2
                key={i}
                className="mt-4 font-display text-[24px] leading-tight font-bold tracking-tight"
              >
                {block.text}
              </h2>
            );
          case 'p':
            return <p key={i}>{block.text}</p>;
          case 'list':
            return (
              <ul key={i} className="flex list-disc flex-col gap-2 pl-6">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case 'example':
            return (
              <figure
                key={i}
                className="rounded-2xl border border-rule-strong bg-white p-5"
              >
                <figcaption className="eyebrow mb-3 text-muted">
                  Example · {block.title}
                </figcaption>
                <ol className="flex list-decimal flex-col gap-1.5 pl-6 font-mono text-[16px]">
                  {block.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </figure>
            );
          case 'tip':
            return (
              <p
                key={i}
                className="rounded-2xl bg-sun/25 px-5 py-4 text-[17px]"
              >
                <strong>Tip: </strong>
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}
