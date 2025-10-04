# Deployment Guide

How to deploy the CharlestonHacks platform to GitHub Pages and other hosting platforms.

---

## GitHub Pages (Production)

The official site is deployed to GitHub Pages at: `https://charlestonhacks.github.io`

### Automatic Deployment

GitHub Pages automatically serves files from the `main` branch:
- React app: `https://charlestonhacks.github.io/app/` (from `/dist/app`)
- Legacy pages: `https://charlestonhacks.github.io/` (root HTML files)

### Manual Deployment Steps

```bash
# 1. Build React app
cd app
npm run build

# This creates /dist/app with production build

# 2. Return to root
cd ..

# 3. Add built files to git
git add dist/app

# 4. Commit
git commit -m "Deploy: Update React app build"

# 5. Push to main
git push origin main

# 6. Wait 1-2 minutes for GitHub Pages to update
```

### Build Configuration

The React app is configured to build for GitHub Pages:

```javascript
// app/vite.config.js
export default defineConfig({
  base: '/app/',  // Important: sets base path
  build: {
    outDir: '../dist/app',  // Output to /dist/app
    emptyOutDir: true,
  },
});
```

---

## Environment Variables

### Development

No environment variables needed! Supabase URL and key are in the code.

### Production

For your own deployment, update:

```javascript
// app/src/lib/supabase.js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

**Note**: The anon key is safe to expose (it's client-side). Row Level Security protects your data.

---

## Deployment Checklist

Before deploying to production:

- [ ] **Run tests**: `npm test` (all pass)
- [ ] **Build locally**: `npm run build` (no errors)
- [ ] **Check bundle size**: Inspect `dist/app` folder (should be < 10MB)
- [ ] **Test production build**: `npm run preview`
- [ ] **Verify OAuth callback URLs**: Check Supabase auth settings
- [ ] **Update CLAUDE.md**: Document any new features
- [ ] **Create git tag**: `git tag v1.0.0` (optional)

---

## Custom Domain

To use a custom domain (e.g., `charlestonhacks.com`):

### 1. Configure DNS

Add DNS records:

```
A     @       185.199.108.153
A     @       185.199.109.153
A     @       185.199.110.153
A     @       185.199.111.153
CNAME www     charlestonhacks.github.io
```

### 2. Update GitHub Settings

1. Go to repo Settings → Pages
2. Enter custom domain: `charlestonhacks.com`
3. Wait for DNS propagation (up to 24 hours)
4. Enable HTTPS (recommended)

### 3. Update Vite Config

```javascript
// app/vite.config.js
export default defineConfig({
  base: '/',  // Change from '/app/' to '/'
  // ...
});
```

### 4. Update OAuth Callbacks

In Supabase Dashboard → Authentication → URL Configuration:
- Add: `https://charlestonhacks.com/app/auth/callback`

---

## Alternative Hosting Platforms

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from /app directory
cd app
vercel

# Follow prompts, set output directory to: dist
```

**vercel.json** (optional):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    { "src": "/app/(.*)", "dest": "/app/$1" }
  ]
}
```

### Netlify

1. Go to [netlify.com](https://netlify.com)
2. Import from GitHub
3. Build settings:
   - Base directory: `app`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy

### Cloudflare Pages

```bash
# Install Wrangler CLI
npm i -g wrangler

# Deploy
cd app
wrangler pages publish dist --project-name=charlestonhacks
```

---

## CI/CD Pipeline

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd app
          npm ci

      - name: Run tests
        run: |
          cd app
          npm run test:run

      - name: Build
        run: |
          cd app
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/app
          destination_dir: app
```

This will:
1. Run on every push to `main`
2. Install dependencies
3. Run tests
4. Build production bundle
5. Deploy to GitHub Pages

---

## Performance Optimization

### Before Deployment

```bash
# Analyze bundle size
cd app
npm run build
npx vite-bundle-visualizer dist/app

# Check for large dependencies
npm run build -- --stats
```

### Optimization Tips

1. **Code Splitting**: React Router automatically splits routes
2. **Lazy Loading**: Use `React.lazy()` for large components
3. **Image Optimization**: Compress images before upload to Supabase
4. **CDN**: GitHub Pages uses CDN automatically

Example lazy loading:

```jsx
import { lazy, Suspense } from 'react';

const DirectorySearch = lazy(() => import('./components/DirectorySearch'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DirectorySearch />
    </Suspense>
  );
}
```

---

## Monitoring

### Check Deployment Status

```bash
# View GitHub Pages deployment
# Go to repo → Actions tab

# Check if site is live
curl -I https://charlestonhacks.github.io/app/
# Should return: HTTP/2 200
```

### Error Tracking

Add Sentry for error monitoring:

```bash
npm install @sentry/react
```

```jsx
// app/src/main.jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
});
```

### Analytics

Add Plausible or Google Analytics:

```html
<!-- In index.html -->
<script defer data-domain="charlestonhacks.github.io" src="https://plausible.io/js/script.js"></script>
```

---

## Rollback

If deployment breaks production:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or restore from backup
git reset --hard <previous-commit-sha>
git push --force origin main
```

---

## Supabase Production Setup

### Database Backups

1. Go to Supabase Dashboard → Database → Backups
2. Enable daily automatic backups
3. Download manual backup before major migrations

### Database Migrations

```bash
# Create migration file
touch app/db-migrations/$(date +%Y-%m-%d)-add-projects-table.sql

# Write SQL
# Test locally
# Deploy to production via Supabase SQL Editor
```

### Storage Bucket Limits

Free tier limits:
- 1GB storage
- 2GB bandwidth/month

Monitor usage: Supabase Dashboard → Storage → Usage

---

## Troubleshooting Deployments

### Build Fails

**Error**: `Module not found`
```bash
# Clear cache and rebuild
cd app
rm -rf node_modules dist
npm install
npm run build
```

**Error**: `Out of memory`
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Site Not Updating

1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check GitHub Pages status: Settings → Pages
3. Clear CDN cache (wait 5-10 minutes)

### OAuth Not Working

1. Check callback URLs in Supabase Dashboard
2. Verify URLs match:
   - Development: `http://localhost:3000/app/auth/callback`
   - Production: `https://charlestonhacks.github.io/app/auth/callback`

### 404 on Routes

GitHub Pages doesn't handle client-side routing automatically.

**Solution**: Add `404.html`:

```html
<!-- dist/app/404.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script>
      // Redirect to index.html with path in query param
      window.location.href = '/app/?redirect=' + encodeURIComponent(window.location.pathname);
    </script>
  </head>
  <body></body>
</html>
```

---

## Post-Deployment

After successful deployment:

- [ ] Test all routes (/, /directory, /profile, /profile/edit)
- [ ] Test OAuth login (LinkedIn, Facebook, Google)
- [ ] Test profile creation and editing
- [ ] Test directory search and filters
- [ ] Check mobile responsiveness
- [ ] Verify Supabase connection
- [ ] Monitor error logs
- [ ] Update CHANGELOG.md

---

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

---

## Questions?

Check:
1. This file for deployment steps
2. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
3. GitHub Actions logs for build errors
4. GitHub Discussions for deployment help
