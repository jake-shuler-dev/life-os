# Life OS

Your personal life-management dashboard. The home screen is your signature; the
tabs across the top are the modules. **Finances** is fully built (cash-flow &
net-worth dashboard); the other tabs are placeholders ready to fill in.

Your data syncs across devices through **Supabase** (cloud database + login), and
each account's data is private to that account.

---

## What's inside

```
life-os/
├─ index.html
├─ package.json
├─ vite.config.js
├─ .env.example                  <- template for your Supabase keys
├─ supabase/
│  └─ schema.sql                 <- run once in Supabase to create your data table
├─ public/
│  └─ signature-white.png        <- your signature (white, transparent)
└─ src/
   ├─ main.jsx                   <- app entry
   ├─ App.jsx                    <- shell: login gate, HUD bar, tabs, signature home
   ├─ lib/
   │  ├─ supabase.js             <- Supabase client
   │  └─ storage.js              <- saves data to the cloud (browser fallback if unconfigured)
   ├─ components/
   │  └─ Login.jsx               <- email + password sign-in
   └─ pages/
      └─ FinanceDashboard.jsx    <- the finance dashboard, wired to the Finances tab
```

**Navigation:** click **LIFE OS** (top-left) for the signature home. **FINANCES**
opens the dashboard. Other tabs show their planned sub-pages.

> If you skip the Supabase step, the app still runs but saves data only in the
> current browser (no login, no cross-device sync). Add the keys to turn on cloud sync.

---

## Step 1 - Set up Supabase (one time, ~5 min)

1. Go to https://supabase.com, create a free account, click **New project**
   (name + database password; the free tier needs no card).
2. When provisioning finishes, open **SQL Editor -> New query**, paste the contents
   of `supabase/schema.sql`, and click **Run**. (Creates your data table.)
3. Open **Authentication -> Sign In / Providers -> Email** and turn **OFF**
   "Confirm email." (Lets you create your account and sign in instantly, no
   confirmation email needed - fine for a personal app.)
4. Open **Project Settings -> API** and copy two values: the **Project URL** and
   the **anon public** key.

## Step 2 - Add your keys

Copy `.env.example` to a new file named `.env` and paste your values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## Step 3 - Run it locally

Install **Node.js** (https://nodejs.org, LTS, defaults). Then in a terminal opened
in this folder:

```
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). Create your account and
you're in. Add a finance entry, then open the same URL signed in on another
device/browser - it's there.

---

## Step 4 - Put it online (pick ONE)

### Option A - Vercel CLI (fastest)
```
npm install -g vercel
vercel
```
Follow the prompts. **Important:** add the same two variables in the Vercel
dashboard (your project -> Settings -> Environment Variables):
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Then:
```
vercel --prod
```
That production URL is your app - open it on any device, sign in, done.

### Option B - GitHub + Vercel (best for ongoing work / Lovable later)
1. Create a free GitHub account and a new empty repo.
2. In this folder:
   ```
   git init
   git add .
   git commit -m "Life OS v0.2 (Supabase)"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/life-os.git
   git push -u origin main
   ```
3. On https://vercel.com -> New Project -> import the repo -> add the two
   environment variables -> Deploy. Pushes auto-redeploy.

> `.env` is gitignored, so your keys never reach GitHub - you add them in Vercel's
> environment-variable settings instead.

---

## Notes & next steps

- **Security:** Row Level Security (set by `schema.sql`) means each account can
  only read/write its own rows - your finances stay private to your login.
- **Free tier:** plenty for personal use. One quirk: a free Supabase project pauses
  after a week of no activity - just open the app to wake it, or move to the
  $25/mo Pro plan to remove the pause.
- **Later:** this backend is the foundation for bank/credit-card automation
  (Plaid/Tiller) and for building out the other modules (Today, Health, etc.).

---

## AI Assistant tab — setup

The **AI** tab (last tab) is a chat with a Claude / ChatGPT / Grok switcher. The
provider keys live in Vercel (never in the frontend), and a serverless function at
`api/chat.js` proxies the calls. Only signed-in users can use it.

**1. Get an API key for the provider(s) you want** (start with just one if you like —
the others will say "not set up yet" until you add their keys). These are separate
from your Supabase keys, and they bill per use:
- Claude: https://console.anthropic.com  -> API Keys
- ChatGPT: https://platform.openai.com  -> API Keys
- Grok: https://console.x.ai  -> API Keys

**2. Add them as Vercel environment variables** (Project -> Settings -> Environment
Variables), using these exact names:
```
ANTHROPIC_API_KEY   = your Claude key
OPENAI_API_KEY      = your ChatGPT key
XAI_API_KEY         = your Grok key
```

**3. Redeploy** (push the code / re-upload to GitHub — Vercel rebuilds automatically).
The chat works for whichever keys you added.

Model IDs are set near the top of `api/chat.js` (`claude-sonnet-4-6`, `gpt-5.5`,
`grok-4.3`) and are easy to swap as providers release new ones.
