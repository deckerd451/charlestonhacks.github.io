# Extending the System

This guide shows you how to add new features, components, and pages to the CharlestonHacks platform.

---

## Table of Contents

- [Adding New React Components](#adding-new-react-components)
- [Adding New Pages/Routes](#adding-new-pagesroutes)
- [Working with Supabase](#working-with-supabase)
- [Customizing the Theme](#customizing-the-theme)
- [Adding Database Tables](#adding-database-tables)
- [Building Forms](#building-forms)
- [State Management](#state-management)
- [Best Practices](#best-practices)

---

## Adding New React Components

### 1. Create Component File

```bash
cd app/src/components
touch MyNewComponent.jsx
```

### 2. Component Template

```jsx
// app/src/components/MyNewComponent.jsx
import { useState } from 'react';
import { Button, Card, Text } from '@mantine/core';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function MyNewComponent({ userId }) {
  const [count, setCount] = useState(0);

  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: ['myData', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
  });

  // Mutation
  const updateMutation = useMutation({
    mutationFn: async (newData) => {
      const { data, error } = await supabase
        .from('my_table')
        .update(newData)
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Text>Loading...</Text>;

  return (
    <Card shadow="sm" padding="lg">
      <Text>Count: {count}</Text>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </Card>
  );
}
```

### 3. Add Tests

```jsx
// app/src/components/__tests__/MyNewComponent.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyNewComponent } from '../MyNewComponent';

describe('MyNewComponent', () => {
  it('should render', () => {
    render(<MyNewComponent userId="123" />);
    expect(screen.getByText(/Count/)).toBeInTheDocument();
  });
});
```

### 4. Use in App

```jsx
// app/src/App.jsx
import { MyNewComponent } from './components/MyNewComponent';

// Add to route or page
<Route path="/my-page" element={<MyNewComponent userId={user?.id} />} />
```

---

## Adding New Pages/Routes

### 1. Create Page Component

```jsx
// app/src/components/MyPage.jsx
import { Container, Title, Text } from '@mantine/core';
import { MyNewComponent } from './MyNewComponent';

export function MyPage() {
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="md">My New Page</Title>
      <Text mb="lg">This is a new page in the app.</Text>
      <MyNewComponent />
    </Container>
  );
}
```

### 2. Add Route

```jsx
// app/src/App.jsx
import { MyPage } from './components/MyPage';

function AppContent() {
  return (
    <Routes>
      {/* Existing routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/directory" element={<DirectorySearch />} />

      {/* New route */}
      <Route path="/my-page" element={<MyPage />} />
    </Routes>
  );
}
```

### 3. Add Navigation Link

```jsx
// app/src/App.jsx - Navigation component
<div className="nav-links">
  <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
    Home
  </Link>
  <Link to="/my-page" className={location.pathname === '/my-page' ? 'active' : ''}>
    My Page
  </Link>
</div>
```

### 4. Protected Routes (Require Auth)

```jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) return <Text>Loading...</Text>;
  if (!user) return <Navigate to="/" replace />;

  return children;
}

// Usage
<Route
  path="/protected-page"
  element={
    <ProtectedRoute>
      <MyPage />
    </ProtectedRoute>
  }
/>
```

---

## Working with Supabase

### Queries (Read Data)

```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Simple query
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('community')
      .select('*');

    if (error) throw error;
    return data;
  },
});

// With filters
const { data: users } = useQuery({
  queryKey: ['users', skillFilter],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('community')
      .select('*')
      .contains('skills', [skillFilter])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  },
});

// With joins (foreign keys)
const { data: profiles } = useQuery({
  queryKey: ['profiles-with-endorsements'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('community')
      .select(`
        *,
        endorsements (
          skill,
          count
        )
      `);

    if (error) throw error;
    return data;
  },
});
```

### Mutations (Write Data)

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

const queryClient = useQueryClient();

// Insert
const createMutation = useMutation({
  mutationFn: async (newUser) => {
    const { data, error } = await supabase
      .from('community')
      .insert(newUser)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
    notifications.show({
      title: 'Success',
      message: 'User created',
      color: 'green',
    });
  },
  onError: (error) => {
    notifications.show({
      title: 'Error',
      message: error.message,
      color: 'red',
    });
  },
});

// Update
const updateMutation = useMutation({
  mutationFn: async ({ id, updates }) => {
    const { data, error } = await supabase
      .from('community')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
  },
});

// Upsert (insert or update)
const upsertMutation = useMutation({
  mutationFn: async (userData) => {
    const { data, error } = await supabase
      .from('community')
      .upsert(userData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
});

// Delete
const deleteMutation = useMutation({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from('community')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
});

// Usage in component
<Button onClick={() => createMutation.mutate({ name: 'Alice', email: 'alice@example.com' })}>
  Create User
</Button>
```

### File Uploads (Storage)

```javascript
import { useState } from 'react';
import { FileInput } from '@mantine/core';

function FileUploadExample() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('File URL:', data.publicUrl);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return (
    <FileInput
      label="Upload file"
      placeholder="Choose file"
      onChange={setFile}
      disabled={uploading}
    />
  );
}
```

### Real-Time Subscriptions

```javascript
import { useEffect, useState } from 'react';

function RealtimeExample() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Subscribe to changes
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Change received!', payload);
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <div>Messages: {messages.length}</div>;
}
```

---

## Customizing the Theme

### Editing Theme Configuration

```javascript
// app/src/theme/mantineTheme.js
export const mantineTheme = {
  // Change color scheme
  colorScheme: 'dark', // or 'light', 'auto'

  // Change primary color
  primaryColor: 'cyan', // or 'blue', 'red', 'green', etc.

  // Customize colors
  colors: {
    brand: [
      '#E3FAFC',
      '#C5F6FA',
      '#99E9F2',
      '#66D9E8',
      '#3BC9DB',
      '#22B8CF', // Base color (index 5)
      '#15AABF',
      '#1098AD',
      '#0C8599',
      '#0B7285',
    ],
  },

  // Change fonts
  fontFamily: 'Inter, sans-serif',

  // Change border radius
  defaultRadius: 'lg', // xs | sm | md | lg | xl

  // Component overrides
  components: {
    Button: {
      defaultProps: {
        radius: 'xl',
      },
      styles: (theme) => ({
        root: {
          fontWeight: 600,
        },
      }),
    },
  },
};
```

### Using Custom Colors

```jsx
import { Button, Badge } from '@mantine/core';

// Use theme colors
<Button color="brand">Brand Button</Button>
<Badge color="brand.6">Badge</Badge>

// Use custom hex
<Button color="#FF6B6B">Custom Color</Button>
```

### Dark/Light Mode Toggle

```jsx
import { useMantineColorScheme, Button } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <Button
      onClick={toggleColorScheme}
      leftIcon={colorScheme === 'dark' ? <IconSun /> : <IconMoon />}
    >
      {colorScheme === 'dark' ? 'Light' : 'Dark'} Mode
    </Button>
  );
}
```

---

## Adding Database Tables

### 1. Create Table in Supabase

```sql
-- In Supabase SQL Editor
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  skills TEXT[], -- Array of skills
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all projects
CREATE POLICY "Public projects are viewable by everyone"
  ON projects FOR SELECT
  USING (true);

-- Policy: Users can insert their own projects
CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2. Create TypeScript Interface (Optional)

```javascript
// app/src/types/project.js
/**
 * @typedef {Object} Project
 * @property {string} id - UUID
 * @property {string} user_id - Foreign key to auth.users
 * @property {string} title
 * @property {string} description
 * @property {string[]} skills
 * @property {string} created_at
 */
```

### 3. Create API Functions

```javascript
// app/src/api/projects.js
import { supabase } from '../lib/supabase';

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 4. Use in Components

```jsx
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../api/projects';

function ProjectList() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>{project.title}</div>
      ))}
    </div>
  );
}
```

---

## Building Forms

### Using Mantine Form Hook

```jsx
import { useForm } from '@mantine/form';
import { TextInput, Textarea, Button, Stack } from '@mantine/core';

function MyForm() {
  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      bio: '',
    },

    validate: {
      name: (value) => value.length < 2 ? 'Name too short' : null,
      email: (value) => /^\S+@\S+$/.test(value) ? null : 'Invalid email',
      bio: (value) => value.length > 500 ? 'Bio too long' : null,
    },
  });

  const handleSubmit = (values) => {
    console.log('Form values:', values);
    // Submit to API
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack spacing="md">
        <TextInput
          label="Name"
          placeholder="Your name"
          required
          {...form.getInputProps('name')}
        />

        <TextInput
          label="Email"
          placeholder="your@email.com"
          type="email"
          required
          {...form.getInputProps('email')}
        />

        <Textarea
          label="Bio"
          placeholder="Tell us about yourself"
          maxLength={500}
          {...form.getInputProps('bio')}
        />

        <Button type="submit">Submit</Button>
      </Stack>
    </form>
  );
}
```

### Form with File Upload

See `ProfileForm.jsx` for complete example with:
- Photo upload
- Preview
- Auto-delete old files
- Progress indicator
- Validation

---

## State Management

### Zustand Store (Client State)

Create a new store:

```javascript
// app/src/store/myStore.js
import { create } from 'zustand';

export const useMyStore = create((set, get) => ({
  // State
  count: 0,
  items: [],

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count + 1 })),

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  // Async action
  fetchItems: async () => {
    const response = await fetch('/api/items');
    const items = await response.json();
    set({ items });
  },

  // Computed value (getter)
  get total() {
    return get().items.reduce((sum, item) => sum + item.price, 0);
  },
}));
```

Use in components:

```jsx
import { useMyStore } from '../store/myStore';

function MyComponent() {
  const { count, increment, items } = useMyStore();

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={increment}>Increment</Button>
      <p>Items: {items.length}</p>
    </div>
  );
}
```

### React Query (Server State)

Already configured! Just use `useQuery` and `useMutation`. See [Working with Supabase](#working-with-supabase).

---

## Best Practices

### Component Organization

```
components/
├── MyFeature/
│   ├── MyFeature.jsx         # Main component
│   ├── MyFeatureCard.jsx     # Sub-component
│   ├── MyFeatureForm.jsx     # Form component
│   └── __tests__/
│       └── MyFeature.test.jsx
```

### Naming Conventions

- **Components**: PascalCase (`ProfileForm`, `UserCard`)
- **Hooks**: camelCase with `use` prefix (`useAuth`, `useProfile`)
- **Utilities**: camelCase (`formatDate`, `calculateScore`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_URL`)

### Code Style

```jsx
// ✅ Good: Named exports
export function MyComponent() { /* ... */ }

// ❌ Avoid: Default exports (harder to refactor)
export default function MyComponent() { /* ... */ }

// ✅ Good: Destructure props
function UserCard({ name, email }) { /* ... */ }

// ❌ Avoid: Props object
function UserCard(props) {
  return <div>{props.name}</div>;
}

// ✅ Good: Early returns
function MyComponent({ data }) {
  if (!data) return <div>No data</div>;
  return <div>{data.name}</div>;
}
```

### Error Handling

```jsx
import { notifications } from '@mantine/notifications';

// Always show user-friendly errors
try {
  await myMutation.mutate(data);
} catch (error) {
  notifications.show({
    title: 'Error',
    message: error.message || 'Something went wrong',
    color: 'red',
  });
}

// Use error boundaries for critical errors
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <MyComponent />
</ErrorBoundary>
```

### Performance

```jsx
// Use React.memo for expensive components
import { memo } from 'react';

export const UserCard = memo(function UserCard({ user }) {
  // Expensive rendering
  return <div>{user.name}</div>;
});

// Use useMemo for expensive calculations
import { useMemo } from 'react';

const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);

// Use useCallback for event handlers passed to children
import { useCallback } from 'react';

const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);
```

---

## Examples

### Complete Feature: Comments System

```jsx
// 1. Create table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  post_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

// 2. Create API
// app/src/api/comments.js
import { supabase } from '../lib/supabase';

export async function getComments(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, user:community(name, image_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createComment(comment) {
  const { data, error } = await supabase
    .from('comments')
    .insert(comment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. Create components
// app/src/components/CommentList.jsx
import { useQuery } from '@tanstack/react-query';
import { Stack, Text } from '@mantine/core';
import { getComments } from '../api/comments';

export function CommentList({ postId }) {
  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getComments(postId),
  });

  if (isLoading) return <Text>Loading...</Text>;

  return (
    <Stack spacing="sm">
      {comments.map(comment => (
        <div key={comment.id}>
          <Text weight={500}>{comment.user.name}</Text>
          <Text>{comment.content}</Text>
        </div>
      ))}
    </Stack>
  );
}

// app/src/components/CommentForm.jsx
import { useState } from 'react';
import { Textarea, Button } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment } from '../api/comments';
import { useAuthStore } from '../store/authStore';

export function CommentForm({ postId }) {
  const [content, setContent] = useState('');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', postId]);
      setContent('');
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createMutation.mutate({ post_id: postId, user_id: user.id, content });
    }}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
      />
      <Button type="submit" mt="sm">Post Comment</Button>
    </form>
  );
}
```

---

## Need Help?

- Check [CLAUDE.md](../CLAUDE.md) for AI-friendly patterns
- See [DATABASE.md](./DATABASE.md) for database details
- Review existing components for examples
- Ask in GitHub Discussions
