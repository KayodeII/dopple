# Dopple

Multi-tenant school management platform: live classes, whiteboard, lesson library, exams, ID cards, bus tracking, events, attendance, grades and fee payments, each school on its own address.

- New here (person or agent)? Read [`AGENTS.md`](AGENTS.md), then [`docs/context/CONTEXT.md`](docs/context/CONTEXT.md).
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Decisions: [`docs/decisions`](docs/decisions)

## Quick start

```bash
corepack enable
pnpm install
pnpm infra:up
cp apps/api/.env.example apps/api/.env
pnpm db:migrate && pnpm db:seed
pnpm dev
curl -H "Host: greenfield.dopple.localhost" localhost:3000/students
```
