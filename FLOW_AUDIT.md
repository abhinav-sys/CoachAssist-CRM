# CoachAssist CRM — Flow audit (coach-style)

Checked each flow in code and deployment assumptions. **Assumption:** frontend can reach the backend (NEXT_PUBLIC_API_URL set on Vercel, FRONTEND_ORIGIN set on Render). If you still see "Cannot reach the server", fix that first (see VERCEL_RENDER_CHECKLIST.md).

---

## 1. Register → Login → redirects properly?

| Step | Status | Notes |
|------|--------|--------|
| **Register** | ✅ | POST `/auth/register` → `setToken(data.token)` → `router.replace('/dashboard')`. |
| **Login** | ✅ | POST `/auth/login` → same flow → `/dashboard`. |
| **Root /** | ✅ | `app/page.tsx`: `isAuthenticated()` → `/dashboard` else `/login`. |
| **Auth layout** | — | Auth pages (login/register) don’t redirect if already logged in; user can open /login manually. Optional improvement: redirect to /dashboard if token exists. |

**Verdict:** Redirects are correct. If the API is unreachable, register/login will show the connection error toast.

---

## 2. Add a lead → shows in list?

| Step | Status | Notes |
|------|--------|--------|
| **Submit** | ✅ | POST `/leads` with name, phone, source, tags. Backend creates lead and logs `STATUS_CHANGE` (null → NEW). |
| **List refresh** | ✅ | On success: `fetchLeads(1, false)` so the list refetches and the new lead appears. |
| **Backend** | ✅ | `leadService.createLead` assigns `assignedTo: userId` from auth. |

**Verdict:** Add lead works; new lead shows in list after add.

---

## 3. Change lead status → does it log in the timeline?

| Step | Status | Notes |
|------|--------|--------|
| **Save** | ✅ | PATCH `/leads/:id` with `edit` (includes status). |
| **Backend** | ✅ | `leadService.updateLead`: if `data.status !== previousStatus`, calls `logActivity(leadId, 'STATUS_CHANGE', { previousStatus, newStatus })`. |
| **Timeline** | ✅ | Activity appears in timeline; type `STATUS_CHANGE` is rendered as "previousStatus → newStatus". |
| **Refresh** | ✅ | After save: `fetchLead()` and `fetchTimeline()` so timeline updates. |

**Verdict:** Status change is logged in the timeline correctly.

---

## 4. Filter leads by status, search by name → works?

| Step | Status | Notes |
|------|--------|--------|
| **Status filter** | ✅ | `params.set('status', status)` → GET `/leads?status=...`. Backend `filter.status = status`. |
| **Tags** | ✅ | `params.set('tags', tagsInput.trim())` → backend splits by comma, `filter.tags = { $in: tagList }`. |
| **Search** | ✅ | `params.set('search', debouncedSearch.trim())` → backend `filter.$or = [ name: regex, phone: regex ]` (case-insensitive). |
| **Debounce** | ✅ | Search debounced 300ms to avoid excessive requests. |

**Verdict:** Filter and search are implemented and wired correctly.

---

## 5. Click "Generate Follow-up" → WhatsApp message + call script?

| Step | Status | Notes |
|------|--------|--------|
| **Button** | ✅ | "Generate follow-up" calls POST `/leads/:id/ai-followup`. |
| **Backend** | ✅ | Uses Gemini; returns `{ whatsappMessage, callScript, objectionHandling }`; saves to `lead.aiFollowup` and logs `AI_MESSAGE_GENERATED`. |
| **UI** | ✅ | `aiResult` shows WhatsApp message, call script list, and objection handling (if not "N/A"). |
| **Rate limit** | ✅ | 429 with `retryAfter`; frontend shows toast. |
| **Dependency** | ⚠️ | **Requires `GEMINI_API_KEY`** on Render. If missing, backend returns 503 and frontend shows generic error. |

**Verdict:** Flow works when Gemini is configured. If "Generate follow-up" fails with a server error, set `GEMINI_API_KEY` in Render environment.

---

## 6. Dashboard loads with real numbers?

| Step | Status | Notes |
|------|--------|--------|
| **Data** | ✅ | GET `/dashboard` → `funnelCounts`, `conversionRate`, `overdueFollowUps`, `topSources`, `activityGraph` (date + count). |
| **Funnel** | ✅ | Counts per status; conversion = CONVERTED / total. |
| **Charts** | ✅ | BarChart for top sources, LineChart for activity (last 7 days). Empty arrays handled. |
| **Caching** | ✅ | Backend uses Redis if `REDIS_URL` set; else no cache. No crash if Redis missing. |

**Verdict:** Dashboard uses real backend data. Numbers and charts are correct.

---

## 7. Click "Load more" on timeline → loads next batch?

| Step | Status | Notes |
|------|--------|--------|
| **Cursor** | ✅ | First load: GET `/leads/:id/timeline?limit=10`. Next: `?cursor=<lastCreatedAt>&limit=10`. |
| **Backend** | ✅ | `timelineService.getTimeline`: `createdAt < cursor`, limit+1 to detect hasMore, `nextCursor` = last item’s `createdAt`. |
| **UI** | ✅ | "Load more" only shown when `nextCursor` is set; click calls `fetchTimeline(nextCursor)` and appends to `activities`. |
| **Loading state** | ✅ | `timelineLoading` disables button and shows "Loading...". |

**Verdict:** Timeline "Load more" works and loads the next batch.

---

## Summary: broken or missing

1. **Connection (if still happening)**  
   "Cannot reach the server" → set `NEXT_PUBLIC_API_URL` on Vercel and `FRONTEND_ORIGIN` on Render, then **redeploy** frontend. See VERCEL_RENDER_CHECKLIST.md.

2. **Generate follow-up 503**  
   Set `GEMINI_API_KEY` in Render (backend) environment so AI follow-up works.

3. **Optional**  
   - Auth pages (login/register): redirect to `/dashboard` if user already has a token.  
   - No other flows are broken or missing from the code review.

---

## Quick test checklist (manual)

Once the app can reach the API:

- [ ] Register → redirects to dashboard
- [ ] Logout (or new session) → Login → redirects to dashboard
- [ ] Add a lead → appears in Leads list
- [ ] Open lead → change status → Save → new "STATUS_CHANGE" in timeline
- [ ] Leads: filter by status, search by name
- [ ] Lead detail: Generate follow-up → WhatsApp + call script appear (needs GEMINI_API_KEY)
- [ ] Dashboard: conversion, overdue, funnel, charts show
- [ ] Lead timeline: "Load more" loads next activities
