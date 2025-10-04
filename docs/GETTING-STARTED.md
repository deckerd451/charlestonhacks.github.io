# Getting Started

Welcome to the CharlestonHacks platform! This guide will help you set up your development environment and start contributing.

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- A **code editor** (we recommend [VS Code](https://code.visualstudio.com/))
- A **Supabase account** ([Sign up free](https://supabase.com/))

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/charlestonhacks/charlestonhacks.github.io.git
cd charlestonhacks.github.io
```

### 2. Install Dependencies

```bash
cd app
npm install
```

This will install all React dependencies including:
- React 19
- Mantine UI
- React Query
- Zustand
- Vite

### 3. Configure Supabase

#### Option A: Use Existing Instance (Recommended for Contributors)

The repository is already configured to use the CharlestonHacks Supabase instance. No configuration needed!

#### Option B: Set Up Your Own Instance (For Testing)

If you want to test with your own database:

1. Create a new project at [supabase.com](https://supabase.com/)
2. Copy your project URL and anon key
3. Update `app/src/lib/supabase.js`:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

4. Run the database setup (see [Database Setup](#database-setup) below)

---

## Running the Development Server

### Start the React App

```bash
cd app
npm run dev
```

Visit **http://localhost:3000/app/** in your browser.

You should see the CharlestonHacks React app with:
- Navigation bar
- Home page
- Directory (profile search)
- Profile pages

### Serve Legacy Pages (Optional)

To test the full site including legacy pages:

```bash
# From repository root (not /app)
cd ..
python3 -m http.server 8000
```

Visit **http://localhost:8000** to see the landing page and legacy features.

---

## Database Setup

If you're using your own Supabase instance, you need to set up the database:

### 1. Create Tables

In the Supabase SQL Editor, run:

```sql
-- Community profiles table
CREATE TABLE community (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  bio TEXT,
  availability VARCHAR(50),
  image_url TEXT,
  newsletter_opt_in BOOLEAN DEFAULT false,
  newsletter_opt_in_at TIMESTAMP,
  x FLOAT,
  y FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Endorsements table
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorsed_user_id UUID REFERENCES community(id) ON DELETE CASCADE,
  endorsed_by UUID REFERENCES community(id) ON DELETE CASCADE,
  skill VARCHAR(100) NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(endorsed_user_id, endorsed_by, skill)
);

-- Enable Row Level Security
ALTER TABLE community ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community
CREATE POLICY "Community profiles are viewable by everyone"
  ON community FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON community FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON community FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for endorsements
CREATE POLICY "Endorsements are viewable by everyone"
  ON endorsements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert endorsements"
  ON endorsements FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM community WHERE id = endorsed_by));
```

### 2. Create Database Functions

Run the SQL from `app/db-functions.sql`:

```bash
cd app
# Copy contents of db-functions.sql and paste into Supabase SQL Editor
```

This creates:
- `get_all_skills()` - Returns unique skills for autocomplete
- `get_all_interests()` - Returns unique interests for autocomplete

### 3. Set Up Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Create a new bucket named `avatars`
3. Make it **public** (so profile photos are accessible)
4. Set policies:

```sql
-- Allow anyone to read avatars
CREATE POLICY "Public avatars are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## OAuth Setup (Optional)

To enable LinkedIn, Facebook, and Google login:

### 1. Configure Providers in Supabase

Go to **Authentication > Providers** in Supabase Dashboard and enable:

#### LinkedIn (Recommended)

1. Create app at [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Copy Client ID and Client Secret
3. Set redirect URL: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
4. Add to Supabase LinkedIn settings

#### Google

1. Create project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable OAuth 2.0
3. Copy Client ID and Secret
4. Add redirect URL
5. Add to Supabase Google settings

#### Facebook

1. Create app at [Facebook Developers](https://developers.facebook.com/)
2. Copy App ID and Secret
3. Add redirect URL
4. Add to Supabase Facebook settings

### 2. Configure Redirect URLs

In your app callback settings, add:
- Development: `http://localhost:3000/app/auth/callback`
- Production: `https://charlestonhacks.github.io/app/auth/callback`

---

## First Steps

### 1. Create Your Profile

1. Start dev server: `npm run dev`
2. Click **Sign In** (top right)
3. Choose OAuth provider or use magic link
4. Go to **Profile** → **Edit Profile**
5. Fill out your information:
   - Name
   - Email
   - Skills (e.g., React, Node.js, Python)
   - Interests (e.g., AI, Web3, Design)
   - Bio
   - Availability
   - Profile photo
6. Click **Save Profile**

### 2. Explore the Directory

1. Go to **Directory** in navigation
2. Try searching by:
   - Name (type any name)
   - Skills (select from dropdown)
   - Availability
3. Toggle "Match ALL skills" vs "Match ANY skills"
4. Click on user cards to view profiles

### 3. Make Your First Change

Let's customize the theme:

1. Open `app/src/theme/mantineTheme.js`
2. Change the primary color:

```javascript
export const mantineTheme = {
  colorScheme: 'dark',
  primaryColor: 'violet', // Changed from 'cyan'
  // ...
};
```

3. Save the file
4. See the app update instantly (hot reload)
5. All buttons and badges now use violet!

---

## Running Tests

### Run All Tests

```bash
cd app
npm test
```

This starts Vitest in watch mode. Tests will re-run when you change files.

### Run Tests Once (CI Mode)

```bash
npm run test:run
```

### Open Visual Test UI

```bash
npm run test:ui
```

This opens a browser-based UI showing:
- All test files
- Pass/fail status
- Code coverage
- Test execution time

### Write Your First Test

Create a new component:

```jsx
// app/src/components/Hello.jsx
export function Hello({ name }) {
  return <div>Hello, {name}!</div>;
}
```

Create a test:

```jsx
// app/src/components/__tests__/Hello.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hello } from '../Hello';

describe('Hello', () => {
  it('should greet the user', () => {
    render(<Hello name="Alice" />);
    expect(screen.getByText('Hello, Alice!')).toBeInTheDocument();
  });
});
```

Run tests:

```bash
npm test
```

You should see your test pass!

---

## Development Workflow

### 1. Pick an Issue

Browse [GitHub Issues](https://github.com/charlestonhacks/charlestonhacks.github.io/issues) and look for:
- `good first issue` - Great for beginners
- `help wanted` - Looking for contributors
- `bug` - Something is broken
- `enhancement` - New features

### 2. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

### 3. Make Changes

- Edit files in `app/src/`
- Follow existing code patterns
- Add tests for new features
- Run `npm run lint` to check code style

### 4. Test Your Changes

```bash
# Run dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### 5. Commit

```bash
git add .
git commit -m "Add feature: description of what you did"
```

Use clear commit messages:
- ✅ "Add skill endorsement modal"
- ✅ "Fix profile photo upload bug"
- ✅ "Update README with setup instructions"
- ❌ "changes"
- ❌ "wip"

### 6. Push and Create PR

```bash
git push origin feature/my-new-feature
```

Then go to GitHub and create a Pull Request.

---

## Project Structure Quick Reference

```
/
├── app/                        # React application (where you'll work)
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── ProfileForm.jsx
│   │   │   ├── ProfileView.jsx
│   │   │   ├── DirectorySearch.jsx
│   │   │   └── UserCard.jsx
│   │   ├── store/              # Zustand state management
│   │   │   └── authStore.js
│   │   ├── lib/                # Shared libraries
│   │   │   └── supabase.js     # Supabase client
│   │   ├── theme/              # Mantine UI theme
│   │   │   └── mantineTheme.js
│   │   └── App.jsx             # Main app component
│   ├── db-functions.sql        # Database functions
│   └── package.json
│
├── docs/                       # Documentation
│   ├── GETTING-STARTED.md      # This file!
│   ├── EXTENDING.md            # How to add features
│   ├── DATABASE.md             # Database guide
│   └── LEGACY-CODE.md          # Legacy codebase docs
│
├── assets/                     # Legacy vanilla JS (avoid editing)
├── index.html                  # Legacy landing page
├── CLAUDE.md                   # AI-friendly documentation
└── README.md                   # Project overview
```

**Golden Rule**: Build new features in `app/src/`, not in `assets/` or legacy HTML files.

---

## Common Tasks

### Add a New Component

```bash
cd app/src/components
touch MyComponent.jsx

# Create test file
mkdir -p __tests__
touch __tests__/MyComponent.test.jsx
```

See [EXTENDING.md](./EXTENDING.md) for detailed examples.

### Change the Theme

Edit `app/src/theme/mantineTheme.js` to customize:
- Colors
- Fonts
- Border radius
- Component defaults

### Add a Database Table

1. Create table in Supabase SQL Editor
2. Set up Row Level Security policies
3. Create API functions in `app/src/api/`
4. Use in components with React Query

See [DATABASE.md](./DATABASE.md) for examples.

### Debug Issues

```bash
# Check console for errors
# Browser DevTools → Console

# Check React component tree
# Install React DevTools extension

# Check Supabase queries
# Supabase Dashboard → Database → Query logs
```

---

## Getting Help

### Documentation

- **[README.md](../README.md)** - Project overview and roadmap
- **[EXTENDING.md](./EXTENDING.md)** - How to add features
- **[DATABASE.md](./DATABASE.md)** - Database schema and queries
- **[LEGACY-CODE.md](./LEGACY-CODE.md)** - Understanding legacy code
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues

### Community

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions
- **Email**: hello@charlestonhacks.co

### AI Assistance

This codebase is optimized for AI-assisted development:

- **[CLAUDE.md](../CLAUDE.md)** - AI-friendly documentation
- **[USING-CLAUDE-CODE.md](./USING-CLAUDE-CODE.md)** - Best practices for AI coding

---

## Next Steps

Now that you're set up:

1. ✅ Explore the app and create your profile
2. ✅ Read [EXTENDING.md](./EXTENDING.md) to learn how to add features
3. ✅ Pick a `good first issue` from GitHub
4. ✅ Make your first contribution!

**Welcome to the CharlestonHacks community!** 🎉
