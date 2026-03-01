# Deploy CoachAssist CRM — Step by Step (fastest path)

**You must do yourself:** sign up at MongoDB Atlas, Google AI Studio, GitHub, Render, Vercel; create env vars and paste keys; click Deploy.  
**Automation can’t do:** log into those sites, create accounts, or deploy on your behalf.

Do these steps in order. Skip Redis for now (app works without it).

---

## PART A: Get keys (one-time)

### Step 1 — JWT secret (30 sec)
On your PC, in the project folder run:
```bash
node scripts/generate-jwt-secret.js
```
Copy the long string. You’ll paste it as `JWT_SECRET` in the backend.

### Step 2 — MongoDB (2 min)
1. Go to **https://www.mongodb.com/cloud/atlas** → Sign up / Log in.
2. **Build a Database** → **M0 FREE** → Create.
3. **Username and Password** → create a user, save the password.
4. **Where to connect** → **My Local Environment** → Add IP: **0.0.0.0** (allow from anywhere) → Finish.
5. **Connect** → **Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Replace `<password>` in that string with your real password. Add a DB name:  
   `...mongodb.net/coachassist?retryWrites=true&w=majority`  
   Save this as your **MONGODB_URI**.

### Step 3 — Gemini API key (1 min)
1. Go to **https://aistudio.google.com/apikey**
2. Sign in → **Create API key** → copy the key.  
   Save as **GEMINI_API_KEY**. (Without it, AI follow-ups won’t work; app still runs.)

---

## PART B: Deploy backend (Render — free)

### Step 4 — Push code
- Put your project on **GitHub** (create repo, push from your PC).

### Step 5 — Create backend on Render
1. Go to **https://render.com** → Sign up (GitHub).
2. **New +** → **Web Service**.
3. Connect your **GitHub repo** (CoachAssist_CRM).
4. Settings:
   - **Name:** coachassist-api (or any name).
   - **Root Directory:** `backend`
   - **Runtime:** Node.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment** → Add:
   - `JWT_SECRET` = (paste from Step 1)
   - `MONGODB_URI` = (paste from Step 2)
   - `GEMINI_API_KEY` = (paste from Step 3)
   - (Optional) `JWT_EXPIRES_IN` = `7d`
6. **Create Web Service**. Wait for deploy. Copy the service URL, e.g.  
   `https://coachassist-api.onrender.com`  
   This is your **BACKEND_URL**.

### Step 6 — Allow frontend (CORS)
- In the same Render service → **Environment** → add:
  - `FRONTEND_ORIGIN` = `https://your-frontend-url.vercel.app`  
  (You’ll set this again after Step 8 when you have the real Vercel URL.)

---

## PART C: Deploy frontend (Vercel — free)

### Step 7 — Import on Vercel
1. Go to **https://vercel.com** → Sign up (GitHub).
2. **Add New** → **Project** → Import your **same GitHub repo**.
3. **Root Directory:** click **Edit** → set to `frontend` → Save.

### Step 8 — Env and deploy
1. **Environment Variables** → add:
   - **Name:** `NEXT_PUBLIC_API_URL`  
   - **Value:** your **BACKEND_URL** from Step 5 (e.g. `https://coachassist-api.onrender.com`) — no trailing slash.
2. **Deploy**. Copy your frontend URL, e.g.  
   `https://coachassist-crm.vercel.app`  
   This is your **FRONTEND_URL**.

### Step 9 — Point backend to frontend
- Go back to **Render** → your backend service → **Environment**.
- Set **FRONTEND_ORIGIN** = your **FRONTEND_URL** (e.g. `https://coachassist-crm.vercel.app`).
- Save. Render will redeploy once.

---

## PART D: Test

1. Open **FRONTEND_URL** in the browser.
2. Click **Register** → create an account.
3. Log in → you should see the Dashboard.

Done.

---

## Quick checklist

| Step | What | Where |
|------|------|--------|
| 1 | Generate JWT secret | Run `node scripts/generate-jwt-secret.js` |
| 2 | Get MongoDB URI | MongoDB Atlas → connection string + `/coachassist` |
| 3 | Get Gemini key | aistudio.google.com/apikey |
| 4 | Push code | GitHub |
| 5 | Deploy backend | Render, root `backend`, add env vars |
| 6 | Note backend URL | Render dashboard |
| 7–8 | Deploy frontend | Vercel, root `frontend`, `NEXT_PUBLIC_API_URL` = backend URL |
| 9 | Set CORS | Render: `FRONTEND_ORIGIN` = Vercel URL |

---

## What you can skip for speed

- **Redis** — don’t set `REDIS_URL`; app runs without it (no dashboard cache / AI rate limit).
- **Custom domain** — use default `.onrender.com` and `.vercel.app` first.
