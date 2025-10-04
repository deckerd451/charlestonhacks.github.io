# Troubleshooting Guide

Common issues and solutions for the CharlestonHacks platform.

---

## Table of Contents

- [Development Issues](#development-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Build & Deployment Issues](#build--deployment-issues)
- [Performance Issues](#performance-issues)

---

## Development Issues

### Dev Server Won't Start

**Error**: `Error: Cannot find module 'vite'`

**Solution**:
```bash
cd app
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

**Error**: `Port 3000 already in use`

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- --port 3001
```

---

### Hot Reload Not Working

**Problem**: Changes not reflecting in browser

**Solutions**:

1. **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. **Check file watchers** (macOS/Linux):
```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

3. **Restart dev server**: `Ctrl+C`, then `npm run dev`

---

### Import Errors

**Error**: `Module not found: Can't resolve './components/MyComponent'`

**Solutions**:

1. **Check file extension**: Import must include `.jsx`
```javascript
// ❌ Wrong
import { MyComponent } from './components/MyComponent';

// ✅ Correct
import { MyComponent } from './components/MyComponent.jsx';
```

2. **Check file path**: Paths are case-sensitive
```javascript
// If file is ProfileForm.jsx (capital P)
import { ProfileForm } from './components/ProfileForm.jsx'; // ✅
import { ProfileForm } from './components/profileForm.jsx'; // ❌
```

3. **Check named vs default exports**:
```javascript
// If component uses named export:
export function MyComponent() { }

// Import with curly braces:
import { MyComponent } from './MyComponent.jsx'; // ✅
```

---

### Mantine Components Not Styled

**Problem**: Mantine components have no styles

**Solution**: Check CSS imports in `App.jsx`:
```javascript
// Must import Mantine CSS before App.css
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import './App.css';
```

---

## Database Issues

### "Permission Denied" Errors

**Error**: `permission denied for table community`

**Cause**: Row Level Security (RLS) blocking query

**Solutions**:

1. **Check if user is authenticated**:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user); // Should not be null
```

2. **Verify RLS policies**:
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'community';
```

3. **Bypass RLS for testing** (dangerous, only in dev):
```sql
ALTER TABLE community DISABLE ROW LEVEL SECURITY;
```

---

### "Duplicate Key Violation"

**Error**: `duplicate key value violates unique constraint "community_email_key"`

**Cause**: Trying to insert a profile with existing email

**Solution**: Use upsert instead of insert:
```javascript
const { data, error } = await supabase
  .from('community')
  .upsert(profileData, { onConflict: 'email' }) // or 'user_id'
  .select()
  .single();
```

---

### Queries Return Empty Results

**Problem**: Query returns `[]` but data exists

**Debugging**:

1. **Test in Supabase Dashboard**:
   - Go to Table Editor
   - Run manual query
   - Check if data exists

2. **Check filters**:
```javascript
// Debug: log the query
const query = supabase.from('community').select('*');
console.log('Query:', query);

// Check if filters are correct
const { data, error } = await query.eq('id', userId);
console.log('Results:', data, 'Error:', error);
```

3. **Check RLS policies** (see above)

---

### Array Queries Not Working

**Problem**: Skills filter returns no results

**Solution**: Use correct Postgres array operators:

```javascript
// Match ANY (user has at least one skill)
.overlaps('skills', ['React', 'Node.js'])

// Match ALL (user has all skills)
.contains('skills', ['React', 'Node.js'])

// ❌ Wrong: This doesn't work with arrays
.eq('skills', ['React', 'Node.js'])
```

---

## Authentication Issues

### OAuth Login Redirects to Error

**Error**: `OAuth flow failed`

**Solutions**:

1. **Check callback URL** in Supabase Dashboard → Authentication → URL Configuration:
   - Development: `http://localhost:3000/app/auth/callback`
   - Production: `https://charlestonhacks.github.io/app/auth/callback`

2. **Check provider credentials**:
   - LinkedIn: Client ID and Secret correct?
   - Facebook: App ID and Secret correct?
   - Google: Client ID and Secret correct?

3. **Check provider settings**:
   - LinkedIn: Redirect URLs match?
   - Facebook: App in development mode?

---

### User Not Persisting After Refresh

**Problem**: User logs out after page refresh

**Solutions**:

1. **Check storage key** in `app/src/lib/supabase.js`:
```javascript
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,  // Must be true
    storageKey: 'sb-hvmotpzhliufzomewzfl-auth-token', // Must match
  },
});
```

2. **Check localStorage** in browser console:
```javascript
// Should have auth token
localStorage.getItem('sb-hvmotpzhliufzomewzfl-auth-token');
```

3. **Clear auth state and re-login**:
```javascript
localStorage.clear();
window.location.reload();
```

---

### "User Already Registered"

**Error**: Cannot sign up, email already exists

**Solution**: Use sign in instead of sign up, or reset password:

```javascript
// Reset password
const { error } = await supabase.auth.resetPasswordForEmail(
  email,
  { redirectTo: `${window.location.origin}/app/auth/callback` }
);
```

---

## Build & Deployment Issues

### Build Fails with "Out of Memory"

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node.js memory limit
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

### Build Succeeds but Site Shows Blank Page

**Problem**: Production build shows blank page

**Debugging**:

1. **Check browser console**: Look for errors

2. **Test production build locally**:
```bash
npm run preview
```

3. **Check base path** in `vite.config.js`:
```javascript
export default defineConfig({
  base: '/app/',  // Must match GitHub Pages path
});
```

4. **Check index.html paths**:
```html
<!-- Should be absolute paths -->
<script type="module" src="/app/src/main.jsx"></script>
```

---

### 404 Errors on Route Refresh

**Problem**: Refreshing `/app/directory` shows 404

**Cause**: GitHub Pages doesn't handle client-side routing

**Solution**: Add `404.html` (see [DEPLOYMENT.md](./DEPLOYMENT.md#404-on-routes))

---

### CSS Not Loading in Production

**Problem**: Styles work in dev but not production

**Solutions**:

1. **Check CSS imports** in `App.jsx`:
```javascript
// Import CSS before components
import '@mantine/core/styles.css';
import './App.css';
```

2. **Check build output**:
```bash
# CSS should be in dist/app/assets/*.css
ls dist/app/assets/
```

3. **Hard refresh**: `Ctrl+Shift+R`

---

## Performance Issues

### Slow Page Load

**Debugging**:

1. **Check bundle size**:
```bash
npm run build
du -sh dist/app
# Should be < 5MB
```

2. **Analyze bundle**:
```bash
npx vite-bundle-visualizer dist/app
```

3. **Check network requests** in Chrome DevTools → Network tab

**Solutions**:

- **Lazy load routes**:
```jsx
import { lazy } from 'react';

const DirectorySearch = lazy(() => import('./components/DirectorySearch'));
```

- **Optimize images**: Compress before uploading to Supabase
- **Code splitting**: Vite does this automatically

---

### Slow Database Queries

**Problem**: Directory search takes 5+ seconds

**Solutions**:

1. **Add indexes**:
```sql
CREATE INDEX idx_community_skills ON community USING GIN (skills);
CREATE INDEX idx_community_name ON community (name);
```

2. **Limit results**:
```javascript
.limit(20)  // Only fetch 20 results
```

3. **Use pagination** instead of fetching all data

4. **Select only needed columns**:
```javascript
// ❌ Slow: fetches all columns
.select('*')

// ✅ Fast: only fetch what you need
.select('id, name, email, skills')
```

---

### Memory Leaks

**Problem**: Browser tab uses 500MB+ RAM

**Debugging**:

1. **Chrome DevTools** → Memory → Take Heap Snapshot
2. Look for detached DOM nodes
3. Check for uncleaned subscriptions

**Solutions**:

- **Clean up subscriptions**:
```javascript
useEffect(() => {
  const subscription = supabase
    .channel('my-channel')
    .on('postgres_changes', { }, () => {})
    .subscribe();

  // Cleanup on unmount
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

- **Clean up event listeners**:
```javascript
useEffect(() => {
  const handler = () => { };
  window.addEventListener('resize', handler);

  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);
```

---

## Testing Issues

### Tests Failing After Component Changes

**Problem**: Tests pass locally but fail in CI

**Solutions**:

1. **Clear test cache**:
```bash
npm run test -- --no-cache
```

2. **Update snapshots**:
```bash
npm test -- -u
```

3. **Check test environment**:
```javascript
// app/src/test/setup.js
import '@testing-library/jest-dom';
```

---

### "ReferenceError: window is not defined"

**Problem**: Tests fail with window/document errors

**Solution**: Use jsdom environment (already configured):

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    environment: 'jsdom',  // Simulates browser
  },
});
```

---

## Storage Issues

### File Upload Fails

**Error**: `storage/unauthorized`

**Solutions**:

1. **Check storage policies**:
```sql
-- View policies
SELECT * FROM storage.policies WHERE bucket_id = 'avatars';
```

2. **Check bucket is public**:
   - Supabase Dashboard → Storage → avatars → Settings
   - Set "Public bucket" to ON

3. **Check file size** (max 5MB):
```javascript
if (file.size > 5 * 1024 * 1024) {
  throw new Error('File too large');
}
```

---

### Image Not Displaying

**Problem**: `image_url` saved but image doesn't show

**Solutions**:

1. **Check URL format**:
```javascript
// Should look like:
// https://PROJECT.supabase.co/storage/v1/object/public/avatars/filename.jpg

const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(fileName);

console.log(data.publicUrl);
```

2. **Check CORS** (should work by default on Supabase)

3. **Check file actually uploaded**:
   - Supabase Dashboard → Storage → avatars
   - See if file exists

---

## Still Having Issues?

### Get Help

1. **Check documentation**:
   - [GETTING-STARTED.md](./GETTING-STARTED.md)
   - [EXTENDING.md](./EXTENDING.md)
   - [DATABASE.md](./DATABASE.md)

2. **Search GitHub Issues**:
   - [CharlestonHacks Issues](https://github.com/charlestonhacks/charlestonhacks.github.io/issues)
   - Someone may have had the same problem

3. **Create an Issue**:
   - Include error message
   - Include steps to reproduce
   - Include browser/OS info

4. **Ask in Discussions**:
   - [GitHub Discussions](https://github.com/charlestonhacks/charlestonhacks.github.io/discussions)

### Debug Checklist

When reporting issues, include:

- [ ] Error message (exact text)
- [ ] Browser console logs
- [ ] Network tab (for API errors)
- [ ] Steps to reproduce
- [ ] Expected vs actual behavior
- [ ] Browser and OS version
- [ ] Node.js version (`node --version`)
- [ ] npm version (`npm --version`)

---

## Useful Debug Commands

```bash
# Check Node/npm versions
node --version
npm --version

# Clear all caches
rm -rf node_modules dist .vite
npm install

# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit

# Check bundle size
npm run build && ls -lh dist/app

# Test production build
npm run preview

# Run tests with coverage
npm run test:run -- --coverage
```

---

## Browser DevTools Tips

### Console

```javascript
// Access Supabase client
window.__dexSupabase

// Check auth state
await window.__dexSupabase.auth.getSession()

// Manually query database
const { data } = await window.__dexSupabase.from('community').select('*').limit(1)
```

### Network Tab

- Filter by "Fetch/XHR" to see API calls
- Check request/response payloads
- Look for 400/500 errors

### React DevTools

- Install React DevTools extension
- Inspect component tree
- Check props and state
- Profile performance

---

**Still stuck? Open a GitHub Issue with debug details!**
