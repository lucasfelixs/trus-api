# CLAUDE.md — Trus API

Agent instructions for working on this codebase. Read this before touching any file.

---

## Project Overview

**Trus** is a map-based travel itinerary app. Users browse a map, discover establishments (restaurants, bars, tourist spots via Google Places API), and build day-by-day itineraries that can be shared publicly via a unique token.

**Domain model:** `DOMAIN.md` is the source of truth for all entities, relationships, and architectural decisions. Consult it before implementing any feature that touches data modeling.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | NestJS | Modules, DI, decorators — standard NestJS patterns |
| Language | TypeScript | Strict mode — see tsconfig requirements below |
| ORM | Prisma | Schema-first, migrations via `prisma migrate` |
| Database | PostgreSQL (Supabase) | Serverless Postgres. PostGIS for spatial queries |
| Auth | Passport.js + JWT | Google OAuth 2.0 + access/refresh token pattern |
| Storage | AWS S3 | Presigned URLs — client uploads directly, backend stores key |
| Email | To be defined | D-3 trip notifications |
| Deploy | Railway (API) + Supabase (DB) + Cloudflare (DNS/domain) | |
| Docs | Swagger (OpenAPI) | Auto-generated via `@nestjs/swagger` decorators |

---

## TypeScript Requirements

`strict: true` is non-negotiable. The tsconfig must include:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

**Rules:**
- No `any`. Use `unknown` and narrow, or define a proper type.
- All functions must have explicit return types.
- DTOs use `readonly` properties.
- `!` (non-null assertion) only when nullability is structurally impossible — never to silence a compiler error.

---

## Project Structure

```
src/
  common/
    decorators/
    exceptions/
    filters/
    guards/
    interceptors/
    pipes/
  config/
    env.validation.ts     ← class-validator schema for env vars
  prisma/
    prisma.module.ts
    prisma.service.ts
  {module}/               ← one folder per domain module
    dto/
      create-{entity}.dto.ts
      update-{entity}.dto.ts
      {entity}-response.dto.ts
    {entity}.controller.ts
    {entity}.service.ts
    {entity}.repository.ts
    {entity}.module.ts
```

---

## Architecture Rules

### Layer responsibilities — never leak between layers

| Layer | Owns | Never contains |
|-------|------|----------------|
| Controller | HTTP contract: validate DTO, call service, return response | Business logic, DB queries, `req`/`res` objects |
| Service | Business logic, orchestration, authorization checks | SQL queries, `@nestjs/common` HTTP decorators |
| Repository | Prisma queries, entity mapping | Business rules, validation |

### NestJS primitives — when to use each

- **Pipe** — input transformation and validation (`ValidationPipe`, `ParseUUIDPipe`)
- **Guard** — authorization decision, returns `true/false`, never modifies request
- **Interceptor** — cross-cutting concerns: logging, response transformation, timeout
- **Filter** — exception handling, maps exceptions to HTTP responses
- **Middleware** — stateless HTTP processing before routing (e.g. request logging)

---

## Auth Pattern

**Google OAuth 2.0 → own JWT (access + refresh)**

Never use Google tokens as API auth. Flow:
1. Google authenticates the user → callback with profile
2. Upsert user in DB (`googleId` as lookup key)
3. Issue own `access_token` (15min–1h) and `refresh_token` (7–30 days)
4. Store refresh token as hash in DB with `jti` for revocation

**Token storage:** HttpOnly cookies only. Never localStorage.

**JWT payload:**
```typescript
{
  sub: string    // user UUID — never email
  iat: number
  exp: number
  jti: string    // for refresh token revocation
}
```

**Authorization rule:** ownership of `Itinerary` is resolved through `Itinerary → Trip → userId`. The service layer must verify this join — never trust a `userId` passed in the request body.

---

## DTO Conventions

```typescript
// Always typed, always readonly, always validated
export class CreateItineraryDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string

  @IsString()
  @IsOptional()
  readonly description?: string
}

// Always use plainToInstance for response mapping — never return Prisma entity directly
async findById(id: string): Promise<ItineraryResponseDto> {
  const entity = await this.repository.findById(id)
  return plainToInstance(ItineraryResponseDto, entity)
}
```

---

## Prisma Conventions

- Table names: `snake_case` via `@@map()` — model names remain `PascalCase`
- All PKs: `uuid` (`@default(uuid())`)
- All FKs with expected query volume: explicit `@@index`
- Migrations: `prisma migrate dev` only in local/CI. `prisma migrate deploy` in production.
- Never edit a migration file after it has been applied — create a new one.

**N+1 prevention:** always use `include` or `select` for related data. Never query inside a loop.

**Transactions:** use `prisma.$transaction()` whenever multiple writes must be atomic.

---

## Google Places API

Establishment data (photos, ratings, reviews) comes from Google Places API — the backend does not store or replicate this data.

What the backend **does** store per `ItineraryStop`:
- `googlePlaceId` — external reference key
- `name` — cached for display (avoids API call)
- `location` — `Geography(Point)` cached for PostGIS queries

The frontend handles all direct Google Places API calls for search and display. The backend only receives `googlePlaceId` when a user adds a stop to an itinerary.

---

## Error Handling

Always throw typed exception classes, never strings:

```typescript
// src/common/exceptions/itinerary-not-found.exception.ts
export class ItineraryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Itinerary ${id} not found`)
    this.name = 'ItineraryNotFoundException'
  }
}
```

---

## Logging

Use NestJS `Logger` with structured context — never `console.log`:

```typescript
private readonly logger = new Logger(ItineraryService.name)

this.logger.log({ msg: 'Itinerary created', userId, itineraryId })
this.logger.error({ msg: 'Failed to create itinerary', error: err.message })
```

---

## Environment Variables

All env vars must be validated at startup via `class-validator`:

```typescript
// src/config/env.validation.ts
export class EnvironmentVariables {
  @IsUrl()
  DATABASE_URL: string

  @IsString()
  JWT_SECRET: string

  @IsInt()
  JWT_ACCESS_EXPIRES_IN_SECONDS: number

  @IsInt()
  JWT_REFRESH_EXPIRES_IN_SECONDS: number

  @IsString()
  GOOGLE_CLIENT_ID: string

  @IsString()
  GOOGLE_CLIENT_SECRET: string
}
```

---

## Testing Requirements

Every feature must ship with tests. No exceptions.

**Pyramid:**
- **Unit (70%)** — service layer with mocked repository. Tests business logic in isolation.
- **Integration (25%)** — controller + service + real test DB. Tests the full request flow.
- **E2E (5%)** — critical paths only (auth flow, share link access).

**Test DB:** use a separate database via `TEST_DATABASE_URL`. Reset state between tests with `TRUNCATE ... RESTART IDENTITY CASCADE`, not `DELETE`.

**Pattern for service unit tests:**
```typescript
describe('ItineraryService', () => {
  let service: ItineraryService
  let repo: jest.Mocked<ItineraryRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ItineraryService,
        { provide: ItineraryRepository, useValue: { findById: jest.fn(), create: jest.fn() } },
      ],
    }).compile()

    service = module.get(ItineraryService)
    repo = module.get(ItineraryRepository)
  })
})
```

---

## Swagger

Every endpoint must be documented. Minimum required decorators per endpoint:

```typescript
@ApiOperation({ summary: 'Get itinerary by id' })
@ApiParam({ name: 'id', type: String })
@ApiResponse({ status: 200, type: ItineraryResponseDto })
@ApiResponse({ status: 404, description: 'Itinerary not found' })
```

---

## Git Conventions

- **Commits:** semantic commits in English — `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
- **Scope optional:** `feat(auth): add refresh token rotation`
- Never commit directly to `main` — use feature branches

---

## What NOT to do

- Do not use `any` — not even temporarily
- Do not return Prisma entities directly from controllers — always map to a response DTO
- Do not put business logic in controllers or repositories
- Do not skip tests when implementing a feature
- Do not use `prisma migrate dev` in production
- Do not store tokens in localStorage (frontend concern, but worth flagging)
- Do not add Swagger decorators with wrong types — they are the API contract
- Do not use `console.log` — use `Logger`
- Do not add fields to the domain model without updating `DOMAIN.md`
