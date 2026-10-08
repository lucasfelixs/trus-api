# Domain Model — Trus API

## Overview

Map-based travel itinerary app. Users browse a map, discover establishments (restaurants, bars, tourist spots), and build day-by-day itineraries. Establishment data (photos, ratings, reviews) comes from Google Places API — the backend stores only a `place_id` reference plus user-generated metadata.

---

## Entity Hierarchy

```
User
 └── Trip (1:N)
      └── Itinerary (1:N)
           └── ItineraryDay (1:N)
                └── ItineraryStop (1:N)
```

---

## Entities

### User
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| email | string | unique |
| name | string | |
| avatarUrl | string? | from Google OAuth |
| googleId | string | unique — used for OAuth upsert |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### Trip
Represents a travel experience. Holds the dates and top-level metadata.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| userId | string | FK → User |
| title | string | e.g. "Lisbon 2026" |
| destination | string | required — human-readable name for search/filter and for the trip card in the frontend |
| startDate | Date | used for D-3 email notifications |
| endDate | Date | |
| coverImageUrl | string? | S3 — phase 2 |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### Itinerary
A specific travel plan within a trip. A trip can have multiple itineraries (e.g. "Main plan", "Museum-focused alternative").

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tripId | string | FK → Trip |
| title | string | e.g. "Main plan" |
| description | string? | |
| shareToken | string | unique — generated on create, active when publishedAt is set |
| publishedAt | DateTime? | null = private; set = public via share link |
| createdAt | DateTime | |
| updatedAt | DateTime | |

> `shareToken` is generated on create (not on publish) to avoid a migration later. It only becomes active when `publishedAt` is set.

> `userId` is intentionally absent — ownership is resolved through `Itinerary → Trip → userId`. The service layer handles authorization via this join.

---

### ItineraryDay
One day within an itinerary.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| itineraryId | string | FK → Itinerary |
| date | Date | real calendar date (not a day number) |
| title | string? | e.g. "Day in Rome" |
| createdAt | DateTime | |
| updatedAt | DateTime | |

> Using `date` instead of `dayNumber` enables the D-3 notification job to query by `Trip.startDate` without extra calculation.

---

### ItineraryStop
A place within a day. References Google Places for establishment data.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| itineraryDayId | string | FK → ItineraryDay |
| googlePlaceId | string | external reference — Google Places API |
| name | string | cached from Google (avoids API call for display) |
| location | Geography(Point) | lat/lng — cached for PostGIS proximity queries |
| order | int | position within the day |
| note | string? | user's personal note about this stop |
| scheduledTime | Time? | planned visit time |
| createdAt | DateTime | |
| updatedAt | DateTime | |

> `name` and `location` are cached locally even though they come from Google. Required for PostGIS queries (e.g. "show all stops within 2km") — these cannot be run against the Google API.

---

### Review
A logged-in user's rating and comment on an itinerary.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| itineraryId | string | FK → Itinerary |
| userId | string | FK → User (reviewer) |
| rating | int | 1–5 |
| comment | string? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraints:**
- `UNIQUE(itineraryId, userId)` — one review per user per itinerary
- Business rule (service layer): a user cannot review their own itinerary

> Reviews here are for itineraries (travel plans), not for establishments. Establishment reviews come from Google Places API.

---

### SavedItinerary
Tracks which users have saved an itinerary. Used for D-3 notifications and social discovery.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| userId | string | FK → User |
| itineraryId | string | FK → Itinerary |
| createdAt | DateTime | |

**Constraints:**
- `UNIQUE(userId, itineraryId)`

---

## External Data — Google Places API

Establishment data (photos, ratings, reviews, opening hours) is served directly from Google Places API. The backend stores only:

- `googlePlaceId` — to fetch fresh data when needed
- `name` — cached for display without an API call
- `location` — cached for PostGIS spatial queries

**Pricing (as of 2026):** Pro SKUs = 5,000 free calls/month. Both Maps JavaScript API and Places API are required and managed under the same Google Maps Platform account.

---

## D-3 Email Notification

Fires 3 days before `Trip.startDate`. Notifies:
1. The trip creator (`Trip.userId`)
2. Users who saved any itinerary of that trip (`SavedItinerary.userId` where `Itinerary.tripId = trip.id`)

---

## MVP Scope

| Feature | In MVP |
|---------|--------|
| Google OAuth + JWT auth | Yes |
| Trip + Itinerary CRUD | Yes |
| ItineraryDay + ItineraryStop CRUD | Yes |
| Public share link via token | Yes |
| Swagger documentation | Yes |
| SavedItinerary | Yes |
| Review + weighted average | Yes |
| S3 image upload | No — phase 2 |
| PostGIS proximity search | No — phase 2 |
| D-3 email notification | No — phase 2 |
| Deploy (Railway + Neon) | Yes |

---

## Open Decisions

- **Access control for public itineraries:** how users discover and access other users' itineraries within the app (beyond the share link) is not yet defined.
