# Last Steps — Python Speedrun

## 1. Create Accounts & Get API Keys

### Clerk (Auth)
- Go to https://dashboard.clerk.com — create a new application
- Enable Google and/or GitHub sign-in providers
- Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- In Clerk dashboard, set the redirect URLs:
  - After sign-in: `/learn`
  - After sign-up: `/learn`

### Turso (Database)
- Install CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
- `turso auth signup` (or login)
- `turso db create python-speedrun`
- `turso db show python-speedrun --url` → copy as `TURSO_DATABASE_URL`
- `turso db tokens create python-speedrun` → copy as `TURSO_AUTH_TOKEN`
- Seed the database: `TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> npm run db:seed`

### Google Gemini (AI)
- Go to https://aistudio.google.com/apikey
- Create an API key → copy as `GEMINI_API_KEY`
- Free tier: 15 requests/min, 1M tokens/day

### Zep Cloud (Knowledge Base)
- Go to https://app.getzep.com — sign up or log in
- Copy your API key → `ZEP_API_KEY`
- Find your session/thread ID with your curated articles → `ZEP_SESSION_ID`
- This is optional — the app works without it, Zep features just return empty

## 2. Set Environment Variables

Fill in `.env.local` for local dev:
```
GEMINI_API_KEY=your_key
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token
ZEP_API_KEY=your_key
ZEP_SESSION_ID=your_session_id
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## 3. Test Locally

```bash
npm run db:seed    # create tables (use local.db if no Turso creds)
npm run dev        # start dev server at localhost:3000
npm test           # run test suite (632 tests)
```

Walk through the full flow:
- Landing page → sign in → assessment chat → course plan review → start learning
- Test the code editor (Pyodide takes 3-5s to load on first visit)
- Complete at least one topic end-to-end

## 4. Deploy to Vercel

```bash
# Option A: Vercel CLI
npm i -g vercel
vercel          # follow prompts, link to project
vercel --prod   # deploy to production

# Option B: GitHub + Vercel Dashboard
# Push to GitHub, then import the repo at https://vercel.com/new
```

In the Vercel dashboard:
- Go to Settings → Environment Variables
- Add all 7 env vars from `.env.local`
- Redeploy after adding them

## 5. Post-Deploy Checks

- [ ] Landing page loads, sign-in works
- [ ] Assessment chat starts after sign-in
- [ ] Course plan generates after assessment
- [ ] Chat streaming works (no timeouts)
- [ ] Code editor loads Pyodide and runs Python
- [ ] Progress saves between sessions (sign out, sign back in)
- [ ] Zep resources show up in ResourcePanel (if configured)

## 6. Optional Polish

These aren't blockers but would improve the experience:

- **Custom domain**: Add one in Vercel dashboard → Settings → Domains
- **Rate limiting**: Add Upstash Redis or simple in-memory rate limiting on /api/chat to stay within Gemini's 15 RPM
- **Error pages**: Custom 404 and error.tsx for better UX
- **Mobile layout**: The split chat+editor view needs responsive breakpoints for mobile
- **Analytics**: Vercel Analytics is free and one-click to enable
- **Seed Zep**: Add Python articles/resources to your Zep session to enrich the AI instructor's knowledge
