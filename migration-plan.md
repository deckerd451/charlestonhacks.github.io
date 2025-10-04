# Strangler Fig Migration Plan: Vanilla JS → React

## Executive Summary

This plan outlines a **Strangler Fig Pattern** migration strategy to gradually replace the existing vanilla JavaScript application with a modern React architecture, while maintaining full functionality throughout the migration.

The Strangler Fig Pattern allows us to:
1. Build new features in React while keeping old code running
2. Incrementally migrate existing features without breaking changes
3. Minimize risk by testing each piece before cutting over
4. Keep the site fully functional during the entire migration

## Current State Analysis

### Tech Stack
- **Frontend**: Vanilla JavaScript ES6 modules (~3,500 LOC)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Build**: None (direct browser execution) + optional Webpack
- **Hosting**: GitHub Pages (static site)

### Key Dependencies
- Supabase JS SDK (via CDN)
- jQuery (legacy, minimal usage)
- Font Awesome
- LightGallery

### Critical Components
1. **Authentication** - Supabase magic links
2. **Profile Management** - User profiles, skills, interests
3. **Matching Engine** - Jaccard similarity algorithm
4. **Team Builder** - Multi-user team formation
5. **Neural Network Viz** - Canvas-based visualization
6. **Connection System** - Mutual connections with notifications
7. **Leaderboard** - Endorsements and rankings

### Architectural Patterns
- ES6 modules with manual imports
- Event bus for cross-module communication
- Global state in `appState` object
- Direct Supabase calls throughout codebase
- DOM manipulation via vanilla JS

## Migration Strategy

### Phase 0: Foundation (Weeks 1-2)

#### Setup React Infrastructure
```bash
# Create React app alongside existing code
npx create-react-app react-app
cd react-app

# Install dependencies
npm install @supabase/supabase-js
npm install react-router-dom
npm install zustand  # lightweight state management
npm install @tanstack/react-query  # data fetching
```

#### Create Adapter Layer
The key to strangler fig is creating a **bridge** between old and new code.

**File: `react-app/src/adapters/LegacyBridge.js`**
```javascript
// Expose React components to legacy code
export class LegacyBridge {
  static mount(component, containerId, props = {}) {
    const container = document.getElementById(containerId);
    if (container) {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(component, props));
    }
  }

  static unmount(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
    }
  }
}

// Make available globally for legacy code
window.ReactBridge = LegacyBridge;
```

**File: `react-app/src/adapters/SupabaseAdapter.js`**
```javascript
// Shared Supabase client (reuse existing instance)
export const getSupabaseClient = () => {
  // Reuse existing global client if available
  if (window.__dexSupabase) {
    return window.__dexSupabase;
  }
  // Otherwise create new one
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};
```

**File: `react-app/src/adapters/EventBusAdapter.js`**
```javascript
// Bridge to existing event bus
export const legacyEventBus = {
  emit: (name, detail) => {
    if (window.Events) {
      window.Events.dispatchEvent(new CustomEvent(name, { detail }));
    }
  },
  on: (name, callback) => {
    if (window.Events) {
      window.Events.addEventListener(name, (e) => callback(e.detail));
    }
  }
};
```

#### Directory Structure
```
/
├── react-app/                    # NEW: React application
│   ├── public/
│   ├── src/
│   │   ├── adapters/            # Bridge to legacy code
│   │   ├── components/          # React components
│   │   ├── features/            # Feature modules
│   │   ├── hooks/               # Custom React hooks
│   │   ├── store/               # Zustand state
│   │   ├── utils/               # Utilities
│   │   └── legacy-wrapper.js   # Exports for legacy code
│   └── package.json
├── assets/                       # EXISTING: Legacy JS
├── index.html                    # EXISTING: Will gradually update
└── 2card.html                    # EXISTING: Main migration target
```

### Phase 1: Shared Services (Weeks 3-4)

**Goal**: Extract shared logic into React modules that work in BOTH environments.

#### 1.1 Create Shared Data Layer
```javascript
// react-app/src/services/supabase.service.js
import { getSupabaseClient } from '../adapters/SupabaseAdapter';

export const SupabaseService = {
  async getUser() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user, error };
  },

  async getUserProfile(userId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('community')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { profile: data, error };
  },

  async searchBySkills(skills) {
    const supabase = getSupabaseClient();
    const arrayLiteral = `{${skills.map(s => `"${s}"`).join(',')}}`;
    const { data, error } = await supabase
      .from('community')
      .select('*')
      .or(`skills.ov.${arrayLiteral},interests.ov.${arrayLiteral}`);
    return { users: data, error };
  }
};

// Expose to legacy code
window.SupabaseService = SupabaseService;
```

#### 1.2 Create Shared Business Logic
```javascript
// react-app/src/services/matching.service.js
export const MatchingService = {
  jaccard(setA, setB) {
    const a = new Set(setA.map(s => s.toLowerCase()));
    const b = new Set(setB.map(s => s.toLowerCase()));
    const intersection = [...a].filter(x => b.has(x)).length;
    const union = new Set([...a, ...b]).size || 1;
    return intersection / union;
  },

  complementarity(mine, theirs) {
    const a = new Set(mine.map(s => s.toLowerCase()));
    const b = new Set(theirs.map(s => s.toLowerCase()));
    const uniqueA = [...a].filter(x => !b.has(x)).length;
    const uniqueB = [...b].filter(x => !a.has(x)).length;
    const denom = uniqueA + uniqueB || 1;
    return Math.min(uniqueA, uniqueB) / denom;
  },

  scoreMatch(myProfile, theirProfile) {
    const s1 = this.jaccard(myProfile.interests, theirProfile.interests);
    const s2 = this.complementarity(myProfile.skills, theirProfile.skills);
    return 0.6 * s1 + 0.4 * s2;
  }
};

// Expose to legacy code
window.MatchingService = MatchingService;
```

### Phase 2: First React Component in Production (Weeks 5-6)

**Goal**: Ship ONE React component that replaces a small piece of existing functionality.

#### Target: User Card Component

**Why start here?**
- Self-contained, clear boundaries
- Used in multiple places (good ROI)
- Low risk (doesn't affect auth or data)

**File: `react-app/src/components/UserCard.jsx`**
```javascript
import { useState } from 'react';
import { SupabaseService } from '../services/supabase.service';

export function UserCard({ user, onConnect, onEndorse }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    await onConnect(user.id);
    setLoading(false);
  };

  return (
    <div className="user-card">
      <img src={user.image_url || 'https://via.placeholder.com/80'} alt={user.name} />
      <h3>{user.name || 'Anonymous'}</h3>
      <p>{user.email}</p>
      <div className="skills-list">
        {(user.skills || []).map(skill => (
          <div key={skill} className="skill-chip">
            <span>{skill}</span>
            <button onClick={() => onEndorse(user.id, skill)}>+</button>
          </div>
        ))}
      </div>
      <button onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting...' : '🤝 Connect'}
      </button>
    </div>
  );
}
```

#### Integration Point in 2card.html
```html
<!-- Add React bundle -->
<script src="./react-app/build/static/js/main.js"></script>

<!-- Mount point for React components -->
<div id="react-user-cards"></div>

<script>
  // Legacy code can now use React components!
  async function renderResults(users) {
    // OLD: const card = generateUserCard(person);
    // NEW: Let React handle it
    window.ReactBridge.mount(
      window.ReactComponents.UserCardList,
      'react-user-cards',
      {
        users,
        onConnect: connectToUser,
        onEndorse: endorseSkill
      }
    );
  }
</script>
```

### Phase 3: Feature-by-Feature Migration (Weeks 7-16)

Migrate one feature at a time, **routing through React** while keeping legacy fallback.

#### 3.1 Profile Management (Week 7-8)
- Create `ProfileForm` React component
- Use React Hook Form for validation
- Keep Supabase calls, wrap in React Query
- Replace `#profile` tab content with React mount point

#### 3.2 Search & Team Builder (Week 9-10)
- Create `SearchPanel` React component
- Create `TeamBuilder` React component
- Use React Query for data fetching
- Replace `#search` and `#team-builder` tabs

#### 3.3 Leaderboard (Week 11)
- Create `Leaderboard` React component
- Add real-time updates with React Query subscriptions
- Replace `#leaderboard` tab

#### 3.4 Authentication (Week 12-13)
- Create `AuthProvider` context
- Wrap existing Supabase auth
- Gradually replace login/logout UI
- **Keep legacy auth working in parallel**

#### 3.5 Notifications (Week 14)
- Create `NotificationDropdown` React component
- Use React Query for connection requests
- Add Supabase realtime subscriptions

#### 3.6 Neural Network Viz (Week 15-16)
- Create `NeuralCanvas` React component
- Use `useRef` for canvas manipulation
- Keep existing canvas logic, just wrap in React
- This is LOW priority - can stay vanilla longer

### Phase 4: Full Page Conversion (Weeks 17-20)

#### 4.1 Convert 2card.html → React SPA
Once all components are React:
```javascript
// react-app/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './features/auth/AuthProvider';
import { DashboardPage } from './pages/DashboardPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
            {/* etc */}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

#### 4.2 Routing Strategy
Use **URL-based routing** to run old and new side-by-side:

```
/2card.html              → Legacy (gradually hollowed out)
/app/                    → React app (gradually takes over)
/app/profile             → React profile page
/app/search              → React search page
```

Eventually redirect `/2card.html` → `/app/`

### Phase 5: Legacy Code Removal (Weeks 21-24)

#### 5.1 Deprecation Plan
- Week 21: Add "Using new interface" banner to legacy pages
- Week 22: Redirect 50% of traffic to React app (A/B test)
- Week 23: Redirect 100% of traffic, keep legacy as fallback
- Week 24: Remove legacy code entirely

#### 5.2 Cleanup Checklist
- [ ] Remove `assets/js/main.js` and related modules
- [ ] Remove legacy 2card.html (keep as archive)
- [ ] Remove global state objects from window
- [ ] Remove jQuery dependency
- [ ] Update CLAUDE.md with React architecture

## Module Encapsulation Strategy

### Current Problem
- Logic scattered across 30+ JS files
- Global state in `window` object
- Direct DOM manipulation everywhere
- Tight coupling between UI and business logic

### Solution: Feature-Based Architecture

```
react-app/src/
├── features/
│   ├── auth/
│   │   ├── AuthProvider.jsx         # Context provider
│   │   ├── useAuth.js               # Custom hook
│   │   ├── auth.service.js          # Supabase calls
│   │   └── components/
│   │       ├── LoginForm.jsx
│   │       └── MagicLinkStatus.jsx
│   │
│   ├── profile/
│   │   ├── ProfileProvider.jsx
│   │   ├── useProfile.js
│   │   ├── profile.service.js
│   │   └── components/
│   │       ├── ProfileForm.jsx
│   │       ├── SkillsInput.jsx
│   │       └── ProfileProgress.jsx
│   │
│   ├── search/
│   │   ├── useSearch.js
│   │   ├── search.service.js
│   │   └── components/
│   │       ├── SearchPanel.jsx
│   │       ├── UserCardList.jsx
│   │       └── UserCard.jsx
│   │
│   ├── matching/
│   │   ├── useMatching.js
│   │   ├── matching.service.js      # Jaccard, complementarity
│   │   └── components/
│   │       ├── SuggestionsPanel.jsx
│   │       └── MatchScore.jsx
│   │
│   ├── connections/
│   │   ├── useConnections.js
│   │   ├── connections.service.js
│   │   └── components/
│   │       ├── ConnectionButton.jsx
│   │       ├── NotificationDropdown.jsx
│   │       └── ConnectionsList.jsx
│   │
│   └── neural/
│       ├── useNeuralCanvas.js
│       ├── neural.service.js
│       └── components/
│           ├── NeuralCanvas.jsx
│           └── NodeTooltip.jsx
│
├── shared/
│   ├── components/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   └── Notification.jsx
│   ├── hooks/
│   │   ├── useDebounce.js
│   │   ├── useLocalStorage.js
│   │   └── useEventBus.js
│   └── utils/
│       ├── normalize.js
│       ├── validation.js
│       └── formatting.js
│
└── adapters/
    ├── LegacyBridge.js              # React ↔ Legacy
    ├── SupabaseAdapter.js           # Shared Supabase client
    └── EventBusAdapter.js           # Legacy event bus
```

### Encapsulation Benefits
1. **Clear boundaries** - Each feature is self-contained
2. **Testable** - Mock services, test components in isolation
3. **Reusable** - Components don't know about global state
4. **Type-safe** - Can add TypeScript later
5. **Tree-shakable** - Only bundle what's used

## Data Flow: Legacy → React

### Current State Management
```javascript
// Legacy (scattered everywhere)
window.appState = { session: null, features: {} };
window.DOMElements = { ... };
window.SKILL_SUGGESTIONS = [];
```

### New State Management (Zustand)
```javascript
// react-app/src/store/authStore.js
import create from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  logout: () => set({ user: null, session: null })
}));
```

### Bridge Pattern
```javascript
// Sync legacy state → React store
window.Events.addEventListener('auth:login', (e) => {
  useAuthStore.getState().setUser(e.detail.user);
});

// Sync React store → legacy state
useAuthStore.subscribe((state) => {
  window.appState.session = state.session;
});
```

## Build & Deployment Strategy

### Development
```bash
# Terminal 1: Run legacy site
python3 -m http.server 8000

# Terminal 2: Run React dev server
cd react-app && npm start
```

### Production Build
```bash
# Build React app
cd react-app
npm run build

# Copy build to root (served alongside legacy)
cp -r build ../react-dist

# GitHub Pages serves both:
# /index.html        → Legacy
# /2card.html        → Legacy
# /react-dist/       → React app
```

### Routing Configuration
```javascript
// react-app/package.json
{
  "homepage": "/react-dist"
}
```

### Gradual Cutover
```html
<!-- 2card.html transitional version -->
<script>
  // Feature flag: use React or legacy
  const useReactUI = localStorage.getItem('use-react-ui') === 'true';

  if (useReactUI) {
    window.location.href = '/react-dist/';
  }
</script>

<!-- Toggle for testing -->
<button onclick="localStorage.setItem('use-react-ui', 'true'); location.reload();">
  Try New UI
</button>
```

## Testing Strategy

### Phase 0-1: Foundation Testing
- [ ] Verify Supabase adapter reuses existing client
- [ ] Test event bus bridge (legacy → React → legacy)
- [ ] Verify React bundle loads without conflicts

### Phase 2: Component Testing
- [ ] Unit test UserCard component
- [ ] Test service layer functions (matching, search)
- [ ] Visual regression tests (Percy/Chromatic)

### Phase 3-4: Integration Testing
- [ ] E2E test auth flow (legacy + React)
- [ ] Test search → results → connect flow
- [ ] Test notifications (realtime)

### Phase 5: Migration Validation
- [ ] Lighthouse score (performance)
- [ ] Bundle size analysis
- [ ] A/B test metrics (old vs new)

## Rollback Plan

At each phase, maintain **dual deployment**:

```
/2card.html           → Legacy (always works)
/react-dist/          → React (can be disabled)
```

### Emergency Rollback
```html
<!-- Add to 2card.html -->
<script>
  const REACT_ENABLED = true; // Feature flag

  if (!REACT_ENABLED || window.location.search.includes('legacy=1')) {
    // Force legacy UI
    document.getElementById('react-root').remove();
  }
</script>
```

Users can always access legacy with `?legacy=1` query param.

## Success Metrics

### Technical Metrics
- **Bundle size**: < 300KB gzipped
- **First contentful paint**: < 1.5s
- **Time to interactive**: < 3s
- **Lighthouse score**: > 90

### Migration Metrics
- **Lines of code reduced**: 3,500 → ~2,000 (React is more concise)
- **Module coupling**: Eliminate global state
- **Test coverage**: 0% → 80%
- **Build time**: None → < 30s

### User Metrics
- **No increase in error rate**
- **No decrease in engagement**
- **Positive feedback on new UI**

## Risk Mitigation

### Risk: Breaking Changes
**Mitigation**: Keep legacy code running in parallel, gradual cutover

### Risk: Performance Regression
**Mitigation**: Lighthouse CI, bundle size monitoring, code splitting

### Risk: Auth Session Loss
**Mitigation**: Reuse existing Supabase client, test session persistence

### Risk: SEO Impact
**Mitigation**: GitHub Pages is static anyway, no SSR needed. Use React Helmet for meta tags.

### Risk: Team Learning Curve
**Mitigation**: Start with small components, pair programming, code reviews

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0: Foundation | 2 weeks | React setup, adapters, build pipeline |
| 1: Shared Services | 2 weeks | Supabase service, matching service |
| 2: First Component | 2 weeks | UserCard in production |
| 3: Feature Migration | 10 weeks | All features in React |
| 4: Full Page Conversion | 4 weeks | SPA with routing |
| 5: Legacy Removal | 4 weeks | Clean up, optimize |
| **TOTAL** | **24 weeks** | **Fully migrated React app** |

## Next Steps

### Immediate Actions (Week 1)
1. [ ] Set up React app: `npx create-react-app react-app`
2. [ ] Install dependencies: Supabase, React Router, Zustand, React Query
3. [ ] Create adapter layer (LegacyBridge, SupabaseAdapter)
4. [ ] Test mounting a simple React component in 2card.html
5. [ ] Document adapter API for team

### Week 2
6. [ ] Extract Supabase service layer
7. [ ] Extract matching algorithm service
8. [ ] Create shared utilities (normalize, debounce, etc.)
9. [ ] Set up development workflow (run both environments)

### Week 3
10. [ ] Build UserCard React component
11. [ ] Add unit tests for UserCard
12. [ ] Integrate UserCard into search results
13. [ ] Deploy to production (alongside legacy)

---

**Last Updated**: 2025-10-04
**Author**: Migration Team
**Status**: Planning Phase
