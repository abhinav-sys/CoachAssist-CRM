# Environment setup (fix "Cannot reach the server")

The frontend needs `NEXT_PUBLIC_API_URL` pointing at your backend.

## Local development

1. **Start the backend** (in another terminal):
   ```bash
   cd backend
   npm install
   # Create backend/.env with MONGO_URI, JWT_SECRET, etc.
   npm run dev
   ```
   Backend runs at `http://localhost:5000` by default.

2. **Frontend env** – create `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
   If your backend runs on another port, use that URL (no trailing slash).

3. Restart the Next dev server after changing env:
   ```bash
   cd frontend && npm run dev
   ```

## Vercel (deployed frontend)

1. **Deploy the backend** somewhere public (e.g. Render, Railway, or a separate Vercel serverless API) and note the URL, e.g. `https://your-api.onrender.com`.

2. **Set the env in Vercel (frontend project):**
   - Vercel Dashboard → your **frontend** project → **Settings** → **Environment Variables**
   - Add: **Name** `NEXT_PUBLIC_API_URL`, **Value** `https://your-backend-url.com` (your real backend URL, no trailing slash)
   - Apply to **Production** (and Preview if you want).

3. **Redeploy** the frontend (Deployments → ⋮ on latest → Redeploy) so the new variable is used.  
   `NEXT_PUBLIC_*` is baked in at **build** time, so a new deploy is required.

4. **Backend CORS:** On the backend, set `FRONTEND_ORIGIN` (or equivalent) to your Vercel frontend URL, e.g. `https://your-app.vercel.app`, so the API allows requests from the deployed site.
