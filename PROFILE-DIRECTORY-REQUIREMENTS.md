# Profile & Directory System - Requirements Analysis

## Current State Analysis

### Two Database Tables (Inconsistent!)

**Table: `skills`** (Legacy - older system)
- `id` - UUID primary key
- `first_name`, `last_name` - Separate name fields
- `email` - Primary identifier
- `skills` - TEXT (comma-separated with proficiency: "react(Expert),node(Intermediate)")
- `image_url` - Supabase storage URL
- `Bio` - TEXT (capitalized column name!)
- `Availability` - TEXT (capitalized!)
- `endorsements` - JSONB object
- `created_at`, `inserted_at`, `updated_at` - Timestamps

**Table: `community`** (Newer - being used by 2card.html)
- `id` - UUID primary key
- `user_id` - References auth.users(id)
- `name` - Single name field
- `email` - Email
- `skills` - TEXT[] (Postgres array - clean)
- `interests` - TEXT[] (Postgres array)
- `bio` - lowercase
- `availability` - lowercase
- `image_url` - Supabase storage URL
- `newsletter_opt_in`, `newsletter_opt_in_at` - Newsletter tracking
- `endorsements` - JSONB
- `x`, `y` - Coordinates (for neural viz)
- `created_at` - Timestamp

### Current Features

#### Profile Creation/Edit
1. **Form Fields** (from profileForm.js and profile.js):
   - First Name + Last Name (skills table) OR Name (community table)
   - Email
   - Skills (comma-separated input)
   - Bio
   - Availability (dropdown/input)
   - Profile Photo (uploaded to Supabase Storage)
   - Proficiency Level per skill (Beginner/Intermediate/Expert)
   - Newsletter opt-in (community table only)

2. **Validation**:
   - Email format validation
   - Required: first_name, last_name, email, skills
   - Photo required (skills table) but optional (community table)

3. **Storage**:
   - **Skills table**: `hacksbucket` bucket
   - **Community table**: `avatars` bucket
   - Auto-deletes old photo when uploading new one
   - URL format: `{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}`

#### Directory/Search
1. **Search by Name** (search.js):
   - Searches first_name, last_name, or full name
   - Case-insensitive partial matching
   - Displays matching user cards

2. **Search by Skills** (teamsearch.js):
   - Comma-separated skill input
   - **Fuzzy matching**: Strips proficiency "(Expert)", does partial match
   - **ALL skills required** (AND logic, not OR)
   - Displays matching user cards

3. **User Card Display** (cardRenderer.js):
   - Photo
   - Name
   - Email
   - Role (if exists)
   - Availability
   - Bio
   - Skills as chips with endorsement counts
   - Endorse button per skill (+)

#### Endorsements
- Stored in separate `endorsements` table
- Structure: `{ endorsed_user_id, skill, count }`
- Aggregated per skill and displayed on cards
- Endorse button adds/increments count

---

## React System Requirements

### Unified Data Model

**Single Source of Truth**: Use `community` table exclusively (modern, better structure)

```typescript
interface UserProfile {
  // Identity
  id: string;                    // UUID
  user_id: string;               // auth.users FK
  name: string;                  // Full name
  email: string;

  // Professional
  skills: string[];              // Array: ["React", "Node.js"]
  interests: string[];           // Array: ["AI", "Web3"]
  bio: string;
  availability: string;          // "Full-time", "Part-time", "Weekends"

  // Media
  image_url: string;             // Supabase Storage URL

  // Metadata
  newsletter_opt_in: boolean;
  newsletter_opt_in_at: string | null;
  created_at: string;

  // Neural viz (keep for compatibility)
  x?: number;
  y?: number;

  // Computed (not in DB)
  endorsement_count?: number;    // Aggregated from endorsements table
}

interface Endorsement {
  id: string;
  endorsed_user_id: string;      // FK to community.id
  endorsed_by: string;           // FK to community.id
  skill: string;
  count: number;
  created_at: string;
}
```

### Profile Management Features

#### Create/Edit Profile Form
**UI Components** (Mantine):
- `TextInput` - Name, Email
- `Textarea` - Bio (with character count, max 500)
- `MultiSelect` - Skills (with autocomplete from existing skills)
- `MultiSelect` - Interests (with autocomplete)
- `Select` - Availability (dropdown: Full-time, Part-time, Weekends, Evenings, Flexible)
- `FileInput` - Profile photo (with preview, drag-drop, max 5MB)
- `Checkbox` - Newsletter opt-in
- `Button` - Save Profile

**Validation**:
- Name: Required, 2-50 chars
- Email: Required, valid format
- Skills: At least 1 skill required, max 20
- Bio: Optional, max 500 chars
- Photo: Optional, but recommended. Max 5MB, JPG/PNG/WebP
- Interests: Optional, max 10

**Behavior**:
- Auto-save draft to localStorage every 30s
- Show "Profile X% complete" progress indicator
- Upload photo to `avatars` bucket
- Delete old photo when uploading new
- Upsert to `community` table (based on user_id)

#### Profile Display (View Mode)
**UI Components**:
- `Avatar` - Large profile photo (150px) with fallback initials
- `Badge` - Availability status
- `Text` - Name (h1), Email (link), Bio
- `Group` - Skills as colored badges
- `Group` - Interests as outlined badges
- `ActionIcon` - Edit button (if own profile)

**Features**:
- View own profile at `/app/profile`
- View others at `/app/profile/:userId`
- "Edit Profile" button (own profile only)
- Skills show endorsement count on hover
- Click skill to search directory for that skill

### Directory/Search Features

#### Search Interface
**UI Components** (Mantine):
- `TextInput` - Search by name (with debounce, 300ms)
- `MultiSelect` - Filter by skills (autocomplete, multi-select)
- `Select` - Filter by availability
- `Switch` - "Match ALL skills" vs "Match ANY skills"
- `NumberInput` - Minimum endorsements (0-50)
- `Button` - Clear filters

**Search Logic**:
1. **Name Search**:
   - Full-text search in `name` field
   - Case-insensitive, partial match
   - Debounced to avoid excessive queries

2. **Skills Filter**:
   - **Match ALL** (AND): User must have ALL selected skills
   - **Match ANY** (OR): User must have ANY selected skill
   - Uses Postgres array operators: `@>` (contains all), `&&` (overlaps)

3. **Availability Filter**:
   - Exact match on availability field
   - "Any" option shows all

4. **Endorsements Filter**:
   - Aggregate endorsements, show users with >= N endorsements
   - Requires JOIN with endorsements table

**Query Example** (Supabase):
```javascript
let query = supabase
  .from('community')
  .select(`
    *,
    endorsement_count:endorsements(count)
  `);

// Name search
if (nameQuery) {
  query = query.ilike('name', `%${nameQuery}%`);
}

// Skills filter (ALL)
if (skills.length && matchAll) {
  query = query.contains('skills', skills);
}

// Skills filter (ANY)
if (skills.length && !matchAll) {
  query = query.overlaps('skills', skills);
}

// Availability
if (availability && availability !== 'any') {
  query = query.eq('availability', availability);
}

// Min endorsements (requires aggregation)
// Note: May need to fetch all and filter client-side, or use RPC
```

#### User Card Display
**UI Components** (Mantine):
- `Card` - User card container
- `Avatar` - Profile photo (80px)
- `Text` - Name (h3), Email (muted)
- `Badge` - Availability badge (color-coded)
- `Text` - Bio (truncated to 150 chars, "Read more" expands)
- `Group` - Skills as badges with endorsement count
- `Group` - Interests as outlined badges
- `Button` - "View Profile" (navigates to `/app/profile/:userId`)
- `Button` - "Endorse" (opens skill selection modal)

**Layout**:
- Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- Responsive using Mantine `Grid` or `SimpleGrid`
- Infinite scroll or pagination (20 per page)

**Endorsement Flow**:
1. Click "Endorse" button on card
2. Modal opens with user's skills as checkboxes
3. Select skill(s) to endorse (max 3 at once)
4. Submit → Inserts to `endorsements` table
5. Card updates with new count (optimistic UI)

#### Empty States
- No results: "No users match your search. Try different filters."
- No profiles yet: "Be the first to create a profile!"
- Loading: Mantine skeleton cards

### Advanced Features (Future)

#### Profile Completeness Score
```javascript
function calculateCompleteness(profile) {
  let score = 0;
  if (profile.name) score += 20;
  if (profile.email) score += 20;
  if (profile.image_url) score += 20;
  if (profile.bio && profile.bio.length > 50) score += 15;
  if (profile.skills?.length >= 3) score += 15;
  if (profile.interests?.length >= 2) score += 10;
  return score; // 0-100
}
```

Display as progress bar with suggestions to reach 100%.

#### Skill Autocomplete
- Fetch unique skills from all users: `SELECT DISTINCT unnest(skills) FROM community`
- Display as `MultiSelect` options
- Allow adding custom skills (not in list)

#### Availability Color Coding
```javascript
const availabilityColors = {
  'Full-time': 'green',
  'Part-time': 'blue',
  'Weekends': 'orange',
  'Evenings': 'purple',
  'Flexible': 'teal'
};
```

---

## Migration Strategy

### Phase 1: Data Consolidation
1. **Migrate `skills` table → `community` table**:
   ```sql
   INSERT INTO community (
     name, email, skills, bio, availability, image_url, created_at
   )
   SELECT
     CONCAT(first_name, ' ', last_name) as name,
     email,
     string_to_array(regexp_replace(skills, '\([^)]*\)', '', 'g'), ',') as skills,
     "Bio" as bio,
     "Availability" as availability,
     image_url,
     created_at
   FROM skills
   WHERE email NOT IN (SELECT email FROM community);
   ```

2. **Create user_id links** (for profiles without auth.users):
   - If user exists in auth.users: Link via email
   - If not: Create placeholder auth.users entry

### Phase 2: Build React Components
1. Profile form with Mantine UI
2. Profile view page
3. Directory search with filters
4. User cards grid

### Phase 3: Replace Legacy
1. Remove `skills` table references
2. Update `2card.html` to redirect to `/app/directory`
3. Deprecate old profile forms

---

## Mantine UI Component Mapping

### Profile Form
```jsx
import {
  TextInput,
  Textarea,
  MultiSelect,
  Select,
  FileInput,
  Checkbox,
  Button,
  Group,
  Stack
} from '@mantine/core';

<Stack spacing="md">
  <TextInput label="Name" required />
  <TextInput label="Email" type="email" required />
  <MultiSelect
    label="Skills"
    data={skillOptions}
    searchable
    creatable
    required
  />
  <MultiSelect
    label="Interests"
    data={interestOptions}
    searchable
    creatable
  />
  <Select
    label="Availability"
    data={['Full-time', 'Part-time', 'Weekends', 'Evenings', 'Flexible']}
  />
  <Textarea label="Bio" maxLength={500} />
  <FileInput label="Profile Photo" accept="image/*" />
  <Checkbox label="Subscribe to newsletter" />
  <Group position="right">
    <Button type="submit">Save Profile</Button>
  </Group>
</Stack>
```

### Directory Search
```jsx
import { TextInput, MultiSelect, Select, Switch, Button } from '@mantine/core';

<Stack>
  <TextInput
    icon={<IconSearch />}
    placeholder="Search by name..."
  />
  <MultiSelect
    label="Skills"
    data={allSkills}
    searchable
  />
  <Select
    label="Availability"
    data={['Any', 'Full-time', 'Part-time', 'Weekends']}
  />
  <Switch
    label="Match ALL skills (instead of ANY)"
  />
  <Button variant="subtle" onClick={clearFilters}>Clear Filters</Button>
</Stack>
```

### User Card
```jsx
import { Card, Avatar, Text, Badge, Group, Button } from '@mantine/core';

<Card shadow="sm" padding="lg">
  <Avatar src={user.image_url} size={80} radius="xl" />
  <Text size="xl" weight={500}>{user.name}</Text>
  <Text size="sm" color="dimmed">{user.email}</Text>
  <Badge color={availabilityColors[user.availability]}>
    {user.availability}
  </Badge>
  <Text size="sm" lineClamp={3}>{user.bio}</Text>
  <Group spacing="xs">
    {user.skills.map(skill => (
      <Badge key={skill} variant="outline">{skill}</Badge>
    ))}
  </Group>
  <Group mt="md">
    <Button variant="light">View Profile</Button>
    <Button variant="subtle">Endorse</Button>
  </Group>
</Card>
```

---

## Summary

### Core Requirements
1. **Unified Data Model**: Use `community` table
2. **Profile Management**: Create, view, edit with Mantine forms
3. **Directory Search**: Name + skills + availability filters
4. **User Cards**: Compact display with skills, endorsements, actions
5. **Endorsements**: Simple +1 per skill, displayed on cards

### Key Decisions
- **UI Library**: Mantine (clean, accessible, well-documented)
- **Data Source**: `community` table (modern, Postgres arrays)
- **Search Strategy**: Supabase queries with filters (no Algolia needed yet)
- **File Storage**: `avatars` bucket in Supabase Storage
- **State**: React Query for server state, Zustand for client state

### Next Steps
1. Install Mantine + dependencies
2. Build ProfileForm component
3. Build ProfileView component
4. Build DirectorySearch component
5. Build UserCard component
6. Connect to Supabase with React Query
7. Test & deploy
