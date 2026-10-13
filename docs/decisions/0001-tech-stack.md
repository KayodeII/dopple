# 0001 — Tech stack

- Status: accepted
- Date: 2026-10-11

## Context

Dopple is mostly CRUD-heavy school business logic (classes, timetables, grades, fees, per-school roles), with a smaller real-time part (whiteboard, chat, presence, video). The 8 a.m. load spike is bound by database connections, WebSocket fan-out and video bandwidth, not CPU. The team hires mainly in Lagos.

## Decision

| Area | Choice | Why |
| --- | --- | --- |
| Core API | TypeScript, NestJS (modular monolith) | Fastest to build business logic; easy to hire for |
| Real-time gateway | Go | Cheap long-lived connections; LiveKit is also Go |
| Rust | Only for a proven hot path later | Doesn't solve the actual bottlenecks |
| Database | Postgres | Relational data, row-level security for tenancy, ACID for money, JSONB for flexible fields |
| ORM | Drizzle | SQL-shaped, typed, supports RLS policies in the schema |
| Cache | Redis | Sessions, cache, rate limits, presence |
| Messaging | NATS JetStream now; Kafka/Redpanda in phase 2 | Kafka is an event log, not a cache; add it for CDC and analytics |
| Video | LiveKit | SFU with simulcast and recording |
| Web | React | One school web app for staff, students and parents (see 0007) |
| Desktop | None for now | Superseded by 0007: staff use the web app |

## Consequences

- Two languages in the backend (TypeScript, Go); shared contracts must be explicit (OpenAPI / JSON schemas).
- Postgres row-level security is mandatory for every tenant table (see 0002).
