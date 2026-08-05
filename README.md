# Scalable URL Shortener + Analytics Platform

A production-style backend built with Node.js, Express, PostgreSQL, and Redis. Built as a portfolio/interview project to demonstrate backend fundamentals: caching strategy, rate limiting, auth, and database design — not just CRUD.

## Architecture

```
Client → Express → [Middleware: helmet, cors, rate-limit, auth]
                         │
              ┌──────────┴──────────┐
              │                     │
        Controllers            Redirect route
              │                     │
          Services  ──────►  Cache-aside (Redis)
              │                     │
        Repositories  ──────►  PostgreSQL
```

**Layers:**
- **Routes** — declare endpoints + middleware chain
- **Controllers** — parse request, call service, shape response
- **Services** — business logic (encoding, cache-aside orchestration, ownership checks)
- **Repositories** — raw SQL, the only layer that talks to Postgres
- **Cache** — Redis cache-aside helper, isolated from repositories so the service layer decides read/write order

## Key design decisions

**Base62 short codes derived from the row's auto-increment id**, not random strings. This avoids the write-time uniqueness check + retry-on-collision loop a random generator needs, at the cost of codes being sequential/guessable — an acceptable tradeoff for a shortener (not a security boundary).

**Cache-aside pattern for redirects**: check Redis → on miss, query Postgres → populate Redis → return. Writes/deletes explicitly invalidate the cache key so stale redirects are never served. If Redis is down, reads fall through to Postgres instead of failing — availability over caching.

**Sliding window rate limiting** via a Redis sorted set (ZADD/ZREMRANGEBYSCORE/ZCARD), which avoids the burst-at-boundary problem of fixed window counters. Falls open (allows the request) if Redis is unreachable.

**Click analytics writes are fire-and-forget** from the redirect handler — a user's redirect is never held up waiting on an analytics INSERT.

## Setup

```bash
cp .env.example .env
docker compose up --build
docker compose exec app npm run migrate
```

API is now live at `http://localhost:3000`.

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get access + refresh tokens |
| POST | `/api/auth/refresh` | — | Exchange refresh token for new access token |
| POST | `/api/urls` | ✅ | Create short URL |
| GET | `/api/urls` | ✅ | List your URLs (paginated) |
| DELETE | `/api/urls/:id` | ✅ | Soft-delete a URL |
| GET | `/:shortCode` | — | Redirect + record click |
| GET | `/api/analytics/:id` | ✅ | Click summary: total, daily, top referrers/devices |

## Tests

```bash
npm test
```

## What's intentionally out of scope

This covers the core that matters for interviews. Not included (by design, to keep this a project you can fully explain rather than a pile of generated boilerplate): Swagger docs, GeoIP lookup, Kafka, team workspaces, webhooks, CSV export. Each would be a reasonable "what would you add next" answer in an interview.
