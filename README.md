<img width="981" height="440" alt="Trus Travel Itinerary (2)" src="https://github.com/user-attachments/assets/25d8391c-5a7e-4d88-8bd2-839831e48b4d" />

# Trus API

Backend for **Trus**, a map-based travel itinerary app. Users browse a map, discover establishments (restaurants, bars, tourist spots via Google Places API), and build day-by-day itineraries that can be shared publicly via a unique link.

- **Live API:** [api.usetrus.com/api](https://api.usetrus.com/api) (Swagger) · [api.usetrus.com/health](https://api.usetrus.com/health)
- **Domain model:** [DOMAIN.md](DOMAIN.md)
- **CI/CD:** ![CI/CD](https://github.com/lucasfelixs/trus-api/actions/workflows/ci-cd.yml/badge.svg)

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS (TypeScript, strict mode) |
| ORM | Prisma |
| Database | PostgreSQL (Supabase), PostGIS for spatial queries |
| Auth | Google OAuth 2.0 → own JWT (access + refresh, HttpOnly cookies) |
| Storage | AWS S3 (presigned URLs) |
| Deploy | Railway (API) + Supabase (DB) + Cloudflare (DNS) |
| Docs | Swagger / OpenAPI |

---

## Architecture

Layered: **Controller** (HTTP contract) → **Service** (business logic, authorization) → **Repository** (Prisma queries). Ownership of nested resources (e.g. an `Itinerary` belongs to a `Trip` which belongs to a `User`) is always resolved server-side through the chain — never trusted from the request body.

```
User
 └── Trip (1:N)
      └── Itinerary (1:N)
           └── ItineraryDay (1:N)
                └── ItineraryStop (1:N)
```

Full entity/relationship reference in [DOMAIN.md](DOMAIN.md).

---

## Running locally

**Requirements:** Node >= 24, Docker (for the local test database).

```bash
npm install
npm run db:test:up          # starts a local Postgres on :55432
npm run db:test:migrate     # applies migrations to it
npm run start:dev
```

### Environment variables

Copy the variables below into a `.env` file at the project root. All of them except `TEST_DATABASE_URL` (optional) and `NODE_ENV` (read directly, outside the validated schema) are required and validated at startup — the app refuses to boot if one is missing.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string (app runtime) |
| `DIRECT_URL` | Direct (non-pooled) connection, used by `prisma migrate` |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_EXPIRES_IN_SECONDS` | Access token signing |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN_SECONDS` | Refresh token signing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth 2.0 credentials |
| `FRONTEND_URL` | Used for CORS and the post-login redirect |
| `TEST_DATABASE_URL` | Local Postgres used by integration/E2E tests (optional for just running the app) |
| `NODE_ENV` | Set to `production` in production — enables `secure` cookies |

---

## Testing

Follows the standard pyramid — unit (service layer, mocked repositories), integration (controller + real local Postgres), and a thin layer of E2E covering the two critical paths: full auth flow and public share-link access.

```bash
npm test              # unit
npm run test:integration
npm run test:e2e
npm run test:cov      # unit tests with coverage
```

Integration and E2E tests run against the local Postgres started by `npm run db:test:up` and refuse to run against anything but `localhost`/`127.0.0.1`.

---

## License

[MIT](LICENSE)
