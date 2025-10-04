# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CharlestonHacks is undergoing a **Strangler Fig Migration** from vanilla JavaScript to React. The site is a tech community platform for events and collaboration in Charleston, SC.

**Current State**: Hybrid architecture (React shell + legacy pages)
**Target State**: Full React SPA with OAuth authentication and talent directory

## Architecture (Hybrid - Migration In Progress)

### Two Parallel Codebases

**NEW: React App (`/app` directory)**
- Vite + React 19 + React Router
- Mantine UI component library with custom theme
- React Query for server state management
- Zustand for client state (auth)
- OAuth authentication (LinkedIn, Facebook, Google)
- Modern component-based architecture
- Wraps legacy pages in iframes during migration
- Build output: `/dist/app` (deployed to `/app/` route)

**LEGACY: Vanilla JS (`/assets`, root HTML files)**
- ES6 modules, no build step
- Magic link authentication only
- Direct DOM manipulation
- Still functional, gradually being replaced

### Shared Resources

**Supabase Client** - Singleton shared between React and legacy:
- URL: `https://hvmotpzhliufzomewzfl.supabase.co`
- Storage key: `sb-hvmotpzhliufzomewzfl-auth-token`
- Instance: `window.__dexSupabase` (accessible to both codebases)

**Database Tables**:
- `community` - User profiles (PRIMARY: user_id, name, email, skills[], interests[], bio, availability, image_url, newsletter_opt_in)
- `endorsements` - Skill endorsements (endorsed_user_id, endorsed_by, skill, count)
- `connections` - Mutual connection requests (from_user_id, to_user_id, status)
- `skills` - LEGACY table (being migrated to community)
- `signals` - Activity feed / routing service data

**Database Functions**:
- `get_all_skills()` - Returns unique skills from community table
- `get_all_interests()` - Returns unique interests from community table

## Development Commands

### React App (Primary Development)
```bash
# Navigate to React app
cd app

# Install dependencies (first time)
npm install

# Start dev server (localhost:3000/app/)
npm run dev

# Run tests
npm test               # Watch mode
npm run test:ui        # Open visual UI
npm run test:run       # CI mode (one-time)

# Build for production
npm run build          # Outputs to /dist/app
```

### Legacy Site (Maintenance Only)
```bash
# Serve from root (localhost:8000)
python3 -m http.server 8000

# Optional Express routing service
npm install
npm start  # Port 4000
```

## Code Patterns

### React App Patterns

**Mantine UI Theme**
```javascript
// app/src/theme/mantineTheme.js
export const mantineTheme = {
  colorScheme: 'dark',
  primaryColor: 'cyan',
  // Customize colors, fonts, spacing, components, etc.
};

// Helper functions
export const availabilityColors = {
  'Full-time': 'green',
  'Part-time': 'blue',
  // ...
};

export function calculateProfileCompleteness(profile) { /* ... */ }
```

**Supabase Client (Shared Singleton)**
```javascript
// app/src/lib/supabase.js
import { supabase } from './lib/supabase';

// Reuses legacy client if available: window.__dexSupabase
// Auto-exposes to window for legacy compatibility
```

**Auth State (Zustand)**
```javascript
// app/src/store/authStore.js
import { useAuthStore } from './store/authStore';

const { user, session, signInWithOAuth, signInWithMagicLink, signOut } = useAuthStore();

// Initialize on app mount
useEffect(() => {
  initialize();
}, []);
```

**Server State (React Query)**
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch data
const { data: users, isLoading } = useQuery({
  queryKey: ['directory', filters],
  queryFn: async () => {
    const { data } = await supabase.from('community').select('*');
    return data;
  },
});

// Mutate data
const saveMutation = useMutation({
  mutationFn: async (profileData) => {
    const { data } = await supabase.from('community').upsert(profileData);
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['profile']);
  },
});
```

**OAuth Providers**
- `linkedin_oidc` - LinkedIn (recommended, pulls professional data)
- `facebook` - Facebook (profile photo)
- `google` - Google (fallback)
- Magic link (email fallback)

**Components**
```javascript
// Authentication
import { AuthModal } from './components/AuthModal';
<AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />

// Profile Management
import { ProfileForm } from './components/ProfileForm';
import { ProfileView } from './components/ProfileView';
<ProfileForm />  // Create/edit profile
<ProfileView />  // View own profile or others

// Directory
import { DirectorySearch } from './components/DirectorySearch';
import { UserCard } from './components/UserCard';
<DirectorySearch />  // Search with filters
<UserCard user={user} endorsements={endorsements} />
```

**Legacy Page Links**
```javascript
// Legacy pages redirect to root HTML files
<Route path="/innovation-engine" element={<Navigate to="/2card.html" replace />} />
<Route path="/neural" element={<Navigate to="/neural.html" replace />} />

// Users navigate directly to legacy HTML pages
// React and legacy pages coexist but don't share navigation
```

**Routing**
```javascript
// app/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Base path: /app
// Routes:
//   / - Home page
//   /profile - View own profile
//   /profile/edit - Create/edit profile
//   /profile/:userId - View other user's profile
//   /directory - Search users by skills, name, availability
//   /innovation-engine - Legacy 2card.html (wrapped)
//   /neural - Legacy neural.html (wrapped)
//   /auth/callback - OAuth callback handler
```

### Legacy Patterns (Vanilla JS)

**Module Imports**
```javascript
import { supabaseClient } from './supabaseClient.js';
import { emit, on } from './globals.js';
```

**Event Bus** (Cross-module communication)
```javascript
emit('event-name', { data });
on('event-name', (data) => { /* handle */ });
```

**Supabase Access**
```javascript
import { supabaseClient as supabase } from './supabaseClient.js';

// Same client instance as React app via window.__dexSupabase
```

## File Organization

```
/
├── app/                          # NEW: React application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── AuthModal.jsx    # OAuth login modal
│   │   │   ├── AuthModal.css    # Modal styles
│   │   │   ├── LegacyPageWrapper.jsx  # Iframe wrapper for legacy pages
│   │   │   ├── ProfileForm.jsx  # Create/edit profile
│   │   │   ├── ProfileView.jsx  # View profile
│   │   │   ├── DirectorySearch.jsx  # Search users with filters
│   │   │   └── UserCard.jsx     # User card component
│   │   ├── store/                # Zustand state
│   │   │   └── authStore.js     # Auth state management
│   │   ├── lib/                  # Shared libraries
│   │   │   └── supabase.js      # Supabase client (reuses legacy)
│   │   ├── theme/                # UI theme
│   │   │   └── mantineTheme.js  # Mantine theme config
│   │   ├── test/                 # Test utilities
│   │   │   └── setup.js         # Vitest setup
│   │   ├── __tests__/            # Component/unit tests
│   │   ├── App.jsx               # Main React app
│   │   ├── App.css               # App styles
│   │   └── main.jsx              # Entry point
│   ├── db-functions.sql          # Database functions (run in Supabase)
│   ├── vite.config.js            # Vite configuration
│   ├── vitest.config.js          # Test configuration
│   └── package.json              # Dependencies
│
├── dist/app/                     # Built React app (deployed to /app/)
│
├── assets/                       # LEGACY: Vanilla JS
│   ├── js/
│   │   ├── supabaseClient.js    # Shared Supabase singleton
│   │   ├── main.js              # Legacy main logic
│   │   ├── matchEngine.js       # Matching algorithm (Jaccard)
│   │   ├── teamBuilder.js       # Team formation
│   │   ├── auth/                # Legacy auth (magic links)
│   │   ├── api/                 # API wrappers
│   │   ├── pages/               # Dex pages (dashboard, onboarding)
│   │   └── ui/                  # DOM helpers, router
│   └── css/                      # Legacy styles
│
├── index.html                    # LEGACY: Landing page
├── 2card.html                    # LEGACY: Innovation Engine (wrapped in /app)
├── neural.html                   # LEGACY: Neural viz (wrapped in /app)
├── dex.html                      # LEGACY: Dex AGI
├── routingService.js             # Optional Express backend
├── TODO.md                       # Migration task list ⭐ CHECK THIS
├── MIGRATION-PLAN-V2.md         # Detailed migration strategy
└── CLAUDE.md                     # This file
```

## Testing

### React App Tests
```bash
cd app
npm test              # Watch mode (recommended during dev)
npm run test:run      # CI mode (one-time)
npm run test:ui       # Visual UI
```

**Test Files**:
- `app/src/lib/__tests__/supabase.test.js` - Supabase client singleton
- `app/src/store/__tests__/authStore.test.js` - Auth state management
- `app/src/components/__tests__/LegacyPageWrapper.test.jsx` - Iframe wrapper

**Test Stack**: Vitest + React Testing Library + jsdom

### Legacy Testing
No formal tests. Manual testing in browser.

## Migration Strategy (Strangler Fig)

1. **React Shell** ✅ DONE - Navigation, auth, routing
2. **Legacy Coexistence** ✅ DONE - React and legacy pages redirect to each other
3. **OAuth Auth** ✅ DONE - Multi-provider login modal
4. **Shared Supabase** ✅ DONE - Singleton client
5. **Mantine UI** ✅ DONE - Custom theme configuration
6. **Profile System** ✅ DONE - Create/edit/view profiles (React)
7. **Directory** ✅ DONE - Search users by skills/name/availability (React)
8. **Next Steps** → Gradually migrate legacy features to React

**Key Principles**:
- Keep legacy code functional during migration
- Build new features in React
- Gradually replace legacy pages one at a time
- Shared Supabase client prevents auth conflicts
- Use `community` table as single source of truth
- Mantine UI for consistent, accessible components
- **NO INLINE COMPONENTS**: Every component must have its own file in `app/src/components/`

## Important Notes

- **Hybrid Architecture**: Both React and vanilla JS coexist
- **Shared State**: Supabase client is global singleton
- **UI Library**: Mantine with customizable theme (`app/src/theme/mantineTheme.js`)
- **Data Model**: Use `community` table exclusively (skills[] and interests[] are Postgres arrays)
- **Database Functions Required**: Run `app/db-functions.sql` in Supabase SQL Editor
- **OAuth Setup Required**: Configure LinkedIn/Facebook/Google in Supabase dashboard
- **Storage Buckets**: `avatars` bucket for profile photos (5MB max)
- **Build Output**: React app builds to `/dist/app`, deployed to `/app/` route
- **Legacy Compatibility**: React components can communicate with legacy via window events
- **No TypeScript**: Pure JavaScript (React and legacy)
- **Testing**: React has full test coverage, legacy is manual only

## Code Style Rules

### Component Organization

**RULE: No Inline Components**
- ❌ NEVER define components inside other files (especially App.jsx)
- ✅ ALWAYS create a separate file in `app/src/components/` for each component
- ✅ Use named exports: `export function MyComponent() { }`

**Example - Wrong**:
```javascript
// ❌ Bad: Inline component in App.jsx
function App() {
  function MyComponent() {
    return <div>Hello</div>;
  }

  return <MyComponent />;
}
```

**Example - Correct**:
```javascript
// ✅ Good: app/src/components/MyComponent.jsx
export function MyComponent() {
  return <div>Hello</div>;
}

// app/src/App.jsx
import { MyComponent } from './components/MyComponent';

function App() {
  return <MyComponent />;
}
```

**Why**: Separate files improve:
- Code organization and discoverability
- Testing (easier to import and test)
- Reusability across the app
- Code splitting and bundle optimization

## Next Steps for AI

1. **Database Setup**:
   - Run `app/db-functions.sql` in Supabase SQL Editor
   - Configure RLS policies for `community` and `endorsements` tables
   - Set up `avatars` storage bucket with public access

2. **OAuth Configuration**:
   - Set up LinkedIn, Facebook, Google providers in Supabase dashboard
   - Configure callback URLs: `https://yourdomain.com/app/auth/callback`

3. **Profile Enrichment**:
   - Pull LinkedIn headline, profile photo after OAuth
   - Auto-populate skills from LinkedIn profile

4. **Endorsement System**:
   - Build endorsement modal UI
   - Implement endorsement logic (prevent self-endorsement)
   - Add endorsement notifications

5. **Data Migration**:
   - Migrate data from `skills` table to `community` table
   - See `PROFILE-DIRECTORY-REQUIREMENTS.md` for migration SQL

## Quick Reference

**Start Dev Server**: `cd app && npm run dev`
**Run Tests**: `cd app && npm test`
**Build**: `cd app && npm run build`
**Deploy**: Commit `/dist/app` to main branch

**Supabase URL**: `https://hvmotpzhliufzomewzfl.supabase.co`
**React Base Path**: `/app`
**Legacy Base Path**: `/` (root)
