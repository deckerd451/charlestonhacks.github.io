# CharlestonHacks

> Building the future of Charleston's tech community through collaboration, innovation, and shared learning.

[![License](https://img.shields.io/badge/license-CCA%203.0-blue.svg)](https://html5up.net/license)
[![React](https://img.shields.io/badge/React-19.1-blue)](https://react.dev/)
[![Mantine](https://img.shields.io/badge/Mantine-7.x-339af0)](https://mantine.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)

**Website**: [charlestonhacks.github.io](https://charlestonhacks.github.io)
**Contact**: hello@charlestonhacks.co | [@Descart84114619](https://twitter.com/Descart84114619)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

CharlestonHacks is a tech community platform built with a **hybrid architecture** combining modern React with legacy vanilla JavaScript. The platform is currently undergoing a **Strangler Fig Migration** to gradually replace legacy code while maintaining full functionality.

### Key Features

- **🔐 Multi-Provider OAuth**: LinkedIn, Facebook, Google authentication
- **👥 Talent Directory**: Search and discover community members by skills, availability, and interests
- **📝 Rich Profiles**: Create detailed profiles with skills, bio, availability, and profile photos
- **⭐ Endorsements**: Endorse community members for their skills
- **🧠 Neural Network Visualization**: Interactive skill graph (legacy feature)
- **🚀 Innovation Engine**: Team matching and collaboration tools (legacy feature)

### Tech Stack

**Modern React App** (Primary):
- React 19 + Vite
- Mantine UI component library
- React Query for server state
- Zustand for client state
- React Router v7

**Backend**:
- Supabase (PostgreSQL + Authentication + Storage)
- REST API with Row Level Security

**Legacy** (Being Migrated):
- Vanilla JavaScript (ES6 modules)
- Direct DOM manipulation
- Custom event bus

---

## 🏗️ Architecture

This project uses a **Strangler Fig Pattern** migration strategy, allowing old and new code to coexist:

```
┌─────────────────────────────────────────────┐
│  React App (/app → deployed to /app/)      │
│  - Modern UI components (Mantine)          │
│  - Profile & Directory (React)             │
│  - OAuth Authentication                     │
│  └─ Wraps legacy pages in iframes          │
├─────────────────────────────────────────────┤
│  Legacy Pages (root HTML files)            │
│  - Innovation Engine (2card.html)          │
│  - Neural Network (neural.html)            │
│  - Landing page (index.html)               │
└─────────────────────────────────────────────┘
           ↓ Shared Singleton ↓
    ┌──────────────────────────────┐
    │   Supabase Client Instance   │
    │   (window.__dexSupabase)     │
    └──────────────────────────────┘
```

**Benefits**:
- ✅ Zero downtime migration
- ✅ Gradual feature replacement
- ✅ Shared authentication state
- ✅ No breaking changes for users

[Learn more about the architecture →](./docs/ARCHITECTURE.md)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- A Supabase account (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/charlestonhacks/charlestonhacks.github.io.git
cd charlestonhacks.github.io

# Install dependencies for React app
cd app
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000/app/` to see the React app.

### First-Time Setup

1. **Configure Supabase**:
   - Copy your Supabase URL and anon key to `app/src/lib/supabase.js`
   - Run database functions: Execute `app/db-functions.sql` in Supabase SQL Editor
   - Set up `avatars` storage bucket with public access

2. **Optional OAuth Setup**:
   - Configure LinkedIn, Facebook, Google in Supabase Dashboard
   - Set callback URL: `https://yourdomain.com/app/auth/callback`

3. **Start Building**:
   - Create your profile at `/app/profile/edit`
   - Browse the directory at `/app/directory`

[Detailed setup guide →](./docs/SETUP.md)

---

## 📚 Documentation

### For Developers

- **[Getting Started](./docs/GETTING-STARTED.md)** - First steps for new contributors
- **[Extending the System](./docs/EXTENDING.md)** - How to add features, components, and pages
- **[Database Guide](./docs/DATABASE.md)** - Schema, queries, and migrations
- **[Deployment](./docs/DEPLOYMENT.md)** - How to deploy to GitHub Pages

### For AI/Claude Code Users

- **[CLAUDE.md](./CLAUDE.md)** - AI-friendly codebase guide
- **[Using Claude Code](./docs/USING-CLAUDE-CODE.md)** - Best practices for AI-assisted development

### Legacy Code

- **[Legacy Code Guide](./docs/LEGACY-CODE.md)** - Understanding and maintaining vanilla JS code
- **[Migration Plan](./MIGRATION-PLAN-V2.md)** - Full migration strategy and roadmap

### Reference

- **[Profile & Directory Requirements](./PROFILE-DIRECTORY-REQUIREMENTS.md)** - Feature specifications
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[API Reference](./docs/API.md)** - Supabase queries and endpoints

---

## 💻 Development

### React App (Modern)

```bash
cd app

# Development
npm run dev              # Start dev server (localhost:3000/app/)
npm test                 # Run tests in watch mode
npm run test:ui          # Open Vitest UI
npm run lint             # Run ESLint

# Production
npm run build            # Build to /dist/app
npm run preview          # Preview production build
```

### Legacy Site (Maintenance Only)

```bash
# Serve from repository root
python3 -m http.server 8000

# Visit http://localhost:8000
```

### Project Structure

```
/
├── app/                    # React application (ACTIVE DEVELOPMENT)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Zustand state management
│   │   ├── lib/            # Shared libraries
│   │   ├── theme/          # Mantine UI theme
│   │   └── App.jsx         # Main app component
│   ├── db-functions.sql    # Database functions
│   └── package.json
│
├── docs/                   # Documentation (YOU ARE HERE)
│   ├── GETTING-STARTED.md
│   ├── EXTENDING.md
│   ├── DATABASE.md
│   └── ...
│
├── assets/                 # Legacy vanilla JS code
│   ├── js/
│   └── css/
│
├── index.html              # Legacy landing page
├── 2card.html              # Legacy innovation engine
├── neural.html             # Legacy neural network viz
├── CLAUDE.md               # AI-friendly documentation
└── README.md               # This file
```

[Full file organization guide →](./docs/FILE-STRUCTURE.md)

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels!

### How to Contribute

1. **Fork** this repository
2. **Create a branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** and test thoroughly
4. **Commit**: `git commit -m "Add amazing feature"`
5. **Push**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Contribution Guidelines

- **New features**: Build in React (`/app` directory), not legacy code
- **Bug fixes**: Fix in React if the feature has been migrated, otherwise legacy is okay
- **Tests**: Add tests for new React components
- **Documentation**: Update relevant docs when changing functionality
- **Code style**: Follow existing patterns, run `npm run lint`

### Good First Issues

Looking to get started? Check out issues labeled:
- `good first issue` - Simple tasks for newcomers
- `documentation` - Help improve our docs
- `ui/ux` - Design and styling improvements

[Full contribution guide →](./CONTRIBUTING.md)

---

## 🧪 Testing

```bash
cd app

# Run all tests
npm test

# Run tests with coverage
npm run test:run -- --coverage

# Open visual test UI
npm run test:ui
```

**Test Stack**: Vitest + React Testing Library + jsdom

Current coverage:
- ✅ Supabase client singleton
- ✅ Auth store (Zustand)
- ✅ LegacyPageWrapper component
- 🚧 Profile components (in progress)
- 🚧 Directory components (in progress)

---

## 🚢 Deployment

The site is deployed to **GitHub Pages** automatically on push to `main`.

### Manual Deployment

```bash
# Build React app
cd app
npm run build

# Commit dist/app to repository
cd ..
git add dist/app
git commit -m "Deploy: Update React app"
git push origin main

# GitHub Pages will serve:
# - React app: https://charlestonhacks.github.io/app/
# - Legacy pages: https://charlestonhacks.github.io/
```

[Full deployment guide →](./docs/DEPLOYMENT.md)

---

## 📄 License

Free for personal and commercial use under the [CCA 3.0 license](https://html5up.net/license).

### Credits

- **Demo Images**: [Unsplash](https://unsplash.com) (CC0 Public Domain)
- **Icons**: [Font Awesome](https://fontawesome.io)
- **UI Library**: [Mantine](https://mantine.dev)
- **Backend**: [Supabase](https://supabase.com)

---

## 📞 Contact & Community

- **Email**: hello@charlestonhacks.co
- **Twitter**: [@Descart84114619](https://twitter.com/Descart84114619)
- **Issues**: [GitHub Issues](https://github.com/charlestonhacks/charlestonhacks.github.io/issues)

---

## 🗺️ Roadmap

### ✅ Completed (Phase 1-2)
- [x] React shell with routing
- [x] OAuth authentication (LinkedIn, Facebook, Google)
- [x] Mantine UI integration
- [x] Profile creation and editing
- [x] Talent directory with search
- [x] Legacy page wrapping (iframes)

### 🚧 In Progress (Phase 3)
- [ ] Endorsement system UI
- [ ] Profile enrichment (pull OAuth data)
- [ ] Onboarding flow for new users
- [ ] Data migration from `skills` to `community` table

### 📅 Planned (Phase 4+)
- [ ] Real-time messaging
- [ ] Event management
- [ ] Project collaboration tools
- [ ] Skill-based team matching (migrate from legacy)
- [ ] Full migration complete (remove all legacy code)

[View detailed roadmap →](./MIGRATION-PLAN-V2.md)

---

**Built with ❤️ by the Charleston tech community**
