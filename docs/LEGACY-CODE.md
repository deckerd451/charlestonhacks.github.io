# Legacy Code Guide

This document explains the legacy vanilla JavaScript codebase and how it coexists with the modern React application.

---

## Overview

The legacy codebase was built with vanilla JavaScript (ES6 modules) and served the CharlestonHacks platform before the React migration. It is still functional and serves several key pages that are gradually being migrated.

### Legacy Pages Still in Use

| Page | File | Status | Migration Priority |
|------|------|--------|-------------------|
| Landing Page | `index.html` | Active | Low (works well) |
| Innovation Engine | `2card.html` | Wrapped in iframe | High (complex feature) |
| Neural Network | `neural.html` | Wrapped in iframe | Medium (visualization) |
| Dex AGI | `dex.html` | Active | Low (experimental) |

---

## Architecture

### File Structure

```
/assets
├── js/
│   ├── supabaseClient.js       # Shared Supabase singleton
│   ├── globals.js              # Event bus, global state
│   ├── main.js                 # Entry point for legacy pages
│   │
│   ├── auth/
│   │   ├── magicLinkAuth.js   # Magic link authentication
│   │   └── session.js         # Session management
│   │
│   ├── api/
│   │   ├── communityApi.js    # Community table CRUD
│   │   ├── skillsApi.js       # Skills table CRUD (deprecated)
│   │   └── connectionsApi.js  # Connections API
│   │
│   ├── pages/
│   │   ├── dashboard.js       # User dashboard
│   │   ├── onboarding.js      # Onboarding flow
│   │   └── profile.js         # Profile management (OLD)
│   │
│   ├── ui/
│   │   ├── router.js          # Client-side routing
│   │   ├── modal.js           # Modal utilities
│   │   └── notifications.js   # Toast notifications
│   │
│   ├── matchEngine.js         # Jaccard similarity matching
│   ├── teamBuilder.js         # Team formation logic
│   ├── profileForm.js         # Profile form (skills table)
│   ├── profile.js             # Profile form (community table)
│   ├── search.js              # Name search
│   ├── teamsearch.js          # Skills search
│   ├── cardRenderer.js        # User card HTML generation
│   └── leaderboard.js         # Endorsement leaderboard
│
└── css/
    ├── main.css               # Global styles
    ├── noscript.css           # No-JS fallback
    └── fontawesome-all.min.css
```

---

## Key Concepts

### 1. Module System (ES6)

Legacy code uses **native ES6 modules** (no bundler):

```javascript
// Importing
import { supabaseClient } from './supabaseClient.js';
import { emit, on } from './globals.js';

// Exporting
export const myFunction = () => { /* ... */ };
export default { myFunction, anotherFunction };
```

**Important**: All imports must include `.js` extension.

### 2. Event Bus (Cross-Module Communication)

The event bus in `globals.js` allows modules to communicate without direct coupling:

```javascript
// globals.js
const eventBus = {};

export function emit(eventName, data) {
  if (eventBus[eventName]) {
    eventBus[eventName].forEach(callback => callback(data));
  }
}

export function on(eventName, callback) {
  if (!eventBus[eventName]) eventBus[eventName] = [];
  eventBus[eventName].push(callback);
}

// Usage in modules
import { emit, on } from './globals.js';

// Listen for events
on('user:login', (user) => {
  console.log('User logged in:', user);
});

// Emit events
emit('user:login', { id: '123', email: 'user@example.com' });
```

**Common Events**:
- `user:login` - User authenticated
- `user:logout` - User signed out
- `profile:updated` - Profile data changed
- `connection:requested` - Connection request sent
- `skill:endorsed` - Skill endorsement added

### 3. Shared Supabase Client

The Supabase client is a **singleton** shared between React and legacy code:

```javascript
// assets/js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';

let supabaseInstance = null;

export const supabaseClient = (() => {
  // Check if React app already created client
  if (typeof window !== 'undefined' && window.__dexSupabase) {
    console.log('[Legacy] Reusing React Supabase client');
    return window.__dexSupabase;
  }

  // Create new client
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storageKey: 'sb-hvmotpzhliufzomewzfl-auth-token',
      },
    });

    // Expose to window for React compatibility
    if (typeof window !== 'undefined') {
      window.__dexSupabase = supabaseInstance;
    }
  }

  return supabaseInstance;
})();
```

**Key Points**:
- ✅ Reuses React client if available (`window.__dexSupabase`)
- ✅ Shares auth session via localStorage
- ✅ Same storage key as React app
- ✅ No auth conflicts between React and legacy

### 4. Direct DOM Manipulation

Legacy code uses vanilla JavaScript DOM methods:

```javascript
// Create element
const div = document.createElement('div');
div.className = 'user-card';
div.innerHTML = `<h3>${user.name}</h3>`;

// Append to DOM
document.getElementById('container').appendChild(div);

// Event listeners
div.addEventListener('click', () => {
  console.log('Card clicked');
});

// Query selectors
const cards = document.querySelectorAll('.user-card');
cards.forEach(card => {
  card.style.opacity = '0.5';
});
```

No React, no virtual DOM, just direct browser APIs.

---

## Legacy Features

### 1. Magic Link Authentication

**File**: `assets/js/auth/magicLinkAuth.js`

```javascript
import { supabaseClient } from '../supabaseClient.js';

export async function sendMagicLink(email) {
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  return { success: true };
}

export async function handleCallback() {
  // Supabase automatically handles callback
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}
```

**Status**: Still works, but React app uses OAuth (LinkedIn, Facebook, Google).

### 2. Innovation Engine (2card.html)

**Features**:
- Team matching based on Jaccard similarity
- Skill-based recommendations
- Connection requests
- Real-time updates

**Key Files**:
- `matchEngine.js` - Jaccard algorithm
- `teamBuilder.js` - Team formation logic
- `connectionsApi.js` - Connection CRUD operations

**Algorithm (Jaccard Similarity)**:
```javascript
// matchEngine.js
function jaccardSimilarity(setA, setB) {
  const intersection = setA.filter(x => setB.includes(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function findMatches(userSkills, allUsers) {
  return allUsers
    .map(user => ({
      user,
      score: jaccardSimilarity(userSkills, user.skills),
    }))
    .filter(match => match.score > 0.2)
    .sort((a, b) => b.score - a.score);
}
```

**Migration Plan**: Rebuild as React component with real-time subscriptions.

### 3. Neural Network Visualization (neural.html)

**Features**:
- D3.js force-directed graph
- Nodes = users, edges = shared skills
- Interactive dragging and zooming
- Skill-based clustering

**Key Files**:
- `neural.html` - Contains inline D3.js code
- Uses `community` table with `x, y` coordinates for persistence

**Data Structure**:
```javascript
const graphData = {
  nodes: [
    { id: 'user1', name: 'Alice', skills: ['React', 'Node'] },
    { id: 'user2', name: 'Bob', skills: ['React', 'Python'] },
  ],
  links: [
    { source: 'user1', target: 'user2', skill: 'React', strength: 0.8 },
  ],
};
```

**Migration Plan**: Low priority, works well as iframe.

### 4. Profile Management (Deprecated)

**Files**:
- `profileForm.js` - Saves to `skills` table (OLD)
- `profile.js` - Saves to `community` table (NEWER)

**Issue**: Two incompatible systems existed:

| System | Table | Skills Format | Status |
|--------|-------|---------------|--------|
| Old | `skills` | `"react(Expert),node(Intermediate)"` | Deprecated |
| New | `community` | `["react", "node"]` (Postgres array) | Active |

**Solution**: React app uses `community` table exclusively. Legacy `profileForm.js` should not be used.

### 5. Search Systems

**Name Search** (`search.js`):
```javascript
async function searchByName(query) {
  const { data, error } = await supabaseClient
    .from('community')
    .select('*')
    .ilike('name', `%${query}%`);

  return data;
}
```

**Skills Search** (`teamsearch.js`):
```javascript
async function searchBySkills(skills) {
  const { data, error } = await supabaseClient
    .from('community')
    .select('*')
    .contains('skills', skills); // ALL skills required (AND logic)

  return data;
}
```

**Status**: Replaced by React `DirectorySearch` component with advanced filters.

---

## Working with Legacy Code

### When to Modify Legacy Code

**DO modify legacy code if**:
- ✅ Fixing a critical bug in an unwrapped legacy page
- ✅ Updating shared Supabase client logic
- ✅ Maintaining `index.html` landing page

**DON'T modify legacy code if**:
- ❌ Adding new features (build in React instead)
- ❌ Refactoring wrapped pages (2card.html, neural.html)
- ❌ Changing profile/directory logic (already migrated to React)

### How to Test Legacy Code

```bash
# Serve from repository root
cd /path/to/charlestonhacks.github.io
python3 -m http.server 8000

# Visit pages
open http://localhost:8000/index.html
open http://localhost:8000/2card.html
open http://localhost:8000/neural.html
```

**Browser Console**: Check for errors, especially module loading issues.

### Debugging Legacy Code

1. **Enable verbose logging**:
```javascript
// Add to top of file
const DEBUG = true;
const log = (...args) => DEBUG && console.log('[ModuleName]', ...args);

// Use throughout
log('User logged in:', user);
```

2. **Check event bus**:
```javascript
// In browser console
window.__eventBus = eventBus; // Expose from globals.js

// Listen to all events
Object.keys(window.__eventBus).forEach(event => {
  console.log('Event registered:', event);
});
```

3. **Verify Supabase client**:
```javascript
// In browser console
console.log(window.__dexSupabase);

// Check auth state
const session = await window.__dexSupabase.auth.getSession();
console.log('Session:', session);
```

---

## Database Schema (Legacy)

### `skills` Table (Deprecated)

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(255) UNIQUE,
  skills TEXT,  -- Comma-separated: "react(Expert),node(Intermediate)"
  "Bio" TEXT,   -- Capitalized column name!
  "Availability" TEXT,  -- Capitalized!
  image_url TEXT,
  endorsements JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  inserted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Problems**:
- ❌ Skills as TEXT (hard to query)
- ❌ Proficiency embedded in string
- ❌ Capitalized column names (inconsistent)
- ❌ No `user_id` foreign key

**Migration**: See `PROFILE-DIRECTORY-REQUIREMENTS.md` for SQL to migrate to `community` table.

---

## Communication with React App

### React → Legacy (Events)

React can dispatch window events that legacy code listens for:

```javascript
// In React component
window.dispatchEvent(new CustomEvent('auth:changed', {
  detail: { user, session }
}));

// In legacy code
window.addEventListener('auth:changed', (e) => {
  const { user, session } = e.detail;
  console.log('Auth changed:', user);
});
```

### Legacy → React (Shared State)

Legacy code can update shared window object:

```javascript
// In legacy code
window.appState = {
  user: currentUser,
  session: currentSession,
};

// In React (useEffect)
const checkLegacyState = () => {
  if (window.appState?.user) {
    setUser(window.appState.user);
  }
};
```

### Best Practice: Avoid Tight Coupling

Prefer **shared Supabase client** over custom events. Both React and legacy can:
- Listen to `onAuthStateChange`
- Query the same database tables
- Use the same storage buckets

---

## Migration Checklist

When migrating a legacy feature to React:

- [ ] Identify all legacy files that implement the feature
- [ ] Document the feature's business logic
- [ ] Build equivalent React component(s)
- [ ] Test with same data/scenarios
- [ ] Update routing to point to React version
- [ ] Wrap or remove legacy page
- [ ] Update tests
- [ ] Update documentation

**Example**: Profile management migration (completed):
1. ✅ Identified: `profileForm.js`, `profile.js`
2. ✅ Documented: See `PROFILE-DIRECTORY-REQUIREMENTS.md`
3. ✅ Built: `ProfileForm.jsx`, `ProfileView.jsx`
4. ✅ Tested: Unit tests + manual testing
5. ✅ Routing: `/app/profile`, `/app/profile/edit`
6. ✅ Legacy: Deprecated `profileForm.js`, `profile.js`

---

## Common Pitfalls

### 1. Module Import Paths

**Problem**: Forgetting `.js` extension
```javascript
// ❌ Wrong
import { supabaseClient } from './supabaseClient';

// ✅ Correct
import { supabaseClient } from './supabaseClient.js';
```

### 2. CORS with CDN Imports

**Problem**: Importing from CDN without `+esm`
```javascript
// ❌ Wrong
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js';

// ✅ Correct
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
```

### 3. Event Bus Memory Leaks

**Problem**: Not removing event listeners
```javascript
// ❌ Memory leak
on('user:login', (user) => { /* handle */ });

// ✅ With cleanup
const handler = (user) => { /* handle */ };
on('user:login', handler);

// Later...
off('user:login', handler); // Need to implement `off` in globals.js
```

### 4. Async/Await in Top-Level

**Problem**: Using `await` outside async function
```javascript
// ❌ Wrong
const user = await supabaseClient.auth.getUser();

// ✅ Correct
(async () => {
  const user = await supabaseClient.auth.getUser();
})();
```

---

## Resources

- [ES6 Modules Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [D3.js Force Layout](https://d3js.org/d3-force)

---

## Questions?

If you're confused about legacy code, check:
1. This document
2. Code comments in the specific file
3. Git history: `git log --follow <file>`
4. Ask in GitHub Discussions

**Remember**: When in doubt, build new features in React, not legacy code!
