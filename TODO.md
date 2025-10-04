# Strangler Fig Migration - TODO List

## ✅ COMPLETED - Initial Setup (Just Done!)

- [x] Create Vite React app in `/app` directory
- [x] Configure Vite to build to `/dist/app` (coexists with legacy)
- [x] Install dependencies (Supabase, React Router, Zustand)
- [x] Create shared Supabase client singleton (reuses legacy instance)
- [x] Build `LegacyPageWrapper` component (wraps legacy pages in iframes)
- [x] Set up React Router with routes
- [x] Build OAuth login modal (LinkedIn, Facebook, Google + Magic Link)
- [x] Create navigation shell with auth state
- [x] Create Zustand auth store
- [x] Build app successfully (365KB bundle)

## 🚧 IMMEDIATE NEXT STEPS

### 1. Configure OAuth Providers in Supabase
- [ ] Go to Supabase Dashboard → Authentication → Providers
- [ ] Enable LinkedIn OAuth:
  - Create LinkedIn app at https://www.linkedin.com/developers/
  - Add redirect URL: `https://hvmotpzhliufzomewzfl.supabase.co/auth/v1/callback`
  - Copy Client ID and Secret to Supabase
- [ ] Enable Facebook OAuth:
  - Create Facebook app at https://developers.facebook.com/
  - Add redirect URL: `https://hvmotpzhliufzomewzfl.supabase.co/auth/v1/callback`
  - Copy App ID and Secret to Supabase
- [ ] Enable Google OAuth:
  - Create Google Cloud project
  - Enable Google+ API
  - Create OAuth credentials
  - Add redirect URL: `https://hvmotpzhliufzomewzfl.supabase.co/auth/v1/callback`
  - Copy Client ID and Secret to Supabase

### 2. Test Development Server
- [ ] Run `cd app && npm run dev`
- [ ] Open http://localhost:3000/app/
- [ ] Test navigation between routes
- [ ] Test legacy page iframes (Innovation Engine, Neural)
- [ ] Test OAuth login buttons (will redirect to provider config page if not set up)
- [ ] Test magic link login flow

### 3. Deploy to GitHub Pages
- [ ] Commit new `/app` directory and `/dist/app` build
- [ ] Push to GitHub
- [ ] Verify build deployed to https://charlestonhacks.com/app/
- [ ] Test production OAuth flow

## 📋 NEXT FEATURES TO BUILD (Priority Order)

### Phase 1: Profile Enrichment (After OAuth Works)
- [ ] Create `ProfileEnrichmentService.js`
- [ ] Pull LinkedIn data (name, headline, photo, skills) after OAuth
- [ ] Pull Facebook photo after OAuth
- [ ] Auto-create/update `community` table row with OAuth data
- [ ] Add database columns for OAuth enrichment:
  ```sql
  ALTER TABLE community ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20);
  ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_linkedin BOOLEAN DEFAULT FALSE;
  ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_facebook BOOLEAN DEFAULT FALSE;
  ALTER TABLE community ADD COLUMN IF NOT EXISTS headline VARCHAR(200);
  ALTER TABLE community ADD COLUMN IF NOT EXISTS social_links JSONB;
  ```

### Phase 2: Onboarding Flow
- [ ] Create `OnboardingFlow.jsx` (multi-step wizard)
- [ ] Build `OnboardingWelcome.jsx` (show profile completeness)
- [ ] Build `OnboardingSkills.jsx` (skill selection with autocomplete)
  - [ ] Show skills suggested from LinkedIn
  - [ ] Allow manual skill entry
  - [ ] Set proficiency levels (Beginner/Intermediate/Expert)
- [ ] Build `OnboardingBio.jsx` (bio, availability, looking for)
- [ ] Build `OnboardingSuccess.jsx` (next actions)
- [ ] Trigger onboarding after first OAuth login (if profile <80% complete)

### Phase 3: Directory (First Pure React Feature)
- [ ] Create `DirectoryPage.jsx`
- [ ] Build `SearchFilters.jsx` (skills, availability, verified)
- [ ] Build `UserCard.jsx` component (enhanced with social proof)
- [ ] Build `UserCardList.jsx` (grid with pagination)
- [ ] Create `DirectoryService.js` (search API)
- [ ] Implement advanced filtering:
  - Skills (ALL, ANY, NONE)
  - Availability
  - Verification badges
  - Active within N days
- [ ] Add sorting (relevance, endorsements, connections, activity)

### Phase 4: Matching Engine
- [ ] Create `MatchingEngine.js` (algorithm service)
- [ ] Implement multi-factor scoring:
  - Skill complementarity
  - Interest overlap (Jaccard)
  - Availability alignment
  - Goal alignment (looking for)
  - Social proof (verified, endorsed)
  - Activity recency
  - Mutual connections
- [ ] Build `SuggestionsPanel.jsx` (show top matches)
- [ ] Build `MatchScore.jsx` (visual breakdown)
- [ ] Add "Why this match?" explanations

### Phase 5: Enhanced Profile Management
- [ ] Build `ProfilePage.jsx` (view/edit)
- [ ] Build `ProfileForm.jsx` (comprehensive edit)
- [ ] Build `SkillsInput.jsx` (add/remove/edit skills)
- [ ] Build `PhotoUpload.jsx` (with crop/resize)
- [ ] Build `ProfileProgress.jsx` (completeness widget)
- [ ] Add profile completeness service
- [ ] Add profile suggestions (what to improve)

### Phase 6: Connections & Endorsements
- [ ] Build `ConnectionButton.jsx` (on user cards)
- [ ] Build `ConnectionRequestModal.jsx` (add intro message)
- [ ] Build `NotificationDropdown.jsx` (inbox)
- [ ] Implement accept/decline actions
- [ ] Add Supabase realtime subscriptions
- [ ] Build `EndorseButton.jsx` (on skill chips)
- [ ] Build `EndorseModal.jsx` (select skills)
- [ ] Implement endorsement limits
- [ ] Auto-verify skills with 3+ endorsements

## 🗄️ DATABASE MIGRATIONS NEEDED

### Migration 1: OAuth Fields
```sql
-- Run in Supabase SQL Editor
ALTER TABLE community ADD COLUMN IF NOT EXISTS headline VARCHAR(200);
ALTER TABLE community ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20);
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_linkedin BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_facebook BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_google BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_email BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS social_links JSONB;
ALTER TABLE community ADD COLUMN IF NOT EXISTS skills_proficiency JSONB;
ALTER TABLE community ADD COLUMN IF NOT EXISTS looking_for TEXT[];
ALTER TABLE community ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;
ALTER TABLE community ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE community ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### Migration 2: Skills Taxonomy (Later)
```sql
CREATE TABLE skill_taxonomy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),
  aliases TEXT[],
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 3: Profile Skills Junction Table (Later)
```sql
CREATE TABLE profile_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES community(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skill_taxonomy(id),
  proficiency VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  endorsed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎨 UI/UX IMPROVEMENTS

- [ ] Add dark mode toggle
- [ ] Improve mobile responsiveness
- [ ] Add loading skeletons instead of spinners
- [ ] Add animations (framer-motion?)
- [ ] Add toast notifications (react-hot-toast?)
- [ ] Improve accessibility (ARIA labels, keyboard nav)
- [ ] Add error boundaries
- [ ] Add 404 page

## 🧪 TESTING

- [ ] Write unit tests for services (MatchingEngine, ProfileEnrichment)
- [ ] Write component tests (UserCard, SearchFilters)
- [ ] Write E2E test for OAuth flow (Playwright)
- [ ] Write E2E test for search → connect flow
- [ ] Test iframe legacy pages (manual)

## 🚀 DEPLOYMENT & MONITORING

- [ ] Set up GitHub Actions for auto-deploy on push
- [ ] Add bundle size monitoring (bundlesize or similar)
- [ ] Add performance monitoring (Lighthouse CI)
- [ ] Add error tracking (Sentry or similar)
- [ ] Add analytics (PostHog, Mixpanel, or Plausible)
- [ ] Set up staging environment (GitHub Pages branch?)

## 🔧 TECHNICAL DEBT

- [ ] Add TypeScript (optional but recommended)
- [ ] Add ESLint rules enforcement
- [ ] Add pre-commit hooks (Husky)
- [ ] Add code splitting for routes (React.lazy)
- [ ] Optimize bundle size (tree shaking, lazy loading)
- [ ] Add service worker for PWA support
- [ ] Add image optimization (sharp, next/image alternatives)

## 📚 DOCUMENTATION

- [ ] Update CLAUDE.md with React architecture
- [ ] Document OAuth setup process
- [ ] Document build/deploy process
- [ ] Add component storybook (Storybook.js?)
- [ ] Document API contracts for services
- [ ] Add architecture diagrams (mermaid.js?)

## 🔄 LEGACY CODE MIGRATION

### Pages to Eventually Migrate to React
- [ ] `index.html` → Keep as landing (or replace with React)
- [ ] `2card.html` → Migrate to `/app/innovation-engine` (React)
- [ ] `neural.html` → Migrate to `/app/neural` (React)
- [ ] `profiles.html` → Migrate to `/app/profiles` (React)
- [ ] `news.html` → Migrate to `/app/news` (React)
- [ ] Keep other event pages as legacy (low priority)

### Services to Extract to Shared
- [x] Supabase client (DONE)
- [ ] Auth service (wrap in React service)
- [ ] Profile service (CRUD operations)
- [ ] Matching algorithm (extract from main.js)
- [ ] Search/filter logic (extract from multiple files)
- [ ] Connection service (requests, accept/decline)
- [ ] Endorsement service

## 🎯 SUCCESS METRICS TO TRACK

- [ ] OAuth adoption rate (% of new users)
- [ ] Profile completeness average (target: 85%+)
- [ ] Onboarding completion rate (target: 70%+)
- [ ] Connection acceptance rate (target: 60%+)
- [ ] Search usage (queries per user)
- [ ] Match quality (suggestion → connection rate)
- [ ] Page load time (target: <2s)
- [ ] Bundle size (target: <300KB gzipped)

---

## 🏃 Quick Start Guide

### Development
```bash
# Start React dev server
cd app
npm run dev
# Opens at http://localhost:3000/app/

# Start legacy server (in another terminal)
python3 -m http.server 8000
# Opens at http://localhost:8000
```

### Build & Deploy
```bash
# Build React app
cd app
npm run build
# Outputs to /dist/app

# Commit and push
git add .
git commit -m "Add React app with strangler fig pattern"
git push origin main
```

### Directory Structure
```
/
├── app/                      # NEW: Vite React app
│   ├── src/
│   │   ├── components/      # AuthModal, LegacyPageWrapper, etc.
│   │   ├── store/           # Zustand stores
│   │   ├── lib/             # Supabase client
│   │   ├── App.jsx          # Main app
│   │   └── main.jsx         # Entry point
│   ├── vite.config.js
│   └── package.json
├── dist/app/                 # Built React app (deployed)
├── assets/                   # LEGACY: Vanilla JS
├── index.html               # LEGACY: Landing page
├── 2card.html               # LEGACY: Innovation Engine (wrapped)
├── neural.html              # LEGACY: Neural viz (wrapped)
└── TODO.md                  # THIS FILE
```

---

**Last Updated**: 2025-10-04
**Next Session**: Start with OAuth provider configuration in Supabase
