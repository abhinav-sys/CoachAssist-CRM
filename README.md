# CoachAssist CRM

A mini CRM for wellness coaches: manage leads, view activity timelines, and generate AI follow-ups via Google Gemini.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB with Mongoose
- **Caching / queue:** Redis (ioredis)
- **AI:** Google Gemini API (server-side only)
- **Auth:** JWT (Bearer token)

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or remote)

### 1. Clone and install

```bash
cd CoachAssist_CRM

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure environment

**Backend** — copy `backend/.env.example` to `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/coachassist
JWT_SECRET=your_jwt_secret_change_in_production
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key
```

**Frontend** — copy `frontend/.env.local.example` to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run MongoDB and Redis

- Start MongoDB (e.g. `mongod` or use MongoDB Atlas connection string in `MONGODB_URI`).
- Start Redis (e.g. `redis-server` or use a Redis URL in `REDIS_URL`).

If Redis is not set, dashboard caching and AI rate limiting are skipped (app still runs).

### 4. Start both servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

- Backend: http://localhost:5000  
- Frontend: http://localhost:3000  

Register or log in, then use Dashboard and Leads.

---

## MongoDB Indexes

Indexes are defined in the Mongoose schemas and created on first use.

### Lead collection

| Index | Fields | Justification |
|-------|--------|----------------|
| Status | `{ status: 1 }` | Fast filter for funnel views and list filters (`?status=NEW`). |
| Assigned | `{ assignedTo: 1 }` | Filter leads by assigned coach; dashboard scoped by user. |
| Next follow-up | `{ nextFollowUpAt: 1 }` | Overdue follow-up count and sorting by next action. |
| Text search | `{ name: 'text', phone: 'text' }` | Full-text search on name/phone (optional; list search uses regex if no text index). |

### Activity collection

| Index | Fields | Justification |
|-------|--------|----------------|
| Timeline | `{ leadId: 1, createdAt: -1 }` | Cursor-based timeline: newest first per lead; efficient `$lt` cursor pagination. |

---

## Caching Strategy

- **What:** Dashboard response for the current user and date.
- **Key:** `dashboard:{userId}:{YYYY-MM-DD}` (e.g. `dashboard:507f1f77bcf86cd799439011:2025-02-28`).
- **TTL:** 120 seconds.
- **Flow:** On `GET /dashboard`, check Redis for the key. On hit, return cached JSON. On miss, run the aggregation pipeline, store result in Redis with TTL, then return it.
- **Why:** Reduces repeated heavy aggregations when the same user refreshes the dashboard within a short window.

---

## Rate Limiting (AI Follow-up)

- **Scope:** Per authenticated user.
- **Key:** `ai_rate:{userId}`.
- **Limit:** 5 requests per hour.
- **Mechanism:** Redis `INCR` on each `POST /leads/:id/ai-followup`. On first request in the window, set `EXPIRE key 3600`. If count &gt; 5, respond with **429** and `{ "error": "Rate limit exceeded", "retryAfter": <seconds> }`.
- **Why:** Protects Gemini usage and avoids abuse.

---

## API Reference & Example Requests

Base URL: `http://localhost:5000`  
Protected routes require: `Authorization: Bearer <token>` (from login/register).

### Health (no auth)

```bash
curl -s http://localhost:5000/health
# {"ok":true}
```

### Auth

**Register**

```bash
curl -s -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"coach@example.com","password":"secret123","name":"Jane Coach"}'
# {"user":{"id":"...","email":"coach@example.com","name":"Jane Coach"},"token":"eyJ..."}
```

**Login**

```bash
curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"coach@example.com","password":"secret123"}'
# {"user":{"id":"...","email":"coach@example.com","name":"Jane Coach"},"token":"eyJ..."}
```

Save the `token` and use it below as `$TOKEN`.

### Leads (all require auth)

**List leads** (optional: `status`, `tags`, `search`, `page`)

```bash
curl -s "http://localhost:5000/leads?status=NEW&page=1" \
  -H "Authorization: Bearer $TOKEN"
# {"leads":[...],"total":10,"page":1,"limit":20}
```

**Create lead**

```bash
curl -s -X POST http://localhost:5000/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"+1234567890","source":"Instagram","tags":["vip"]}'
# 201 + lead object
```

**Get lead by ID**

```bash
curl -s http://localhost:5000/leads/LEAD_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Update lead**

```bash
curl -s -X PATCH http://localhost:5000/leads/LEAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"CONTACTED","nextFollowUpAt":"2025-03-01T10:00:00.000Z"}'
```

**Delete lead**

```bash
curl -s -X DELETE http://localhost:5000/leads/LEAD_ID \
  -H "Authorization: Bearer $TOKEN"
# 204 No Content
```

**Get timeline** (cursor-based; optional: `cursor`, `limit`)

```bash
curl -s "http://localhost:5000/leads/LEAD_ID/timeline?limit=10" \
  -H "Authorization: Bearer $TOKEN"
# {"activities":[...],"nextCursor":"2025-02-27T12:00:00.000Z" or null}

# Next page
curl -s "http://localhost:5000/leads/LEAD_ID/timeline?cursor=2025-02-27T12:00:00.000Z&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Generate AI follow-up** (rate-limited: 5/hour per user)

```bash
curl -s -X POST http://localhost:5000/leads/LEAD_ID/ai-followup \
  -H "Authorization: Bearer $TOKEN"
# 200: {"whatsappMessage":"...","callScript":["...","...","..."],"objectionHandling":"..."}
# 429: {"error":"Rate limit exceeded","retryAfter":3600}
```

### Dashboard (auth required)

```bash
curl -s http://localhost:5000/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

Response shape:

```json
{
  "funnelCounts": { "NEW": 5, "CONTACTED": 3, "INTERESTED": 2, "CONVERTED": 1, "LOST": 0 },
  "conversionRate": 0.09,
  "overdueFollowUps": 4,
  "topSources": [{ "source": "Instagram", "count": 12 }, ...],
  "activityGraph": [{ "date": "2025-02-22", "count": 7 }, ...]
}
```

---

## Project structure

```
CoachAssist_CRM/
├── backend/
│   ├── src/
│   │   ├── models/       # User, Lead, Activity
│   │   ├── routes/       # auth, leads, dashboard
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/   # JWT auth
│   │   └── utils/       # db, redis
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── app/              # App Router: (auth), (app), dashboard, leads
│   ├── lib/              # api client, auth helpers
│   ├── .env.local.example
│   └── package.json
└── README.md
```

---

## License

MIT.
