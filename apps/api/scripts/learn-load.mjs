// Loads Dopple Learn content (content/learn/) into Postgres (ADR 0011). Idempotent: run it after
// every content change. The folder is the source of truth, so topics removed from it are deleted.
// Runs as the database owner (MIGRATION_DATABASE_URL) because the app role can only read Learn.
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { parseContent } from '../src/modules/learn/content.ts';

const root = new URL('../../../content/learn/', import.meta.url);
const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'));

const files = (await readdir(new URL('topics/', root))).filter((f) => f.endsWith('.json')).sort();
const { subjects, topics } = parseContent({
  subjects: await readJson(new URL('subjects.json', root)),
  topics: await Promise.all(files.map((f) => readJson(new URL(`topics/${f}`, root)))),
});

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL is not set (see .env.example)');
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query('begin');
  for (const s of subjects) {
    await client.query(
      `insert into learn_subjects (slug, name, classes) values ($1, $2, $3)
       on conflict (slug) do update set name = excluded.name, classes = excluded.classes`,
      [s.slug, s.name, s.classes],
    );
  }
  for (const t of topics) {
    const { rows } = await client.query(
      `insert into learn_topics (slug, class_level, subject_slug, position, title, summary, minutes, lesson)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (slug) do update
         set class_level = excluded.class_level, subject_slug = excluded.subject_slug,
             position = excluded.position, title = excluded.title, summary = excluded.summary,
             minutes = excluded.minutes, lesson = excluded.lesson, updated_at = now()
       returning id`,
      [t.slug, t.class, t.subject, t.position, t.title, t.summary, t.minutes, JSON.stringify(t.lesson)],
    );
    const topicId = rows[0].id;
    await client.query('delete from learn_questions where topic_id = $1', [topicId]);
    for (const [i, q] of t.questions.entries()) {
      await client.query(
        `insert into learn_questions (topic_id, position, prompt, options, answer, explanation)
         values ($1, $2, $3, $4, $5, $6)`,
        [topicId, i + 1, q.prompt, q.options, q.answer, q.explanation],
      );
    }
  }
  const removed = await client.query('delete from learn_topics where not (slug = any($1))', [
    topics.map((t) => t.slug),
  ]);
  await client.query('delete from learn_subjects where not (slug = any($1))', [
    subjects.map((s) => s.slug),
  ]);
  await client.query('commit');
  console.log(
    `Loaded ${subjects.length} subjects and ${topics.length} topics` +
      (removed.rowCount ? `; removed ${removed.rowCount} old topics.` : '.'),
  );
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
