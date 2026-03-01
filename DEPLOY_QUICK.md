# Quick: Get Keys & Deploy

## 1. Generate JWT_SECRET (any machine)

**Node (one-liner):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output → use as `JWT_SECRET` in backend env.

**PowerShell (no Node):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```
Use that string as `JWT_SECRET`.

---

## 2. Get GEMINI_API_KEY

1. Open **https://aistudio.google.com/apikey**
2. Sign in with Google
3. Click **Create API key** → copy the key
4. Set in backend env: `GEMINI_API_KEY=<paste>`

*(AI follow-ups won’t work without it; rest of app works.)*

---

## 3. Database (MongoDB)

- **MongoDB Atlas (free):** https://www.mongodb.com/cloud/atlas → Create free cluster → Connect → get connection string.
- Set: `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/coachassist?retryWrites=true&w=majority`

---

## 4. Redis (optional)

- App runs without Redis (caching/rate-limit disabled).
- For production: **Upstash** (https://upstash.com) free tier → get Redis URL → `REDIS_URL=...`

---

## 5. Env summary

| Where   | Variable              | How to get |
|--------|------------------------|------------|
| Backend | `JWT_SECRET`         | Generate (step 1) |
| Backend | `GEMINI_API_KEY`     | Google AI Studio (step 2) |
| Backend | `MONGODB_URI`        | MongoDB Atlas (step 3) |
| Backend | `REDIS_URL`          | Optional; Upstash or leave empty |
| Backend | `PORT`               | Often set by host (e.g. 5000) |
| Frontend | `NEXT_PUBLIC_API_URL` | Your deployed backend URL (e.g. `https://api.yourapp.com`) |

---

## 6. Deploy order

1. **Backend first** (Railway, Render, Fly.io, etc.):
   - Set env vars above.
   - Deploy backend → note the URL (e.g. `https://your-backend.up.railway.app`).

2. **Frontend** (Vercel recommended):
   - Set `NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app` (no trailing slash).
   - Deploy. Done.

---

## 7. CORS

Backend allows `FRONTEND_ORIGIN`; set it to your frontend URL (e.g. `https://yourapp.vercel.app`) so cookies/auth work from the deployed site.
