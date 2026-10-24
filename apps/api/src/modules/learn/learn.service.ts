import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import {
  learnQuestions,
  learnSubjects,
  learnTopics,
} from '../../database/schema.js';
import { InjectDb, type Database } from '../../database/tokens.js';
import { CLASSES, STAGES } from './content.js';

/**
 * Dopple Learn (ADR 0011). Platform-wide content, not tenant-owned, so it is read with the
 * plain client: there is no school and no row-level security here.
 */
@Injectable()
export class LearnService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Every stage and class, with how many lessons each has so far. */
  async catalogue() {
    const counts = await this.db
      .select({ classLevel: learnTopics.classLevel, topics: count() })
      .from(learnTopics)
      .groupBy(learnTopics.classLevel);
    const byClass = new Map(counts.map((c) => [c.classLevel, c.topics]));
    return {
      stages: STAGES.map((stage) => ({
        slug: stage.slug,
        name: stage.name,
        classes: stage.classes.map((c) => ({
          slug: c.slug,
          name: c.name,
          topicCount: byClass.get(c.slug) ?? 0,
        })),
      })),
    };
  }

  /** A class's subjects (those with lessons first) and their topics in order. */
  async classLevel(slug: string) {
    const level = findClass(slug);
    const [subjects, topics] = await Promise.all([
      this.db
        .select({
          slug: learnSubjects.slug,
          name: learnSubjects.name,
          classes: learnSubjects.classes,
        })
        .from(learnSubjects)
        .orderBy(asc(learnSubjects.name)),
      this.db
        .select({
          slug: learnTopics.slug,
          subject: learnTopics.subjectSlug,
          title: learnTopics.title,
          summary: learnTopics.summary,
          minutes: learnTopics.minutes,
          questionCount: count(learnQuestions.position),
        })
        .from(learnTopics)
        .leftJoin(learnQuestions, eq(learnQuestions.topicId, learnTopics.id))
        .where(eq(learnTopics.classLevel, level.slug))
        .groupBy(learnTopics.id)
        .orderBy(asc(learnTopics.position)),
    ]);
    const taught = subjects
      .filter((s) => s.classes.includes(level.slug))
      .map(({ slug, name }) => ({
        slug,
        name,
        topics: topics
          .filter((t) => t.subject === slug)
          .map(({ slug, title, summary, minutes, questionCount }) => ({
            slug,
            title,
            summary,
            minutes,
            questionCount,
          })),
      }));
    taught.sort(
      (a, b) => Number(b.topics.length > 0) - Number(a.topics.length > 0),
    );
    return { class: level, subjects: taught };
  }

  /** One lesson with its practice questions, and the topics either side of it. */
  async topic(slug: string) {
    const [topic] = await this.db
      .select({
        id: learnTopics.id,
        slug: learnTopics.slug,
        classLevel: learnTopics.classLevel,
        position: learnTopics.position,
        title: learnTopics.title,
        summary: learnTopics.summary,
        minutes: learnTopics.minutes,
        lesson: learnTopics.lesson,
        updatedAt: learnTopics.updatedAt,
        subject: { slug: learnSubjects.slug, name: learnSubjects.name },
      })
      .from(learnTopics)
      .innerJoin(learnSubjects, eq(learnSubjects.slug, learnTopics.subjectSlug))
      .where(eq(learnTopics.slug, slug));
    if (!topic) throw new NotFoundException('There is no such lesson');

    const [questions, siblings] = await Promise.all([
      this.db
        .select({
          prompt: learnQuestions.prompt,
          options: learnQuestions.options,
          answer: learnQuestions.answer,
          explanation: learnQuestions.explanation,
        })
        .from(learnQuestions)
        .where(eq(learnQuestions.topicId, topic.id))
        .orderBy(asc(learnQuestions.position)),
      this.db
        .select({ slug: learnTopics.slug, title: learnTopics.title })
        .from(learnTopics)
        .where(
          and(
            eq(learnTopics.classLevel, topic.classLevel),
            eq(learnTopics.subjectSlug, topic.subject.slug),
          ),
        )
        .orderBy(asc(learnTopics.position)),
    ]);
    const at = siblings.findIndex((s) => s.slug === topic.slug);
    const { id: _, classLevel, position: __, ...rest } = topic;
    return {
      ...rest,
      class: findClass(classLevel),
      // Practice, not an exam: answers ship with the questions so they work offline later.
      questions,
      previous: siblings[at - 1] ?? null,
      next: siblings[at + 1] ?? null,
    };
  }
}

function findClass(slug: string) {
  const level = CLASSES.find((c) => c.slug === slug);
  if (!level) throw new NotFoundException('There is no such class');
  return level;
}
