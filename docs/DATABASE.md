# Database Guide

Complete reference for the CharlestonHacks database schema, queries, and best practices.

---

## Overview

**Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
**URL**: `https://hvmotpzhliufzomewzfl.supabase.co`

---

## Schema

### `community` Table (PRIMARY)

User profiles and directory listings.

```sql
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
```

**Columns**:
- `id` - UUID primary key
- `user_id` - Foreign key to `auth.users` (Supabase auth)
- `name` - Full name (e.g., "Alice Johnson")
- `email` - Email address (unique)
- `skills` - Array of skill strings (e.g., `["React", "Node.js", "Python"]`)
- `interests` - Array of interest strings (e.g., `["AI", "Web3", "Design"]`)
- `bio` - Profile bio (max 500 chars)
- `availability` - "Full-time", "Part-time", "Weekends", "Evenings", "Flexible"
- `image_url` - Profile photo URL (Supabase Storage)
- `newsletter_opt_in` - Newsletter subscription flag
- `newsletter_opt_in_at` - When user opted in
- `x`, `y` - Coordinates for neural network visualization
- `created_at` - Timestamp

**Row Level Security** (RLS):
```sql
-- Anyone can view profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON community FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON community FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON community FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### `endorsements` Table

Skill endorsements between users.

```sql
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorsed_user_id UUID REFERENCES community(id) ON DELETE CASCADE,
  endorsed_by UUID REFERENCES community(id) ON DELETE CASCADE,
  skill VARCHAR(100) NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(endorsed_user_id, endorsed_by, skill)
);
```

**Columns**:
- `id` - UUID primary key
- `endorsed_user_id` - Who received the endorsement
- `endorsed_by` - Who gave the endorsement
- `skill` - The skill being endorsed (e.g., "React")
- `count` - Number of endorsements (default 1)
- `created_at` - Timestamp

**Constraints**:
- `UNIQUE(endorsed_user_id, endorsed_by, skill)` - Prevents duplicate endorsements

**RLS Policies**:
```sql
-- Anyone can view endorsements
CREATE POLICY "Endorsements are viewable by everyone"
  ON endorsements FOR SELECT
  USING (true);

-- Authenticated users can insert endorsements
CREATE POLICY "Users can insert endorsements"
  ON endorsements FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM community WHERE id = endorsed_by));
```

---

### `connections` Table

Mutual connections between users.

```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES community(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES community(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Columns**:
- `from_user_id` - User who sent connection request
- `to_user_id` - User who received request
- `status` - "pending", "accepted", "rejected"

---

### `skills` Table (DEPRECATED)

Legacy skills table. Do not use for new features.

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(255) UNIQUE,
  skills TEXT,  -- Comma-separated with proficiency
  "Bio" TEXT,
  "Availability" TEXT,
  image_url TEXT,
  endorsements JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Migration**: See [PROFILE-DIRECTORY-REQUIREMENTS.md](../PROFILE-DIRECTORY-REQUIREMENTS.md) for migration SQL.

---

## Database Functions

### `get_all_skills()`

Returns array of unique skills from all users.

```sql
CREATE OR REPLACE FUNCTION get_all_skills()
RETURNS TEXT[] AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest(skills)
    FROM community
    WHERE skills IS NOT NULL
    ORDER BY 1
  );
$$ LANGUAGE SQL STABLE;
```

**Usage**:
```javascript
const { data, error } = await supabase.rpc('get_all_skills');
// Returns: ["React", "Node.js", "Python", ...]
```

### `get_all_interests()`

Returns array of unique interests from all users.

```sql
CREATE OR REPLACE FUNCTION get_all_interests()
RETURNS TEXT[] AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest(interests)
    FROM community
    WHERE interests IS NOT NULL
    ORDER BY 1
  );
$$ LANGUAGE SQL STABLE;
```

---

## Common Queries

### Fetch All Profiles

```javascript
const { data: users, error } = await supabase
  .from('community')
  .select('*')
  .order('created_at', { ascending: false });
```

### Search by Name

```javascript
const { data, error } = await supabase
  .from('community')
  .select('*')
  .ilike('name', `%${searchQuery}%`);
```

### Filter by Skills (Match ANY)

```javascript
const { data, error } = await supabase
  .from('community')
  .select('*')
  .overlaps('skills', ['React', 'Node.js']);
```

### Filter by Skills (Match ALL)

```javascript
const { data, error } = await supabase
  .from('community')
  .select('*')
  .contains('skills', ['React', 'Node.js']);
```

### Get Profile with Endorsements

```javascript
const { data, error } = await supabase
  .from('community')
  .select(`
    *,
    endorsements (
      skill,
      count,
      endorsed_by
    )
  `)
  .eq('id', userId)
  .single();
```

### Create Profile

```javascript
const { data, error } = await supabase
  .from('community')
  .insert({
    user_id: user.id,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    skills: ['React', 'Node.js'],
    interests: ['AI', 'Web3'],
    bio: 'Full-stack developer passionate about AI',
    availability: 'Full-time',
  })
  .select()
  .single();
```

### Update Profile

```javascript
const { data, error } = await supabase
  .from('community')
  .update({
    bio: 'Updated bio',
    skills: ['React', 'TypeScript', 'GraphQL'],
  })
  .eq('user_id', user.id)
  .select()
  .single();
```

### Upsert Profile (Insert or Update)

```javascript
const { data, error } = await supabase
  .from('community')
  .upsert(
    {
      user_id: user.id,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      skills: ['React'],
    },
    { onConflict: 'user_id' }
  )
  .select()
  .single();
```

### Add Endorsement

```javascript
const { data, error } = await supabase
  .from('endorsements')
  .insert({
    endorsed_user_id: targetUserId,
    endorsed_by: currentUserId,
    skill: 'React',
    count: 1,
  })
  .select()
  .single();
```

### Get Endorsement Counts

```javascript
const { data, error } = await supabase
  .from('endorsements')
  .select('skill, count')
  .eq('endorsed_user_id', userId);

// Group by skill
const endorsementMap = data.reduce((acc, e) => {
  acc[e.skill] = (acc[e.skill] || 0) + e.count;
  return acc;
}, {});
```

---

## Storage Buckets

### `avatars` Bucket

Profile photos (public access).

**Upload Photo**:
```javascript
const fileName = `${userId}-${Date.now()}.jpg`;
const { error } = await supabase.storage
  .from('avatars')
  .upload(fileName, file);
```

**Get Public URL**:
```javascript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(fileName);

console.log(data.publicUrl);
```

**Delete Photo**:
```javascript
const { error } = await supabase.storage
  .from('avatars')
  .remove([fileName]);
```

**Storage Policies**:
```sql
-- Anyone can view avatars
CREATE POLICY "Public avatars are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

-- Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Realtime Subscriptions

Subscribe to database changes in real-time.

### Listen to New Profiles

```javascript
const subscription = supabase
  .channel('community-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'community',
    },
    (payload) => {
      console.log('New profile created:', payload.new);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

### Listen to Endorsements

```javascript
const subscription = supabase
  .channel('endorsements')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'endorsements',
      filter: `endorsed_user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Endorsement change:', payload);
    }
  )
  .subscribe();
```

---

## Performance Tips

### Use Indexes

```sql
-- Index on skills for faster array queries
CREATE INDEX idx_community_skills ON community USING GIN (skills);

-- Index on user_id for faster joins
CREATE INDEX idx_community_user_id ON community (user_id);

-- Index on email for faster lookups
CREATE INDEX idx_community_email ON community (email);
```

### Limit Results

```javascript
const { data, error } = await supabase
  .from('community')
  .select('*')
  .limit(20); // Only fetch 20 results
```

### Paginate Results

```javascript
const PAGE_SIZE = 20;
const page = 0;

const { data, error } = await supabase
  .from('community')
  .select('*')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### Select Specific Columns

```javascript
// Don't fetch unnecessary data
const { data, error } = await supabase
  .from('community')
  .select('id, name, email, skills')
  .limit(100);
```

---

## Migrations

### Creating New Tables

1. Write SQL in Supabase SQL Editor
2. Save to `app/db-migrations/YYYY-MM-DD-migration-name.sql`
3. Document in this file

### Modifying Existing Tables

```sql
-- Add column
ALTER TABLE community ADD COLUMN headline VARCHAR(200);

-- Modify column
ALTER TABLE community ALTER COLUMN bio TYPE VARCHAR(1000);

-- Drop column
ALTER TABLE community DROP COLUMN IF EXISTS old_column;
```

### Data Migrations

```sql
-- Migrate data from skills to community table
INSERT INTO community (name, email, skills, bio, availability, image_url, created_at)
SELECT
  CONCAT(first_name, ' ', last_name) as name,
  email,
  string_to_array(regexp_replace(skills, '\\([^)]*\\)', '', 'g'), ',') as skills,
  "Bio" as bio,
  "Availability" as availability,
  image_url,
  created_at
FROM skills
WHERE email NOT IN (SELECT email FROM community);
```

---

## Backup & Restore

### Backup

```bash
# From Supabase Dashboard: Settings → Database → Backups
# Enable automatic daily backups
```

### Restore

```sql
-- Download backup from Supabase
-- Import using psql or Supabase SQL Editor
```

---

## Security Best Practices

### Row Level Security (RLS)

Always enable RLS on new tables:

```sql
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;
```

### Prevent SQL Injection

Use parameterized queries:

```javascript
// ❌ BAD - SQL injection risk
const { data } = await supabase
  .from('community')
  .select('*')
  .eq('name', userInput);

// ✅ GOOD - Supabase handles escaping
const { data } = await supabase
  .from('community')
  .select('*')
  .eq('name', userInput);
```

### Validate Data

Always validate user input before inserting:

```javascript
if (!email.match(/^\S+@\S+\.\S+$/)) {
  throw new Error('Invalid email');
}

if (skills.length > 20) {
  throw new Error('Too many skills');
}
```

---

## Debugging Queries

### Enable Query Logging

```javascript
// In browser console
localStorage.setItem('supabase.debug', 'true');
```

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Database → Query Performance
3. View slow queries and errors

### Test Queries Directly

```javascript
// In browser console
const { data, error } = await window.__dexSupabase
  .from('community')
  .select('*')
  .limit(1);

console.log(data, error);
```

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Array Functions](https://www.postgresql.org/docs/current/functions-array.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## Questions?

Check:
1. This file for schema reference
2. [EXTENDING.md](./EXTENDING.md) for query examples
3. Supabase Dashboard for live data
4. GitHub Issues for known database issues
