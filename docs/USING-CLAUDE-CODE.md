# Using Claude Code with CharlestonHacks

This guide shows you how to effectively use Claude Code (AI-assisted development) with the CharlestonHacks codebase.

---

## What is Claude Code?

Claude Code is an AI-powered coding assistant that can:
- Read and understand your entire codebase
- Write new features and components
- Fix bugs and refactor code
- Run tests and debug issues
- Update documentation

**Website**: [claude.ai/code](https://claude.ai/code)

---

## Getting Started with Claude Code

### 1. Open the Project

```bash
# In your terminal
cd charlestonhacks.github.io
claude-code
```

This opens Claude Code with full access to your repository.

### 2. Important Files for AI

Claude Code automatically reads these files to understand the project:

- **[CLAUDE.md](../CLAUDE.md)** - Main AI-friendly documentation
- **[README.md](../README.md)** - Project overview
- **[PROFILE-DIRECTORY-REQUIREMENTS.md](../PROFILE-DIRECTORY-REQUIREMENTS.md)** - Feature specs
- **[TODO.md](../TODO.md)** - Task list
- **[MIGRATION-PLAN-V2.md](../MIGRATION-PLAN-V2.md)** - Migration strategy

### 3. Your First AI Task

Try asking Claude:

```
"Read CLAUDE.md and create a new component called EventCard that displays event information with Mantine UI"
```

Claude will:
1. Read CLAUDE.md to understand the architecture
2. Read existing components to match the style
3. Create `EventCard.jsx` with proper imports
4. Create a test file
5. Show you how to use it

---

## Effective Prompts

### ✅ Good Prompts (Specific, Contextual)

**Building Features**:
```
"Create a new React component for displaying project proposals. Use Mantine Card, show title, description, skills needed, and a 'Join Project' button. Follow the pattern used in UserCard.jsx"
```

**Fixing Bugs**:
```
"The profile photo upload is failing with a 401 error. Check the Supabase storage policies in db-functions.sql and fix the issue"
```

**Adding Tests**:
```
"Add tests for DirectorySearch component covering: rendering, search by name, filter by skills, and empty states"
```

**Documentation**:
```
"Update CLAUDE.md to include information about the new projects feature and how to query the projects table"
```

### ❌ Bad Prompts (Vague, No Context)

```
"Make a component"
"Fix the bug"
"Add tests"
"Update docs"
```

---

## Best Practices

### 1. Reference Existing Code

When asking Claude to build something new, reference similar existing code:

```
"Create a ProjectForm component similar to ProfileForm.jsx but for creating projects. Include fields for: title, description, skills_needed (MultiSelect), and team_size (NumberInput)"
```

This ensures:
- ✅ Consistent code style
- ✅ Correct imports and patterns
- ✅ Proper error handling
- ✅ Tests that match existing structure

### 2. Ask for Explanations

Don't just accept code blindly:

```
"Explain how the Jaccard similarity algorithm works in matchEngine.js. Then show me how to modify it to also consider user interests, not just skills"
```

Claude will:
1. Explain the current implementation
2. Show you the changes
3. Update tests
4. Document the new behavior

### 3. Iterative Refinement

Start broad, then refine:

**First**:
```
"Create a basic comments system for profiles"
```

**Then**:
```
"Add real-time updates using Supabase subscriptions"
```

**Finally**:
```
"Add comment editing and deletion with optimistic UI updates"
```

### 4. Request Documentation

Always ask Claude to document new features:

```
"After creating the projects feature, update CLAUDE.md and EXTENDING.md with examples of how to use the new API functions"
```

---

## Common Tasks with Claude Code

### Adding a New Feature

**Prompt**:
```
"I want to add a 'Projects' feature where users can post project ideas and recruit team members. Here's what I need:

1. Database table with: title, description, user_id, skills_needed[], team_size, status
2. CRUD API functions in app/src/api/projects.js
3. ProjectForm component (create new project)
4. ProjectList component (browse projects)
5. ProjectCard component (display single project)
6. Add routes to App.jsx
7. Update CLAUDE.md

Follow the patterns used in the profile/directory system. Use Mantine UI and React Query."
```

Claude will create all of this, following your existing patterns!

### Debugging Issues

**Prompt**:
```
"The DirectorySearch component shows 'No users found' even when there are users in the database. Debug this issue by:

1. Checking the Supabase query in DirectorySearch.jsx
2. Verifying RLS policies
3. Testing with sample data
4. Showing me the fix with explanation"
```

### Refactoring Code

**Prompt**:
```
"The UserCard component has become too complex. Refactor it to:

1. Extract endorsement logic into a custom hook (useEndorsements)
2. Create a separate SkillBadge component
3. Move avatar logic to a reusable Avatar component
4. Keep the same functionality but improve code organization"
```

### Writing Tests

**Prompt**:
```
"Write comprehensive tests for ProfileForm component including:

- Rendering with and without existing profile
- Form validation (all fields)
- Photo upload (success and error cases)
- Save mutation (success and error)
- Profile completeness calculation
- Auto-save to localStorage

Use Vitest and React Testing Library. Follow patterns in existing test files."
```

### Updating Documentation

**Prompt**:
```
"I just added a notifications feature. Update the following docs:

1. CLAUDE.md - Add notification patterns and examples
2. EXTENDING.md - Show how to create notifications
3. README.md - Add to features list
4. GETTING-STARTED.md - Mention notifications setup"
```

---

## Understanding Claude's Process

When you give Claude a task, it typically:

### 1. Research Phase
- Reads CLAUDE.md for architecture
- Checks existing similar code
- Reviews database schema
- Understands dependencies

### 2. Planning Phase
- Outlines the approach
- Identifies files to create/modify
- Plans tests and documentation

### 3. Implementation Phase
- Creates new files
- Modifies existing files
- Adds tests
- Updates documentation

### 4. Verification Phase
- Runs tests
- Checks for errors
- Suggests improvements

You can ask Claude to show its reasoning:

```
"Before implementing the projects feature, explain your plan and ask me for feedback"
```

---

## Advanced Techniques

### Multi-Step Tasks

For complex features, break into steps:

```
"Let's build an event management system in phases:

Phase 1: Create database tables and RLS policies
Phase 2: Build API functions
Phase 3: Create UI components
Phase 4: Add real-time updates
Phase 5: Write tests
Phase 6: Update documentation

Start with Phase 1 and wait for my approval before continuing."
```

### Code Review

Ask Claude to review code:

```
"Review the ProfileForm component for:
- Security issues
- Performance problems
- Accessibility concerns
- Code style consistency
- Missing error handling

Provide specific suggestions with code examples."
```

### Migration Help

Claude can help migrate legacy code:

```
"Read the legacy teamsearch.js file and migrate it to a React component called TeamSearch.jsx using:
- Mantine UI (MultiSelect for skills)
- React Query for data fetching
- The same Jaccard matching algorithm
- Modern React patterns

Preserve all functionality but improve code quality."
```

---

## Project-Specific Context

### Key Files Claude Should Read

When starting a new task, tell Claude:

```
"Read CLAUDE.md, PROFILE-DIRECTORY-REQUIREMENTS.md, and the existing ProfileForm.jsx component. Then create a similar form for creating events."
```

### Database Access

Claude can query the database:

```
"Check the community table structure in Supabase and show me the first 3 profiles to understand the data format"
```

### Testing Against Real Data

```
"Run the dev server, create a test profile, and verify the directory search is working correctly"
```

---

## Troubleshooting Claude Code

### If Claude Doesn't Have Context

**Problem**: Claude creates code that doesn't match your patterns

**Solution**:
```
"First read CLAUDE.md to understand our architecture, then read ProfileForm.jsx to see our form patterns, then create the EventForm component"
```

### If Claude's Code Has Errors

**Problem**: Generated code has bugs

**Solution**:
```
"The code you generated has an error on line 45: 'Cannot read property map of undefined'. Debug this and explain the fix"
```

### If You Want Different Approach

**Problem**: You don't like Claude's solution

**Solution**:
```
"I don't like using a modal here. Instead, create a dedicated route at /projects/new with a full-page form"
```

---

## Tips for Maximum Productivity

### 1. Keep Context Focused

Don't overload Claude with information. Focus on:
- The specific task
- Relevant existing code
- Expected outcome

### 2. Verify AI-Generated Code

Always:
- Read the code Claude writes
- Run tests
- Test in browser
- Ask questions if something is unclear

### 3. Maintain Documentation

After Claude adds features:
```
"Update TODO.md to mark the projects feature as complete and add next steps"
```

### 4. Learn from Claude

```
"Explain the React Query caching strategy you used in this component and why it's better than my original approach"
```

---

## Example Session

Here's a complete session building a new feature:

**You**:
```
"Read CLAUDE.md and help me add a skill endorsement modal. When users click 'Endorse' on a UserCard, show a modal with that user's skills as checkboxes. Allow selecting up to 3 skills. On submit, insert to the endorsements table and update the UI."
```

**Claude**:
*Reads CLAUDE.md, UserCard.jsx, database schema*
```
"I'll create:
1. EndorseModal component with Mantine Modal
2. API function createEndorsement
3. Update UserCard to show the modal
4. Tests for EndorseModal

Here's the implementation..."
```

**You**:
```
"Good! Now add optimistic UI updates so the endorsement count increases immediately, before the API call completes"
```

**Claude**:
*Updates code with optimistic updates*

**You**:
```
"Perfect! Add this to EXTENDING.md as an example"
```

**Claude**:
*Updates documentation*

**You**:
```
"Run the tests to make sure everything works"
```

**Claude**:
*Runs tests, all pass ✅*

---

## Resources

- **[CLAUDE.md](../CLAUDE.md)** - Main AI reference
- **[EXTENDING.md](./EXTENDING.md)** - Feature development patterns
- **[DATABASE.md](./DATABASE.md)** - Database schema and queries

---

## Questions?

Claude Code is a powerful tool, but it's still AI. Always:
- ✅ Review generated code
- ✅ Run tests
- ✅ Ask for explanations
- ✅ Provide feedback

**Happy coding with AI assistance!** 🤖
