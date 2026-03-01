# Fix "Cannot reach the server" (Vercel + Render)

Do these in order. After each change, **redeploy** that side.

---

## 1. Vercel (frontend) — set API URL

- Go to [vercel.com](https://vercel.com) → your **frontend** project → **Settings** → **Environment Variables**.
- Add or edit:
  - **Key:** `NEXT_PUBLIC_API_URL`
  - **Value:** `https://coachassist-crm-csbz.onrender.com`  
  (no trailing slash, no space)
- Apply to **Production** (and Preview if you use it).
- **Redeploy:** **Deployments** → ⋮ on latest → **Redeploy**.  
  (Required: `NEXT_PUBLIC_*` is set at **build** time.)

---

## 2. Render (backend) — allow your Vercel URL (CORS)

- Go to [dashboard.render.com](https://dashboard.render.com) → your **backend** service → **Environment**.
- Add or edit:
  - **Key:** `FRONTEND_ORIGIN`
  - **Value:** your **exact** Vercel app URL, e.g. `https://coachassist-crm.vercel.app`  
  (Copy from the address bar when you open your app, or from Vercel → Deployments → visit URL.)
- **Save**. Render will redeploy the backend.

---

## 3. Check in the browser

- Open your **Vercel** app URL (not the Render URL).
- Open DevTools (F12) → **Network**.
- Try to log in or load the dashboard.
- Click the request to `coachassist-crm-csbz.onrender.com`:
  - **Status 200** → backend is reachable; if the app still fails, check the response body.
  - **CORS error** or **blocked** → `FRONTEND_ORIGIN` on Render is wrong or missing; fix it and redeploy.
  - **Failed / no request** → `NEXT_PUBLIC_API_URL` on Vercel is wrong or not applied; set it and **redeploy** the frontend.

---

## 4. Render free tier (optional)

If the backend spins down after 15 min of no traffic, the first request can take 30–60 seconds. The app now waits up to 25 seconds and then shows a “waking up” message. Wait a bit and try again.
