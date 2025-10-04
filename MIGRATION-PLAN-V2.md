# Strangler Fig Migration Plan V2: Ultra-Comprehensive Edition
## Talent Directory & OAuth-First Architecture

**Last Updated**: 2025-10-04
**Version**: 2.0 (Ultra-Detailed)
**Status**: Planning & Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Philosophy](#core-philosophy)
3. [Authentication System Overhaul](#authentication-system-overhaul)
4. [Talent Directory: The Heart of the Platform](#talent-directory-the-heart-of-the-platform)
5. [Registration & Onboarding Flow](#registration--onboarding-flow)
6. [Database Schema Evolution](#database-schema-evolution)
7. [Legacy Code Structure & Coexistence](#legacy-code-structure--coexistence)
8. [Migration Phases (Detailed)](#migration-phases-detailed)
9. [API Contracts & Module Boundaries](#api-contracts--module-boundaries)
10. [Data Migration Strategy](#data-migration-strategy)
11. [Testing & Quality Assurance](#testing--quality-assurance)
12. [Deployment & Rollout](#deployment--rollout)

---

## Executive Summary

CharlestonHacks is evolving from a simple event site into a **talent marketplace platform** where people discover collaborators, form teams, and build connections based on skills and interests. The migration to React using the Strangler Fig Pattern will:

1. **Modernize Authentication** - OAuth (LinkedIn, Facebook, Google) + magic links
2. **Centralize Talent Discovery** - Enhanced directory with search, matching, verification
3. **Maintain Stability** - Keep old code running while incrementally replacing it
4. **Scale for Growth** - Modern architecture supports 10k+ users

**Key Success Metrics**:
- OAuth adoption: 70%+ of new users
- Profile completeness: 85%+ average
- Match quality: 75%+ user satisfaction
- Zero downtime during migration

---

## Core Philosophy

### The Talent Directory is Everything

The platform's **core value proposition** is:
> "Find the perfect collaborator for your next project in Charleston's tech community"

This means:
- **Profiles are rich, verified, and discoverable**
- **Search is fast, accurate, and intelligent**
- **Matching algorithms are transparent and effective**
- **Connections are meaningful, not just vanity metrics**

### Authentication as Enabler, Not Barrier

Auth should:
- **Reduce friction** - OAuth one-click > email typing
- **Enrich profiles** - Pull LinkedIn skills, Facebook photo
- **Build trust** - Verified social accounts > anonymous emails
- **Respect privacy** - Users control what's shared

### Old Code is a Feature, Not a Bug

During migration:
- **Legacy code stays functional** - No user-facing breakage
- **Clear boundaries** - Old and new modules don't interfere
- **Gradual cutover** - Feature flags control rollout
- **Emergency rollback** - One-click return to legacy

---

## Authentication System Overhaul

### Current State (Legacy)
```javascript
// Magic links only
await supabase.auth.signInWithOtp({ email });
```

**Problems**:
- High friction (check email, find link, click)
- No social data import
- No profile photos from social
- Anonymous feel (just email)

### Target State (React)

#### Multi-Provider OAuth
```javascript
// LinkedIn (PRIORITY #1 - professional network)
await supabase.auth.signInWithOAuth({
  provider: 'linkedin',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'r_liteprofile r_emailaddress w_member_social'
  }
});

// Facebook (PRIORITY #2 - profile photo)
await supabase.auth.signInWithOAuth({
  provider: 'facebook',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'email,public_profile'
  }
});

// Google (PRIORITY #3 - fallback)
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'openid email profile'
  }
});

// Magic link (fallback for non-social users)
await supabase.auth.signInWithOtp({ email });
```

### Architecture: OAuth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Clicks "Login"                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │   AuthProvider.jsx      │
                │   Presents options:     │
                │   [LinkedIn] [Facebook] │
                │   [Google] [Email]      │
                └────────────┬────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    [LinkedIn]          [Facebook]          [Email Link]
         │                   │                   │
         v                   v                   v
   OAuth Dance         OAuth Dance         Magic Link
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             v
                ┌────────────────────────┐
                │  Supabase Auth Callback │
                │  Creates auth.users row │
                └────────────┬────────────┘
                             │
                             v
                ┌────────────────────────────────────┐
                │  ProfileEnrichmentService          │
                │  Pulls data from OAuth provider:   │
                │  - Name, email, photo              │
                │  - LinkedIn: headline, skills      │
                │  - Facebook: profile picture       │
                └────────────┬───────────────────────┘
                             │
                             v
                ┌────────────────────────────────────┐
                │  Create/Update community.* row     │
                │  Merge OAuth data + user input     │
                └────────────┬───────────────────────┘
                             │
                             v
                ┌────────────────────────────────────┐
                │  Redirect to Onboarding or Dashboard│
                └─────────────────────────────────────┘
```

### Supabase Auth Configuration

**Required Setup in Supabase Dashboard**:

1. **LinkedIn OAuth**
   - Create LinkedIn App: https://www.linkedin.com/developers/apps
   - Get Client ID & Secret
   - Add redirect: `https://[your-project].supabase.co/auth/v1/callback`
   - Requested scopes: `r_liteprofile`, `r_emailaddress`

2. **Facebook OAuth**
   - Create Facebook App: https://developers.facebook.com
   - Get App ID & Secret
   - Add redirect: `https://[your-project].supabase.co/auth/v1/callback`
   - Requested permissions: `email`, `public_profile`

3. **Google OAuth**
   - Create Google Cloud project
   - Enable Google+ API
   - Create OAuth credentials
   - Add redirect: `https://[your-project].supabase.co/auth/v1/callback`

### Profile Enrichment from Social Data

```javascript
// react-app/src/services/ProfileEnrichmentService.js

export class ProfileEnrichmentService {

  /**
   * After OAuth callback, enrich profile with social data
   */
  static async enrichFromProvider(user, provider, providerData) {
    const enriched = {
      user_id: user.id,
      email: user.email,
      auth_provider: provider,
      created_at: new Date().toISOString()
    };

    switch (provider) {
      case 'linkedin':
        return this.enrichFromLinkedIn(enriched, providerData);
      case 'facebook':
        return this.enrichFromFacebook(enriched, providerData);
      case 'google':
        return this.enrichFromGoogle(enriched, providerData);
      default:
        return enriched;
    }
  }

  static async enrichFromLinkedIn(profile, data) {
    // LinkedIn provides rich professional data
    return {
      ...profile,
      name: `${data.firstName?.localized?.en_US} ${data.lastName?.localized?.en_US}`,
      headline: data.headline?.localized?.en_US, // e.g., "Software Engineer at Google"
      image_url: data.profilePicture?.displayImage, // LinkedIn profile photo
      social_links: {
        linkedin: data.vanityName ? `https://linkedin.com/in/${data.vanityName}` : null
      },
      // Skills come from LinkedIn profile (if user grants permission)
      skills_suggested: data.skills?.map(s => s.name) || [],
      verified_linkedin: true
    };
  }

  static async enrichFromFacebook(profile, data) {
    // Facebook mainly for profile photo and basic info
    return {
      ...profile,
      name: data.name,
      image_url: data.picture?.data?.url, // High-res profile photo
      social_links: {
        facebook: `https://facebook.com/${data.id}`
      },
      verified_facebook: true
    };
  }

  static async enrichFromGoogle(profile, data) {
    // Google for email + photo
    return {
      ...profile,
      name: data.name,
      image_url: data.picture, // Google profile photo
      verified_google: true
    };
  }

  /**
   * Pull LinkedIn skills via their API (requires additional permissions)
   */
  static async fetchLinkedInSkills(accessToken) {
    // This requires LinkedIn Marketing Developer Platform access
    // Alternatively, ask user to manually input skills during onboarding
    try {
      const response = await fetch('https://api.linkedin.com/v2/skills', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      return data.elements?.map(skill => skill.name.localized.en_US) || [];
    } catch (err) {
      console.warn('LinkedIn skills fetch failed:', err);
      return [];
    }
  }
}
```

### Auth Module Structure (React)

```
react-app/src/features/auth/
├── AuthProvider.jsx              # Context provider for auth state
├── useAuth.js                    # Hook: useAuth()
├── auth.service.js               # Supabase auth calls
├── enrichment.service.js         # Social data enrichment
├── components/
│   ├── LoginModal.jsx           # OAuth buttons + magic link
│   ├── OAuthButton.jsx          # Reusable OAuth button
│   ├── MagicLinkForm.jsx        # Email input form
│   ├── AuthCallback.jsx         # /auth/callback handler
│   └── ProtectedRoute.jsx       # Auth guard for routes
└── types/
    └── auth.types.ts            # TypeScript types (optional)
```

### Legacy Auth Bridge

```javascript
// react-app/src/adapters/AuthBridge.js

/**
 * Sync React auth state ↔ Legacy global state
 */
export class AuthBridge {

  static init(useAuthStore) {
    // React → Legacy: Update window.appState when auth changes
    useAuthStore.subscribe((state) => {
      if (window.appState) {
        window.appState.session = state.session;
        window.appState.user = state.user;
      }

      // Emit event for legacy code
      if (window.Events) {
        window.Events.dispatchEvent(
          new CustomEvent('auth:changed', {
            detail: { user: state.user, session: state.session }
          })
        );
      }
    });

    // Legacy → React: Listen for legacy auth events
    if (window.Events) {
      window.Events.addEventListener('auth:login', (e) => {
        useAuthStore.getState().setUser(e.detail.user);
      });

      window.Events.addEventListener('auth:logout', () => {
        useAuthStore.getState().logout();
      });
    }
  }

  /**
   * Expose React auth methods to legacy code
   */
  static expose(useAuthStore) {
    window.ReactAuth = {
      getUser: () => useAuthStore.getState().user,
      getSession: () => useAuthStore.getState().session,
      isAuthenticated: () => !!useAuthStore.getState().user,
      login: (provider) => {
        // Trigger React login flow from legacy code
        window.Events?.dispatchEvent(
          new CustomEvent('react:login', { detail: { provider } })
        );
      },
      logout: () => useAuthStore.getState().logout()
    };
  }
}
```

---

## Talent Directory: The Heart of the Platform

### Vision

The Talent Directory is **not just a list of users** - it's a **living ecosystem** where:
- Skills are tagged, verified, and endorsed
- Matches are intelligent and contextual
- Discovery is serendipitous yet relevant
- Trust is built through connections and endorsements

### Core Features

#### 1. Rich User Profiles

**Data Model** (see Database Schema section for full details):
```typescript
interface TalentProfile {
  // Identity
  id: string;
  user_id: string;
  name: string;
  email: string;
  headline?: string;              // "Full-Stack Developer | React Expert"

  // Visual
  image_url: string;              // From OAuth or uploaded
  cover_photo_url?: string;       // Optional banner

  // Professional
  skills: Skill[];                // Structured skills with endorsements
  interests: string[];            // Areas of interest
  looking_for: string[];          // "Co-founder", "Mentor", "Collaborator"
  availability: string;           // "Full-time", "Weekends", "Evenings"

  // Bio & Context
  bio: string;                    // Rich text markdown
  location?: string;              // "Charleston, SC"
  timezone?: string;              // "America/New_York"

  // Social Proof
  verified_linkedin: boolean;
  verified_facebook: boolean;
  verified_email: boolean;
  endorsement_count: number;
  connection_count: number;

  // Privacy
  visibility: 'public' | 'community' | 'connections';
  searchable: boolean;

  // Metadata
  profile_completeness: number;   // 0-100 score
  last_active: timestamp;
  created_at: timestamp;
  updated_at: timestamp;
}

interface Skill {
  name: string;                   // "React"
  category?: string;              // "Frontend"
  proficiency?: string;           // "Expert", "Intermediate", "Beginner"
  years_experience?: number;
  endorsed_by: string[];          // Array of user IDs
  verified: boolean;              // LinkedIn-verified or endorsed by 3+ people
}
```

#### 2. Advanced Search & Filtering

**Search Interface**:
```typescript
interface SearchFilters {
  // Full-text search
  query?: string;                 // Searches name, bio, skills

  // Skills-based (primary use case)
  skills_all?: string[];          // Must have ALL these skills
  skills_any?: string[];          // Must have ANY of these skills
  skills_none?: string[];         // Must NOT have these skills

  // Availability
  availability?: string[];        // ["Full-time", "Weekends"]
  looking_for?: string[];         // ["Co-founder", "Mentor"]

  // Social proof
  min_endorsements?: number;
  min_connections?: number;
  verified_only?: boolean;        // Only LinkedIn/Facebook verified

  // Activity
  active_within_days?: number;    // Last active in N days

  // Location
  location?: string;
  timezone?: string;

  // Sorting
  sort_by?: 'relevance' | 'endorsements' | 'connections' | 'last_active' | 'newest';
  sort_order?: 'asc' | 'desc';

  // Pagination
  page?: number;
  per_page?: number;
}
```

**Search Implementation**:
```javascript
// react-app/src/features/directory/directory.service.js

export class DirectoryService {

  static async search(filters) {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('community_profiles_view') // Materialized view with computed fields
      .select(`
        *,
        skills:profile_skills(name, proficiency, endorsement_count, verified),
        connections:connections!connections_from_user_id_fkey(to_user_id),
        recent_activity:user_activity(last_seen)
      `);

    // Full-text search
    if (filters.query) {
      query = query.or(`
        name.ilike.%${filters.query}%,
        bio.ilike.%${filters.query}%,
        headline.ilike.%${filters.query}%
      `);
    }

    // Skills filtering (CRITICAL: this is the primary use case)
    if (filters.skills_all?.length) {
      // Must have ALL skills
      const skillsArray = `{${filters.skills_all.map(s => `"${s}"`).join(',')}}`;
      query = query.contains('skills_array', skillsArray);
    }

    if (filters.skills_any?.length) {
      // Must have ANY skill
      const skillsArray = `{${filters.skills_any.map(s => `"${s}"`).join(',')}}`;
      query = query.overlaps('skills_array', skillsArray);
    }

    // Availability filter
    if (filters.availability?.length) {
      query = query.in('availability', filters.availability);
    }

    // Social proof filters
    if (filters.min_endorsements) {
      query = query.gte('endorsement_count', filters.min_endorsements);
    }

    if (filters.verified_only) {
      query = query.or('verified_linkedin.eq.true,verified_facebook.eq.true');
    }

    // Activity filter
    if (filters.active_within_days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.active_within_days);
      query = query.gte('last_active', cutoff.toISOString());
    }

    // Sorting
    const sortField = filters.sort_by || 'relevance';
    const sortOrder = filters.sort_order || 'desc';

    if (sortField === 'relevance' && filters.query) {
      // Use Postgres full-text search ranking
      query = query.order('ts_rank', { ascending: false });
    } else {
      query = query.order(sortField, { ascending: sortOrder === 'asc' });
    }

    // Pagination
    const page = filters.page || 1;
    const perPage = filters.per_page || 20;
    query = query.range((page - 1) * perPage, page * perPage - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      results: data,
      total: count,
      page,
      per_page: perPage,
      total_pages: Math.ceil(count / perPage)
    };
  }
}
```

#### 3. Intelligent Matching Algorithm

**Beyond Jaccard Similarity** - Multi-factor scoring:

```javascript
// react-app/src/features/matching/MatchingEngine.js

export class MatchingEngine {

  /**
   * Calculate comprehensive match score between two profiles
   */
  static calculateMatchScore(myProfile, theirProfile, context = {}) {
    const scores = {
      skillComplementarity: this.skillComplementarity(myProfile, theirProfile),
      interestOverlap: this.jaccardSimilarity(myProfile.interests, theirProfile.interests),
      availabilityAlignment: this.availabilityScore(myProfile, theirProfile),
      goalAlignment: this.goalScore(myProfile, theirProfile),
      socialProof: this.socialProofScore(theirProfile),
      activityRecency: this.activityScore(theirProfile),
      mutualConnections: this.mutualConnectionScore(myProfile, theirProfile)
    };

    // Weighted combination (configurable based on context)
    const weights = context.weights || {
      skillComplementarity: 0.30,   // Primary: complementary skills
      interestOverlap: 0.20,        // Shared interests
      availabilityAlignment: 0.15,  // Can they actually work together?
      goalAlignment: 0.15,          // Seeking same type of collaboration
      socialProof: 0.10,            // Verified, endorsed profile
      activityRecency: 0.05,        // Active users preferred
      mutualConnections: 0.05       // Network effects
    };

    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return {
      score: totalScore,
      breakdown: scores,
      explanation: this.explainMatch(scores, weights)
    };
  }

  /**
   * Complementarity: They have skills I lack, I have skills they lack
   */
  static skillComplementarity(me, them) {
    const mySkills = new Set(me.skills.map(s => s.name.toLowerCase()));
    const theirSkills = new Set(them.skills.map(s => s.name.toLowerCase()));

    const iHaveTheyDont = [...mySkills].filter(s => !theirSkills.has(s));
    const theyHaveIDont = [...theirSkills].filter(s => !mySkills.has(s));

    // Ideal: balanced exchange
    const totalUnique = iHaveTheyDont.length + theyHaveIDont.length;
    const balance = Math.min(iHaveTheyDont.length, theyHaveIDont.length);

    return totalUnique > 0 ? balance / totalUnique : 0;
  }

  /**
   * Availability alignment: Can they actually collaborate?
   */
  static availabilityScore(me, them) {
    const availabilityMatch = {
      'Full-time,Full-time': 1.0,
      'Part-time,Part-time': 1.0,
      'Weekends,Weekends': 1.0,
      'Evenings,Evenings': 1.0,
      'Full-time,Part-time': 0.7,
      'Full-time,Weekends': 0.3,
      'Part-time,Weekends': 0.6,
    };

    const key = `${me.availability},${them.availability}`;
    return availabilityMatch[key] || availabilityMatch[`${them.availability},${me.availability}`] || 0.5;
  }

  /**
   * Goal alignment: Are they looking for what I'm offering?
   */
  static goalScore(me, them) {
    const myGoals = new Set(me.looking_for || []);
    const theirGoals = new Set(them.looking_for || []);

    // Perfect match: I'm looking for "Mentor", they're offering "Mentee"
    const complementaryGoals = {
      'Mentor': 'Mentee',
      'Mentee': 'Mentor',
      'Co-founder': 'Co-founder',
      'Collaborator': 'Collaborator'
    };

    let matches = 0;
    myGoals.forEach(goal => {
      const complement = complementaryGoals[goal];
      if (complement && theirGoals.has(complement)) matches++;
      if (theirGoals.has(goal)) matches += 0.5; // Same goal is OK but less ideal
    });

    return Math.min(matches / Math.max(myGoals.size, theirGoals.size, 1), 1);
  }

  /**
   * Social proof: Verified, endorsed, connected users rank higher
   */
  static socialProofScore(profile) {
    let score = 0;

    if (profile.verified_linkedin) score += 0.3;
    if (profile.verified_facebook) score += 0.2;
    if (profile.verified_email) score += 0.1;

    // Normalize endorsement count (sigmoid curve)
    const endorsementScore = Math.min(profile.endorsement_count / 20, 1) * 0.3;
    score += endorsementScore;

    // Connection count (capped to avoid popularity bias)
    const connectionScore = Math.min(profile.connection_count / 50, 1) * 0.1;
    score += connectionScore;

    return Math.min(score, 1);
  }

  /**
   * Activity recency: Prefer users who are active
   */
  static activityScore(profile) {
    if (!profile.last_active) return 0.5;

    const daysSinceActive = (Date.now() - new Date(profile.last_active)) / (1000 * 60 * 60 * 24);

    if (daysSinceActive < 7) return 1.0;
    if (daysSinceActive < 30) return 0.8;
    if (daysSinceActive < 90) return 0.5;
    return 0.2;
  }

  /**
   * Mutual connections: Do we know the same people?
   */
  static mutualConnectionScore(me, them) {
    const myConnections = new Set(me.connections?.map(c => c.to_user_id) || []);
    const theirConnections = new Set(them.connections?.map(c => c.to_user_id) || []);

    const mutual = [...myConnections].filter(id => theirConnections.has(id));

    // Sigmoid: 0 mutual = 0, 5 mutual = ~0.8, 10+ mutual = 1.0
    return Math.min(mutual.length / 10, 1);
  }

  /**
   * Generate human-readable explanation of match
   */
  static explainMatch(scores, weights) {
    const explanations = [];

    if (scores.skillComplementarity > 0.7) {
      explanations.push("You have complementary skills");
    }
    if (scores.interestOverlap > 0.5) {
      explanations.push("You share similar interests");
    }
    if (scores.availabilityAlignment > 0.7) {
      explanations.push("Your schedules align well");
    }
    if (scores.socialProof > 0.7) {
      explanations.push("Highly verified and endorsed");
    }
    if (scores.mutualConnections > 0.3) {
      explanations.push("You have mutual connections");
    }

    return explanations.join('. ') || "Moderate match potential";
  }

  /**
   * Jaccard similarity (for interests, tags, etc.)
   */
  static jaccardSimilarity(setA, setB) {
    const a = new Set((setA || []).map(s => s.toLowerCase()));
    const b = new Set((setB || []).map(s => s.toLowerCase()));

    const intersection = [...a].filter(x => b.has(x)).length;
    const union = new Set([...a, ...b]).size || 1;

    return intersection / union;
  }
}
```

#### 4. Skills Taxonomy & Verification

**Skills Taxonomy Table**:
```sql
CREATE TABLE skill_taxonomy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),          -- 'Frontend', 'Backend', 'Design', etc.
  parent_skill_id UUID REFERENCES skill_taxonomy(id),
  aliases TEXT[],                 -- ['ReactJS', 'React.js'] → 'React'
  color VARCHAR(7),               -- Hex color for UI
  icon_url TEXT,
  verified_sources TEXT[],        -- ['linkedin', 'github', 'manual']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Examples
INSERT INTO skill_taxonomy (name, category, aliases, color) VALUES
  ('React', 'Frontend', ARRAY['ReactJS', 'React.js'], '#61DAFB'),
  ('Node.js', 'Backend', ARRAY['NodeJS', 'Node'], '#339933'),
  ('Python', 'Backend', ARRAY['Python3'], '#3776AB'),
  ('UI/UX Design', 'Design', ARRAY['UX', 'UI Design'], '#FF6B6B');
```

**Skill Verification**:
```javascript
// react-app/src/features/skills/SkillVerificationService.js

export class SkillVerificationService {

  /**
   * Verify skill from LinkedIn profile
   */
  static async verifyFromLinkedIn(userId, skillName) {
    const linkedInSkills = await this.fetchLinkedInSkills(userId);
    const normalized = this.normalizeSkillName(skillName);

    const verified = linkedInSkills.some(s =>
      this.normalizeSkillName(s) === normalized
    );

    if (verified) {
      await this.markSkillVerified(userId, skillName, 'linkedin');
    }

    return verified;
  }

  /**
   * Auto-verify skill if endorsed by 3+ verified users
   */
  static async autoVerifyByEndorsements(userId, skillName) {
    const supabase = getSupabaseClient();

    const { data: endorsements } = await supabase
      .from('endorsements')
      .select('endorsed_by, endorsers:community!endorsed_by(verified_linkedin, verified_facebook)')
      .eq('endorsed_user_id', userId)
      .eq('skill', skillName);

    const verifiedEndorsers = endorsements?.filter(e =>
      e.endorsers?.verified_linkedin || e.endorsers?.verified_facebook
    ).length || 0;

    if (verifiedEndorsers >= 3) {
      await this.markSkillVerified(userId, skillName, 'endorsements');
      return true;
    }

    return false;
  }

  /**
   * Normalize skill names (handle aliases)
   */
  static async normalizeSkillName(skillName) {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('skill_taxonomy')
      .select('name')
      .or(`name.ilike.${skillName},aliases.cs.{${skillName}}`)
      .single();

    return data?.name || skillName;
  }
}
```

#### 5. Profile Completeness Scoring

```javascript
// react-app/src/features/profile/ProfileCompletenessService.js

export class ProfileCompletenessService {

  static calculate(profile) {
    const weights = {
      // Required fields
      name: 10,
      email: 10,

      // High-value fields
      image_url: 15,
      bio: 15,
      skills: 20,              // At least 3 skills
      interests: 10,           // At least 2 interests

      // Medium-value fields
      headline: 5,
      availability: 5,
      looking_for: 5,

      // Social proof
      verified_linkedin: 5,
      verified_email: 5,

      // Engagement
      has_connections: 5,      // At least 1 connection
    };

    let score = 0;

    if (profile.name) score += weights.name;
    if (profile.email) score += weights.email;
    if (profile.image_url) score += weights.image_url;
    if (profile.bio && profile.bio.length > 50) score += weights.bio;
    if (profile.skills?.length >= 3) score += weights.skills;
    if (profile.interests?.length >= 2) score += weights.interests;
    if (profile.headline) score += weights.headline;
    if (profile.availability) score += weights.availability;
    if (profile.looking_for?.length) score += weights.looking_for;
    if (profile.verified_linkedin) score += weights.verified_linkedin;
    if (profile.verified_email) score += weights.verified_email;
    if (profile.connection_count > 0) score += weights.has_connections;

    return Math.round(score);
  }

  /**
   * Get suggestions for improving profile
   */
  static getSuggestions(profile) {
    const suggestions = [];

    if (!profile.image_url) {
      suggestions.push({
        field: 'image_url',
        message: 'Add a profile photo',
        impact: 'high',
        action: 'upload_photo'
      });
    }

    if (!profile.bio || profile.bio.length < 50) {
      suggestions.push({
        field: 'bio',
        message: 'Write a bio (at least 50 characters)',
        impact: 'high',
        action: 'edit_bio'
      });
    }

    if (!profile.skills || profile.skills.length < 3) {
      suggestions.push({
        field: 'skills',
        message: 'Add at least 3 skills',
        impact: 'high',
        action: 'add_skills'
      });
    }

    if (!profile.verified_linkedin) {
      suggestions.push({
        field: 'verified_linkedin',
        message: 'Verify with LinkedIn for better matches',
        impact: 'medium',
        action: 'connect_linkedin'
      });
    }

    if (profile.connection_count === 0) {
      suggestions.push({
        field: 'connections',
        message: 'Connect with someone to unlock networking features',
        impact: 'medium',
        action: 'browse_directory'
      });
    }

    return suggestions;
  }
}
```

---

## Registration & Onboarding Flow

### Philosophy: Progressive Profiling

**Don't ask for everything upfront** - get users to value ASAP, then progressively request more info.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 0: Landing Page                                            │
│  [ Browse Directory ] ← No account needed!                       │
│  [ Sign Up to Connect ]                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ User clicks "Sign Up"
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Choose Auth Method (AuthModal.jsx)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Sign in with:                                             │  │
│  │  [ 🔗 LinkedIn ]  ← RECOMMENDED                           │  │
│  │  [ 📘 Facebook ]                                           │  │
│  │  [ 🔍 Google ]                                             │  │
│  │  ─── or ───                                                │  │
│  │  [ 📧 Email Magic Link ]                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ OAuth callback OR magic link click
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Profile Enrichment (Automatic)                         │
│  - Name, email, photo from OAuth provider                       │
│  - LinkedIn: Pull headline, suggested skills                    │
│  - Facebook: Pull profile photo                                 │
│  - Create community.* row with enriched data                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Welcome & Quick Start (OnboardingWelcome.jsx)          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Welcome, John! Your profile is 45% complete.              │  │
│  │                                                             │  │
│  │  Let's finish setting up:                                  │  │
│  │  ✅ Name, email, photo (from LinkedIn)                    │  │
│  │  ⚠️  Add 3 skills (1 minute)                              │  │
│  │  ⚠️  Write a short bio (2 minutes)                        │  │
│  │  ⬜ Set availability (30 seconds)                         │  │
│  │                                                             │  │
│  │  [ Skip for Now ]  [ Complete Profile (3 min) ]           │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ User clicks "Complete Profile"
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Skills & Interests (OnboardingSkills.jsx)              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  What are your top skills?                                 │  │
│  │  💡 We found these from your LinkedIn:                    │  │
│  │  [ ✓ React ] [ ✓ Node.js ] [ + TypeScript ]              │  │
│  │                                                             │  │
│  │  Add more: [ _______________ ] [Search skills...]         │  │
│  │  Autocomplete: [ Python | PostgreSQL | Docker ]           │  │
│  │                                                             │  │
│  │  For each skill, set proficiency:                         │  │
│  │  React: [ ● Expert    ○ Intermediate    ○ Beginner ]     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  [ Back ]  [ Next: Interests ]                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Bio & Availability (OnboardingBio.jsx)                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Tell us about yourself (50 chars min):                   │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ I'm a full-stack developer passionate about          │  │  │
│  │  │ building tools that help people connect...           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  When are you available?                                  │  │
│  │  [ ○ Full-time    ● Part-time    ○ Weekends ]            │  │
│  │                                                             │  │
│  │  What are you looking for?                                │  │
│  │  [ ✓ Collaborator ] [ ✓ Co-founder ] [ Mentee ]          │  │
│  └───────────────────────────────────────────────────────────┘  │
│  [ Back ]  [ Finish Setup ]                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Success & First Action (OnboardingSuccess.jsx)         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🎉 Profile Complete! (85%)                               │  │
│  │                                                             │  │
│  │  You're all set. What would you like to do?               │  │
│  │                                                             │  │
│  │  [ 🔍 Find Collaborators ]                                │  │
│  │  [ 👥 Browse Directory ]                                  │  │
│  │  [ ⚙️  Customize Profile ]                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
                  [ Dashboard / Directory ]
```

### Implementation

#### OnboardingFlow.jsx (Main Orchestrator)

```javascript
// react-app/src/features/onboarding/OnboardingFlow.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { ProfileCompletenessService } from '../profile/ProfileCompletenessService';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingSkills } from './OnboardingSkills';
import { OnboardingBio } from './OnboardingBio';
import { OnboardingSuccess } from './OnboardingSuccess';

export function OnboardingFlow() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    if (profile) {
      const score = ProfileCompletenessService.calculate(profile);
      setCompleteness(score);

      // Skip onboarding if profile is >80% complete
      if (score > 80) {
        window.location.href = '/app/dashboard';
      }
    }
  }, [profile]);

  const steps = {
    1: <OnboardingWelcome
          profile={profile}
          completeness={completeness}
          onNext={() => setStep(2)}
          onSkip={() => window.location.href = '/app/dashboard'}
        />,
    2: <OnboardingSkills
          profile={profile}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />,
    3: <OnboardingBio
          profile={profile}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />,
    4: <OnboardingSuccess
          profile={profile}
        />
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-progress">
        <div className="progress-bar" style={{ width: `${(step / 4) * 100}%` }} />
      </div>
      {steps[step]}
    </div>
  );
}
```

#### OnboardingSkills.jsx (Skills Selection)

```javascript
// react-app/src/features/onboarding/OnboardingSkills.jsx

import { useState, useEffect } from 'react';
import { SkillAutocomplete } from '../skills/SkillAutocomplete';
import { ProfileEnrichmentService } from '../auth/enrichment.service';
import { supabase } from '../../services/supabase.service';

export function OnboardingSkills({ profile, onNext, onBack }) {
  const [skills, setSkills] = useState([]);
  const [suggestedSkills, setSuggestedSkills] = useState([]);

  useEffect(() => {
    // Load LinkedIn suggested skills (if available)
    loadSuggestedSkills();

    // Load existing skills from profile
    if (profile?.skills) {
      setSkills(profile.skills);
    }
  }, [profile]);

  async function loadSuggestedSkills() {
    if (profile?.auth_provider === 'linkedin' && profile?.skills_suggested) {
      setSuggestedSkills(profile.skills_suggested.slice(0, 10));
    }
  }

  function addSkill(skillName, proficiency = 'Intermediate') {
    if (!skills.find(s => s.name === skillName)) {
      setSkills([...skills, { name: skillName, proficiency }]);
    }
  }

  function removeSkill(skillName) {
    setSkills(skills.filter(s => s.name !== skillName));
  }

  function updateProficiency(skillName, proficiency) {
    setSkills(skills.map(s =>
      s.name === skillName ? { ...s, proficiency } : s
    ));
  }

  async function handleNext() {
    // Save skills to profile
    await supabase
      .from('community')
      .update({
        skills: skills.map(s => s.name),
        skills_proficiency: skills.reduce((acc, s) => ({
          ...acc,
          [s.name]: s.proficiency
        }), {})
      })
      .eq('user_id', profile.user_id);

    onNext();
  }

  return (
    <div className="onboarding-step onboarding-skills">
      <h2>What are your top skills?</h2>

      {/* LinkedIn Suggested Skills */}
      {suggestedSkills.length > 0 && (
        <div className="suggested-skills">
          <p>💡 We found these from your LinkedIn:</p>
          <div className="skill-chips">
            {suggestedSkills.map(skill => (
              <button
                key={skill}
                className={`skill-chip ${skills.find(s => s.name === skill) ? 'selected' : ''}`}
                onClick={() => addSkill(skill)}
              >
                {skills.find(s => s.name === skill) ? '✓' : '+'} {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Skill Input */}
      <div className="add-skill">
        <SkillAutocomplete
          onSelect={addSkill}
          placeholder="Add more skills..."
        />
      </div>

      {/* Selected Skills with Proficiency */}
      <div className="selected-skills">
        {skills.map(skill => (
          <div key={skill.name} className="skill-item">
            <span className="skill-name">{skill.name}</span>
            <div className="proficiency-selector">
              {['Beginner', 'Intermediate', 'Expert'].map(level => (
                <label key={level}>
                  <input
                    type="radio"
                    name={`${skill.name}-proficiency`}
                    value={level}
                    checked={skill.proficiency === level}
                    onChange={() => updateProficiency(skill.name, level)}
                  />
                  {level}
                </label>
              ))}
            </div>
            <button onClick={() => removeSkill(skill.name)}>✕</button>
          </div>
        ))}
      </div>

      {/* Validation & Navigation */}
      <div className="onboarding-actions">
        <button onClick={onBack}>Back</button>
        <button
          onClick={handleNext}
          disabled={skills.length < 3}
          className="primary"
        >
          {skills.length < 3 ? `Add ${3 - skills.length} more skill(s)` : 'Next: Interests'}
        </button>
      </div>
    </div>
  );
}
```

---

## Database Schema Evolution

### Current Schema (Inferred)

```sql
-- Existing tables
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  created_at TIMESTAMPTZ
);

CREATE TABLE community (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255),
  email VARCHAR(255),
  skills TEXT[],                    -- Simple text array
  interests TEXT[],
  bio TEXT,
  availability VARCHAR(50),
  image_url TEXT,
  newsletter_opt_in BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES community(id),
  to_user_id UUID REFERENCES community(id),
  status VARCHAR(20),               -- 'pending', 'accepted', 'declined'
  type VARCHAR(20),                 -- 'manual', 'suggested'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorsed_user_id UUID REFERENCES community(id),
  endorsed_by UUID REFERENCES community(id),
  skill VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Target Schema (Enhanced)

```sql
-- ============================================================================
-- PHASE 1: Enhance existing tables (backward compatible)
-- ============================================================================

-- Add OAuth columns to community table
ALTER TABLE community ADD COLUMN IF NOT EXISTS headline VARCHAR(200);
ALTER TABLE community ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20);  -- 'linkedin', 'facebook', 'google', 'email'
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_linkedin BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_facebook BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_google BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_email BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS social_links JSONB;         -- { linkedin: 'url', facebook: 'url' }
ALTER TABLE community ADD COLUMN IF NOT EXISTS skills_suggested TEXT[];    -- From LinkedIn
ALTER TABLE community ADD COLUMN IF NOT EXISTS skills_proficiency JSONB;   -- { 'React': 'Expert', 'Node': 'Intermediate' }
ALTER TABLE community ADD COLUMN IF NOT EXISTS looking_for TEXT[];         -- ['Co-founder', 'Mentor']
ALTER TABLE community ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE community ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE community ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';  -- 'public', 'community', 'connections'
ALTER TABLE community ADD COLUMN IF NOT EXISTS searchable BOOLEAN DEFAULT TRUE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;
ALTER TABLE community ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE community ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_community_user_id ON community(user_id);
CREATE INDEX IF NOT EXISTS idx_community_searchable ON community(searchable) WHERE searchable = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_skills ON community USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_community_last_active ON community(last_active DESC);

-- ============================================================================
-- PHASE 2: New tables for enhanced features
-- ============================================================================

-- Skills Taxonomy
CREATE TABLE skill_taxonomy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),              -- 'Frontend', 'Backend', 'Design', etc.
  parent_skill_id UUID REFERENCES skill_taxonomy(id),
  aliases TEXT[],                     -- ['ReactJS', 'React.js'] → 'React'
  color VARCHAR(7),                   -- Hex color for UI
  icon_url TEXT,
  verified_sources TEXT[],            -- ['linkedin', 'github', 'manual']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile Skills (many-to-many with metadata)
CREATE TABLE profile_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES community(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skill_taxonomy(id),
  proficiency VARCHAR(20),            -- 'Expert', 'Intermediate', 'Beginner'
  years_experience INTEGER,
  verified_source VARCHAR(20),        -- 'linkedin', 'endorsements', null
  endorsement_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,     -- True if LinkedIn-verified OR 3+ endorsements
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, skill_id)
);

CREATE INDEX idx_profile_skills_profile ON profile_skills(profile_id);
CREATE INDEX idx_profile_skills_skill ON profile_skills(skill_id);
CREATE INDEX idx_profile_skills_verified ON profile_skills(verified) WHERE verified = TRUE;

-- Enhanced Endorsements
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS verified_endorser BOOLEAN DEFAULT FALSE;
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS strength INTEGER DEFAULT 1;  -- 1-5 scale

-- User Activity Tracking
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES community(id) ON DELETE CASCADE,
  activity_type VARCHAR(50),          -- 'login', 'profile_update', 'connection', 'search'
  metadata JSONB,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user ON user_activity(user_id);
CREATE INDEX idx_user_activity_last_seen ON user_activity(last_seen DESC);

-- Connection Requests Enhancement
ALTER TABLE connections ADD COLUMN IF NOT EXISTS message TEXT;              -- Intro message
ALTER TABLE connections ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- ============================================================================
-- PHASE 3: Materialized views for performance
-- ============================================================================

-- Community Profiles View (with computed fields)
CREATE MATERIALIZED VIEW community_profiles_view AS
SELECT
  c.*,
  COALESCE(ec.endorsement_count, 0) AS endorsement_count,
  COALESCE(cc.connection_count, 0) AS connection_count,
  c.skills AS skills_array,  -- For array operations
  ua.last_seen
FROM community c
LEFT JOIN (
  SELECT endorsed_user_id, COUNT(*) AS endorsement_count
  FROM endorsements
  GROUP BY endorsed_user_id
) ec ON ec.endorsed_user_id = c.id
LEFT JOIN (
  SELECT from_user_id, COUNT(*) AS connection_count
  FROM connections
  WHERE status = 'accepted'
  GROUP BY from_user_id
) cc ON cc.from_user_id = c.id
LEFT JOIN LATERAL (
  SELECT last_seen
  FROM user_activity
  WHERE user_id = c.id
  ORDER BY last_seen DESC
  LIMIT 1
) ua ON TRUE;

-- Index for fast lookups
CREATE UNIQUE INDEX idx_community_profiles_view_id ON community_profiles_view(id);
CREATE INDEX idx_community_profiles_view_skills ON community_profiles_view USING GIN(skills_array);

-- Refresh strategy (run every 5 minutes via cron or on-demand)
CREATE OR REPLACE FUNCTION refresh_community_profiles_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY community_profiles_view;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 4: Functions & Triggers
-- ============================================================================

-- Auto-update profile_completeness on profile changes
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  IF NEW.name IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.email IS NOT NULL THEN score := score + 10; END IF;
  IF NEW.image_url IS NOT NULL THEN score := score + 15; END IF;
  IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 50 THEN score := score + 15; END IF;
  IF ARRAY_LENGTH(NEW.skills, 1) >= 3 THEN score := score + 20; END IF;
  IF ARRAY_LENGTH(NEW.interests, 1) >= 2 THEN score := score + 10; END IF;
  IF NEW.headline IS NOT NULL THEN score := score + 5; END IF;
  IF NEW.availability IS NOT NULL THEN score := score + 5; END IF;
  IF ARRAY_LENGTH(NEW.looking_for, 1) > 0 THEN score := score + 5; END IF;
  IF NEW.verified_linkedin THEN score := score + 5; END IF;
  IF NEW.verified_email THEN score := score + 5; END IF;

  NEW.profile_completeness := score;
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_completeness
  BEFORE INSERT OR UPDATE ON community
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completeness();

-- Auto-verify skill if 3+ verified users endorse it
CREATE OR REPLACE FUNCTION auto_verify_skill()
RETURNS TRIGGER AS $$
DECLARE
  verified_count INTEGER;
BEGIN
  -- Count verified endorsers for this skill
  SELECT COUNT(DISTINCT e.endorsed_by)
  INTO verified_count
  FROM endorsements e
  JOIN community c ON c.id = e.endorsed_by
  WHERE e.endorsed_user_id = NEW.endorsed_user_id
    AND e.skill = NEW.skill
    AND (c.verified_linkedin = TRUE OR c.verified_facebook = TRUE);

  -- Auto-verify if 3+ verified endorsers
  IF verified_count >= 3 THEN
    UPDATE profile_skills
    SET verified = TRUE, verified_source = 'endorsements'
    WHERE profile_id = NEW.endorsed_user_id
      AND skill_id = (SELECT id FROM skill_taxonomy WHERE name = NEW.skill);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_verify_skill
  AFTER INSERT ON endorsements
  FOR EACH ROW
  EXECUTE FUNCTION auto_verify_skill();

-- Track user activity
CREATE OR REPLACE FUNCTION track_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity (user_id, activity_type, last_seen)
  VALUES (NEW.user_id, 'profile_update', NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET last_seen = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_activity
  AFTER INSERT OR UPDATE ON community
  FOR EACH ROW
  EXECUTE FUNCTION track_user_activity();

-- ============================================================================
-- PHASE 5: Row-Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE community ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Public profiles are readable by everyone
CREATE POLICY "Public profiles are viewable by everyone"
  ON community FOR SELECT
  USING (visibility = 'public' OR auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON community FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON community FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Connection requests
CREATE POLICY "Users can view own connection requests"
  ON connections FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM community WHERE id IN (from_user_id, to_user_id)
  ));

CREATE POLICY "Users can create connection requests"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM community WHERE id = from_user_id
  ));
```

### Migration Scripts

```sql
-- migration_001_add_oauth_fields.sql
-- Run this first to extend existing tables

BEGIN;

-- Add new columns (idempotent)
ALTER TABLE community ADD COLUMN IF NOT EXISTS headline VARCHAR(200);
ALTER TABLE community ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20);
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_linkedin BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS verified_facebook BOOLEAN DEFAULT FALSE;
ALTER TABLE community ADD COLUMN IF NOT EXISTS social_links JSONB;
ALTER TABLE community ADD COLUMN IF NOT EXISTS skills_proficiency JSONB;
ALTER TABLE community ADD COLUMN IF NOT EXISTS looking_for TEXT[];
ALTER TABLE community ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;
ALTER TABLE community ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- Backfill profile_completeness for existing users
UPDATE community
SET profile_completeness = (
  CASE WHEN name IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN email IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN image_url IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN bio IS NOT NULL AND LENGTH(bio) > 50 THEN 15 ELSE 0 END +
  CASE WHEN ARRAY_LENGTH(skills, 1) >= 3 THEN 20 ELSE 0 END
);

COMMIT;
```

---

## Legacy Code Structure & Coexistence

### Problem: Spaghetti → Lasagna

Current code is **spaghetti** (tangled, hard to follow). We need **lasagna** (clear layers).

### Layered Architecture During Migration

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: UI (HTML + React Components)                          │
│  - 2card.html (legacy, gradually hollowed out)                  │
│  - React components (new, gradually taking over)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│  LAYER 4: Presentation Logic                                    │
│  - Legacy: eventListeners.js, formHandlers.js                  │
│  - React: Container components, custom hooks                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│  LAYER 3: Business Logic (SHARED between legacy & React)        │
│  - AuthService (login, logout, session)                         │
│  - ProfileService (CRUD profiles)                               │
│  - MatchingService (scoring algorithm)                          │
│  - DirectoryService (search, filter)                            │
│  - ConnectionService (requests, acceptance)                     │
│  ✅ This layer works in BOTH environments via adapters          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│  LAYER 2: Data Access (SHARED)                                  │
│  - SupabaseClient (singleton, shared instance)                  │
│  - API wrappers (profiles.api.js, connections.api.js)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│  LAYER 1: External Services                                     │
│  - Supabase (auth, database, storage)                           │
│  - OAuth Providers (LinkedIn, Facebook, Google)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure: Legacy vs React Coexistence

```
/
├── assets/                           # LEGACY CODE (gradually deprecated)
│   ├── js/
│   │   ├── _legacy/                 # Move old files here as replaced
│   │   │   ├── main.js.old
│   │   │   ├── eventListeners.js.old
│   │   │   └── ...
│   │   │
│   │   ├── shared/                  # SHARED SERVICES (work in both envs)
│   │   │   ├── supabaseClient.js   # ✅ Singleton Supabase client
│   │   │   ├── AuthService.js      # ✅ Auth logic (used by legacy & React)
│   │   │   ├── ProfileService.js   # ✅ Profile CRUD
│   │   │   ├── MatchingService.js  # ✅ Matching algorithm
│   │   │   ├── DirectoryService.js # ✅ Search & filter
│   │   │   └── ConnectionService.js# ✅ Connection requests
│   │   │
│   │   ├── adapters/               # BRIDGE between legacy ↔ React
│   │   │   ├── EventBusAdapter.js  # Sync events
│   │   │   ├── StateAdapter.js     # Sync global state
│   │   │   └── FeatureFlagAdapter.js # Control what's React vs legacy
│   │   │
│   │   └── legacy-active/          # Still-active legacy code
│   │       ├── neuralInteractive.js  # Neural viz (can stay vanilla)
│   │       ├── cardFlip.js          # Homepage card (keep)
│   │       └── btc.js               # BTC price (trivial, keep)
│   │
│   └── css/                         # Legacy styles (gradually replaced)
│
├── react-app/                        # NEW REACT CODE
│   ├── public/
│   ├── src/
│   │   ├── features/                # Feature modules (self-contained)
│   │   │   ├── auth/
│   │   │   │   ├── AuthProvider.jsx
│   │   │   │   ├── useAuth.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── LoginModal.jsx
│   │   │   │   │   ├── OAuthButton.jsx
│   │   │   │   │   └── AuthCallback.jsx
│   │   │   │   ├── auth.service.js    # Wraps shared AuthService
│   │   │   │   └── enrichment.service.js
│   │   │   │
│   │   │   ├── profile/
│   │   │   │   ├── ProfileProvider.jsx
│   │   │   │   ├── useProfile.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProfileForm.jsx
│   │   │   │   │   ├── ProfileCard.jsx
│   │   │   │   │   ├── SkillsInput.jsx
│   │   │   │   │   └── ProfileProgress.jsx
│   │   │   │   └── profile.service.js  # Wraps shared ProfileService
│   │   │   │
│   │   │   ├── directory/
│   │   │   │   ├── useDirectory.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── DirectorySearch.jsx
│   │   │   │   │   ├── SearchFilters.jsx
│   │   │   │   │   ├── UserCardList.jsx
│   │   │   │   │   └── UserCard.jsx
│   │   │   │   └── directory.service.js  # Wraps shared DirectoryService
│   │   │   │
│   │   │   ├── matching/
│   │   │   │   ├── useMatching.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── SuggestionsPanel.jsx
│   │   │   │   │   └── MatchScore.jsx
│   │   │   │   └── matching.service.js  # Wraps shared MatchingService
│   │   │   │
│   │   │   └── onboarding/
│   │   │       ├── OnboardingFlow.jsx
│   │   │       ├── OnboardingWelcome.jsx
│   │   │       ├── OnboardingSkills.jsx
│   │   │       ├── OnboardingBio.jsx
│   │   │       └── OnboardingSuccess.jsx
│   │   │
│   │   ├── shared/                  # Shared React components/utils
│   │   │   ├── components/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   └── Notification.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useDebounce.js
│   │   │   │   ├── useLocalStorage.js
│   │   │   │   └── useEventBus.js
│   │   │   └── utils/
│   │   │       ├── normalize.js
│   │   │       ├── validation.js
│   │   │       └── formatting.js
│   │   │
│   │   ├── adapters/                # React ↔ Legacy bridges
│   │   │   ├── LegacyBridge.js     # Mount React in legacy pages
│   │   │   ├── SupabaseAdapter.js  # Shared Supabase client
│   │   │   ├── EventBusAdapter.js  # Event sync
│   │   │   └── AuthBridge.js       # Auth state sync
│   │   │
│   │   ├── store/                   # Zustand state management
│   │   │   ├── authStore.js
│   │   │   ├── profileStore.js
│   │   │   └── directoryStore.js
│   │   │
│   │   ├── pages/                   # Top-level page components
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── DirectoryPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── OnboardingPage.jsx
│   │   │   └── AuthCallbackPage.jsx
│   │   │
│   │   ├── App.jsx                  # Main React app
│   │   ├── index.js                 # Entry point
│   │   └── legacy-exports.js        # Exports for legacy code to use
│   │
│   └── package.json
│
├── 2card.html                        # HYBRID PAGE (uses both legacy & React)
├── index.html                        # LEGACY (keep as-is)
├── neural.html                       # LEGACY (keep as-is)
├── CLAUDE.md                         # Updated with new architecture
├── MIGRATION-PLAN-V2.md             # This document
└── SITEMAP.md                        # Site structure
```

### Shared Services Pattern

**Key Principle**: Business logic lives in **one place**, consumed by both legacy and React.

#### Example: AuthService (Shared)

```javascript
// assets/js/shared/AuthService.js
// ✅ Works in BOTH legacy and React environments

import { supabaseClient as supabase } from './supabaseClient.js';

export class AuthService {

  /**
   * Sign in with OAuth provider
   */
  static async signInWithOAuth(provider, options = {}) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: options.redirectTo || `${window.location.origin}/auth/callback`,
        scopes: options.scopes
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in with magic link
   */
  static async signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href }
    });

    if (error) throw error;
  }

  /**
   * Get current user
   */
  static async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  /**
   * Get current session
   */
  static async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  /**
   * Sign out
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// Expose to global scope for legacy code
window.AuthService = AuthService;
```

#### Usage in Legacy Code

```javascript
// assets/js/legacy-active/login.js (legacy)

import { AuthService } from '../shared/AuthService.js';

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  await AuthService.signInWithMagicLink(email);
  alert('Magic link sent!');
});
```

#### Usage in React

```javascript
// react-app/src/features/auth/auth.service.js (React wrapper)

import { AuthService as SharedAuthService } from '../../../../assets/js/shared/AuthService.js';

// Re-export shared service
export const AuthService = SharedAuthService;

// Or wrap with React-specific logic if needed
export async function signInWithProvider(provider) {
  // Call shared service
  return await SharedAuthService.signInWithOAuth(provider, {
    redirectTo: '/app/auth/callback',
    scopes: getProviderScopes(provider)
  });
}
```

### Feature Flags: Control Rollout

```javascript
// assets/js/adapters/FeatureFlagAdapter.js

export class FeatureFlags {

  static flags = {
    // Format: feature_name: { enabled: boolean, rollout_percent: number }
    react_auth: { enabled: true, rollout: 100 },        // 100% React auth
    react_profile: { enabled: true, rollout: 50 },      // 50% React profile
    react_directory: { enabled: true, rollout: 25 },    // 25% React directory
    react_matching: { enabled: false, rollout: 0 },     // Not yet
    oauth_providers: { enabled: true, rollout: 100 },   // OAuth enabled
  };

  /**
   * Check if feature is enabled for current user
   */
  static isEnabled(featureName) {
    const flag = this.flags[featureName];
    if (!flag || !flag.enabled) return false;

    // Rollout percentage (deterministic based on user ID)
    if (flag.rollout < 100) {
      const userId = this.getUserId();
      if (!userId) return false;

      const hash = this.hashUserId(userId);
      const bucket = hash % 100;
      return bucket < flag.rollout;
    }

    return true;
  }

  /**
   * Get user ID (from session or local storage)
   */
  static getUserId() {
    return window.appState?.session?.user?.id || localStorage.getItem('user_id');
  }

  /**
   * Simple hash function for deterministic bucketing
   */
  static hashUserId(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Override flag (for testing)
   */
  static override(featureName, enabled) {
    if (this.flags[featureName]) {
      this.flags[featureName].enabled = enabled;
      this.flags[featureName].rollout = enabled ? 100 : 0;
    }
  }
}

// Expose globally
window.FeatureFlags = FeatureFlags;
```

#### Usage: Conditional Rendering

```javascript
// In 2card.html (hybrid page)

<div id="profile-section">
  <!-- Legacy profile form (shown if React disabled) -->
  <div id="legacy-profile-form" style="display: none;">
    <!-- ... old form ... -->
  </div>

  <!-- React mount point (shown if React enabled) -->
  <div id="react-profile-root"></div>
</div>

<script type="module">
  import { FeatureFlags } from './assets/js/adapters/FeatureFlagAdapter.js';

  if (FeatureFlags.isEnabled('react_profile')) {
    // Mount React component
    document.getElementById('react-profile-root').style.display = 'block';
    window.ReactBridge.mount(
      window.ReactComponents.ProfileForm,
      'react-profile-root'
    );
  } else {
    // Show legacy form
    document.getElementById('legacy-profile-form').style.display = 'block';
  }
</script>
```

---

## Migration Phases (Detailed)

### Overview Timeline

| Phase | Duration | Effort | Risk | Deliverable |
|-------|----------|--------|------|-------------|
| **Phase 0: Foundation** | 3 weeks | High | Low | React setup, shared services, adapters |
| **Phase 1: Auth Overhaul** | 4 weeks | High | Medium | OAuth login, profile enrichment |
| **Phase 2: Onboarding** | 3 weeks | Medium | Low | Multi-step onboarding flow |
| **Phase 3: Directory Core** | 5 weeks | High | Medium | Search, filters, user cards |
| **Phase 4: Matching Engine** | 3 weeks | Medium | Low | Intelligent matching, suggestions |
| **Phase 5: Profile Management** | 4 weeks | Medium | Low | Edit profile, skills, endorsements |
| **Phase 6: Connections** | 3 weeks | Medium | Medium | Connection requests, notifications |
| **Phase 7: Full SPA** | 4 weeks | High | High | Complete React app, routing |
| **Phase 8: Legacy Removal** | 3 weeks | Medium | High | Remove old code, optimize |
| **TOTAL** | **32 weeks** (~8 months) |

---

### Phase 0: Foundation (Weeks 1-3)

**Goal**: Set up React infrastructure and shared services layer.

#### Week 1: React Setup
- [ ] Create React app: `npx create-react-app react-app`
- [ ] Install dependencies:
  ```bash
  npm install @supabase/supabase-js
  npm install react-router-dom
  npm install zustand
  npm install @tanstack/react-query
  npm install axios
  npm install date-fns
  ```
- [ ] Configure build to output to `/react-dist`
- [ ] Set up ESLint, Prettier
- [ ] Create basic folder structure (`features/`, `shared/`, `adapters/`)

#### Week 2: Shared Services
- [ ] Extract `AuthService` from legacy `main.js`
- [ ] Extract `ProfileService` (CRUD operations)
- [ ] Extract `MatchingService` (algorithm only)
- [ ] Create shared `SupabaseClient` singleton
- [ ] Write unit tests for each service

#### Week 3: Adapters & Bridges
- [ ] Build `LegacyBridge` (mount React components in legacy pages)
- [ ] Build `EventBusAdapter` (sync events between legacy ↔ React)
- [ ] Build `AuthBridge` (sync auth state)
- [ ] Build `FeatureFlagAdapter` (control rollout)
- [ ] Test mounting a simple React component in `2card.html`

**Success Criteria**:
- ✅ React app builds successfully
- ✅ Shared services work in both legacy and React
- ✅ Can mount React component in legacy page
- ✅ Feature flags control visibility

---

### Phase 1: Auth Overhaul (Weeks 4-7)

**Goal**: Implement OAuth providers and profile enrichment.

#### Week 4: OAuth Configuration
- [ ] Set up LinkedIn OAuth app (get client ID/secret)
- [ ] Set up Facebook OAuth app
- [ ] Set up Google OAuth app
- [ ] Configure Supabase with OAuth credentials
- [ ] Test OAuth callback flow manually

#### Week 5: Auth UI (React)
- [ ] Build `LoginModal` component (OAuth buttons + magic link)
- [ ] Build `OAuthButton` component (reusable)
- [ ] Build `MagicLinkForm` component
- [ ] Build `AuthCallback` page (handles OAuth redirect)
- [ ] Style with brand colors

#### Week 6: Profile Enrichment
- [ ] Build `ProfileEnrichmentService`
- [ ] Implement LinkedIn data pulling (name, photo, headline, skills)
- [ ] Implement Facebook data pulling (photo)
- [ ] Implement Google data pulling (photo)
- [ ] Auto-create `community.*` row on first login

#### Week 7: Integration & Testing
- [ ] Integrate OAuth login into `2card.html` (feature flag: 25% rollout)
- [ ] Add analytics tracking (which provider users choose)
- [ ] Test edge cases (existing users, OAuth errors, email conflicts)
- [ ] Write E2E test for OAuth flow

**Success Criteria**:
- ✅ Users can sign in with LinkedIn, Facebook, or Google
- ✅ Profile auto-populated with OAuth data
- ✅ Avatar pulled from social provider
- ✅ No existing users broken (backward compatible)

---

### Phase 2: Onboarding (Weeks 8-10)

**Goal**: Multi-step progressive onboarding for new users.

#### Week 8: Onboarding UI
- [ ] Build `OnboardingFlow` orchestrator
- [ ] Build `OnboardingWelcome` (profile completeness prompt)
- [ ] Build `OnboardingSkills` (skill selection with autocomplete)
- [ ] Build `OnboardingBio` (bio, availability, looking for)
- [ ] Build `OnboardingSuccess` (next actions)

#### Week 9: Skills Features
- [ ] Build `SkillAutocomplete` component
- [ ] Fetch skill suggestions from LinkedIn (if available)
- [ ] Load skill taxonomy from database
- [ ] Implement proficiency selection (Beginner/Intermediate/Expert)
- [ ] Save skills to `profile_skills` table

#### Week 10: Integration
- [ ] Trigger onboarding after OAuth login (if profile <80% complete)
- [ ] Add skip option (allow partial completion)
- [ ] Calculate and display profile completeness score
- [ ] Redirect to dashboard after completion
- [ ] A/B test: onboarding vs no onboarding (completion rate)

**Success Criteria**:
- ✅ New users complete onboarding >70% of the time
- ✅ Profile completeness increases from ~40% → ~85%
- ✅ Time to value: <3 minutes from signup to first connection

---

### Phase 3: Directory Core (Weeks 11-15)

**Goal**: Build the talent directory with advanced search.

#### Week 11: Directory UI
- [ ] Build `DirectoryPage` (main search interface)
- [ ] Build `SearchFilters` component (skills, availability, etc.)
- [ ] Build `UserCardList` component (grid of users)
- [ ] Build `UserCard` component (enhanced version with social proof)
- [ ] Add pagination

#### Week 12: Search Implementation
- [ ] Implement `DirectoryService.search()` with full filters
- [ ] Create `community_profiles_view` materialized view
- [ ] Optimize Postgres queries (use indexes)
- [ ] Add full-text search with ranking
- [ ] Test with 1000+ user dataset

#### Week 13: Skills Filtering
- [ ] Implement "Must have ALL skills" filter
- [ ] Implement "Must have ANY skills" filter
- [ ] Implement "Exclude skills" filter
- [ ] Add skill chip UI (click to add to filter)
- [ ] Save recent searches to localStorage

#### Week 14: Social Proof Display
- [ ] Show verification badges (LinkedIn, Facebook)
- [ ] Show endorsement count
- [ ] Show connection count
- [ ] Show "last active" timestamp
- [ ] Add profile completeness indicator

#### Week 15: Integration & Polish
- [ ] Replace legacy search in `2card.html` with React (feature flag: 50%)
- [ ] Add loading states, empty states
- [ ] Add error handling
- [ ] Performance optimization (virtualization for long lists)
- [ ] Analytics: track search queries, result clicks

**Success Criteria**:
- ✅ Directory search returns results in <500ms
- ✅ Users can filter by 5+ criteria simultaneously
- ✅ Search relevance: 80%+ user satisfaction
- ✅ Mobile-responsive design

---

### Phase 4: Matching Engine (Weeks 16-18)

**Goal**: Intelligent matching and suggestions.

#### Week 16: Algorithm Implementation
- [ ] Implement `MatchingEngine.calculateMatchScore()` (multi-factor)
- [ ] Implement skill complementarity scoring
- [ ] Implement availability alignment scoring
- [ ] Implement goal alignment scoring
- [ ] Implement social proof scoring
- [ ] Implement mutual connection scoring

#### Week 17: Suggestions UI
- [ ] Build `SuggestionsPanel` component (for dashboard)
- [ ] Build `MatchScore` component (visual score breakdown)
- [ ] Show top 8 suggestions on login
- [ ] Explain WHY each person is suggested
- [ ] Add "Show More" / "Refresh Suggestions"

#### Week 18: Integration
- [ ] Add suggestions to dashboard (feature flag: 100%)
- [ ] Track suggestion clicks → connection rate
- [ ] A/B test: algorithm weights (optimize for acceptance rate)
- [ ] Add "Not Interested" feedback (improves future suggestions)

**Success Criteria**:
- ✅ Suggestion → connection rate: >15%
- ✅ Users understand why they were matched
- ✅ Algorithm runs in <1s for 1000+ user database

---

### Phase 5: Profile Management (Weeks 19-22)

**Goal**: Full-featured profile editing in React.

#### Week 19-20: Profile Edit UI
- [ ] Build `ProfileForm` (comprehensive edit form)
- [ ] Build `SkillsInput` (add/remove/edit skills)
- [ ] Build `InterestsInput`
- [ ] Build `AvailabilitySelector`
- [ ] Build `BioEditor` (rich text, markdown preview)
- [ ] Build `PhotoUpload` (with crop, resize)

#### Week 21: Profile Display
- [ ] Build `ProfileCard` (public profile view)
- [ ] Build `ProfileProgress` (completeness widget)
- [ ] Build `EndorsementsList` (show who endorsed)
- [ ] Build `ConnectionsList` (mutual connections)
- [ ] Add "Edit Profile" / "View as Others See It" toggle

#### Week 22: Integration
- [ ] Replace legacy profile form with React (feature flag: 75%)
- [ ] Add real-time preview
- [ ] Add validation (required fields, min lengths)
- [ ] Save drafts to localStorage (don't lose work)
- [ ] Analytics: track field completion rates

**Success Criteria**:
- ✅ Profile edit conversion: >90% save rate
- ✅ Time to edit: <2 minutes average
- ✅ Profile completeness increases by 20% after edit

---

### Phase 6: Connections (Weeks 23-25)

**Goal**: Connection requests, notifications, endorsements.

#### Week 23: Connection Requests
- [ ] Build `ConnectionButton` (on user cards)
- [ ] Build `ConnectionRequestModal` (add intro message)
- [ ] Build `NotificationDropdown` (inbox for requests)
- [ ] Implement accept/decline actions
- [ ] Add Supabase realtime subscriptions (live updates)

#### Week 24: Endorsements
- [ ] Build `EndorseButton` (on skill chips)
- [ ] Build `EndorseModal` (select skills to endorse)
- [ ] Implement endorsement limits (max 3 per user per day)
- [ ] Show endorsement history
- [ ] Auto-verify skills with 3+ endorsements

#### Week 25: Notifications
- [ ] Build notification system (toast + dropdown)
- [ ] Email notifications (optional, via Supabase)
- [ ] Push notifications (PWA, optional)
- [ ] Mark as read/unread
- [ ] Notification preferences (settings page)

**Success Criteria**:
- ✅ Connection acceptance rate: >60%
- ✅ Endorsement engagement: >30% of users endorse someone
- ✅ Notification delivery: <5 seconds latency

---

### Phase 7: Full SPA (Weeks 26-29)

**Goal**: Convert entire app to React SPA with routing.

#### Week 26-27: Routing & Pages
- [ ] Set up React Router
- [ ] Build `DashboardPage` (suggestions, activity feed)
- [ ] Build `DirectoryPage` (already built, integrate routing)
- [ ] Build `ProfilePage` (view/edit profile)
- [ ] Build `SettingsPage` (preferences, privacy)
- [ ] Build `NotificationsPage` (full inbox view)

#### Week 28: Layout & Navigation
- [ ] Build `AppLayout` (header, sidebar, main content)
- [ ] Build `NavBar` (top nav with user menu)
- [ ] Build `Sidebar` (quick links, profile widget)
- [ ] Build `Footer`
- [ ] Make responsive (mobile hamburger menu)

#### Week 29: Data Management
- [ ] Migrate to React Query for all data fetching
- [ ] Set up global state (Zustand stores)
- [ ] Implement optimistic updates (connections, endorsements)
- [ ] Add caching strategy (stale-while-revalidate)
- [ ] Performance audit (Lighthouse score >90)

**Success Criteria**:
- ✅ SPA loads in <2s (First Contentful Paint)
- ✅ Navigation is instant (no full page reloads)
- ✅ Works offline (service worker caching)
- ✅ Mobile-friendly (responsive design)

---

### Phase 8: Legacy Removal (Weeks 30-32)

**Goal**: Clean up old code, optimize bundle, final polish.

#### Week 30: Traffic Cutover
- [ ] Set feature flags to 100% React for all features
- [ ] Monitor error rates, user complaints
- [ ] Redirect `2card.html` → `/app/` (permanent)
- [ ] Add "Legacy mode" toggle (for emergencies)

#### Week 31: Code Removal
- [ ] Delete `assets/js/_legacy/` directory
- [ ] Remove unused CSS
- [ ] Remove jQuery dependency
- [ ] Update CLAUDE.md with React-only architecture
- [ ] Archive old code (git tag `pre-react-migration`)

#### Week 32: Optimization
- [ ] Code splitting (lazy load routes)
- [ ] Tree shaking (remove unused exports)
- [ ] Image optimization (WebP, lazy loading)
- [ ] Bundle size analysis (aim for <300KB gzipped)
- [ ] Final Lighthouse audit (score >95)

**Success Criteria**:
- ✅ Zero legacy code in production
- ✅ Bundle size <300KB gzipped
- ✅ Lighthouse performance score >95
- ✅ Zero increase in error rate vs legacy

---

## API Contracts & Module Boundaries

### Shared Service Contract

All shared services follow this pattern:

```typescript
// TypeScript interface (for documentation)
interface IService {
  // All methods are static (no instances)
  // All methods return Promises
  // All methods throw errors (caller handles)
}

// Example: ProfileService contract
interface IProfileService {
  getProfile(userId: string): Promise<Profile>;
  updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile>;
  deleteProfile(userId: string): Promise<void>;
  searchProfiles(filters: SearchFilters): Promise<SearchResult>;
}
```

### Event Bus Contract

```typescript
// Standard event format
interface DexEvent {
  name: string;              // 'auth:login', 'profile:updated'
  detail: any;               // Event-specific payload
  timestamp: number;         // Date.now()
  source: 'legacy' | 'react'; // Where it came from
}

// Standard events
const EVENTS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CHANGED: 'auth:changed',

  // Profile
  PROFILE_UPDATED: 'profile:updated',
  PROFILE_DELETED: 'profile:deleted',

  // Connections
  CONNECTION_REQUESTED: 'connection:requested',
  CONNECTION_ACCEPTED: 'connection:accepted',
  CONNECTION_DECLINED: 'connection:declined',

  // Matching
  SUGGESTIONS_UPDATED: 'suggestions:updated',

  // UI
  NOTIFICATION_SHOW: 'notification:show',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close'
};
```

### Data Synchronization Rules

**Rule 1**: Supabase is the source of truth
- Never store critical data only in React state or localStorage
- Always fetch fresh data on mount (with cache)

**Rule 2**: Optimistic updates for UX
- Update UI immediately, then sync with server
- Roll back on error

**Rule 3**: Event bus for cross-module communication
- Don't import React components in legacy code (tight coupling)
- Use events: legacy emits → React listens, and vice versa

---

## Data Migration Strategy

### Existing Users (Zero Downtime)

**Problem**: We can't break existing users during migration.

**Solution**: Backward-compatible schema changes.

```sql
-- Step 1: Add new columns (don't delete old ones yet)
ALTER TABLE community ADD COLUMN headline VARCHAR(200);
ALTER TABLE community ADD COLUMN auth_provider VARCHAR(20);
-- ... etc

-- Step 2: Backfill data for existing users
UPDATE community
SET auth_provider = 'email'
WHERE auth_provider IS NULL;

-- Step 3: (After migration complete) Drop unused columns
-- ALTER TABLE community DROP COLUMN old_field;  -- Only after 100% on React
```

### OAuth Migration for Existing Email Users

**Scenario**: User signed up with magic link, now wants to link LinkedIn.

```javascript
// react-app/src/features/auth/LinkOAuthService.js

export class LinkOAuthService {

  /**
   * Link OAuth provider to existing email account
   */
  static async linkProvider(provider) {
    const user = await AuthService.getUser();

    if (!user) {
      throw new Error('Must be logged in to link account');
    }

    // Trigger OAuth flow
    await supabase.auth.linkIdentity({ provider });

    // After callback, enrich profile with OAuth data
    const { data: identities } = await supabase.auth.getUserIdentities();
    const newIdentity = identities.find(i => i.provider === provider);

    if (newIdentity) {
      await this.enrichProfileFromIdentity(user.id, provider, newIdentity);
    }
  }

  /**
   * Enrich existing profile with OAuth data
   */
  static async enrichProfileFromIdentity(userId, provider, identity) {
    const enriched = await ProfileEnrichmentService.enrichFromProvider(
      { id: userId },
      provider,
      identity.identity_data
    );

    // Update community profile (merge, don't overwrite)
    await supabase
      .from('community')
      .update({
        image_url: enriched.image_url || undefined,  // Only update if OAuth has photo
        headline: enriched.headline || undefined,
        verified_linkedin: provider === 'linkedin',
        verified_facebook: provider === 'facebook',
        social_links: enriched.social_links
      })
      .eq('user_id', userId);
  }
}
```

---

## Testing & Quality Assurance

### Test Strategy

| Test Type | Coverage | Tools | When |
|-----------|----------|-------|------|
| **Unit Tests** | Services, utilities | Jest | Every commit |
| **Integration Tests** | API calls, DB queries | Jest + Supabase local | Before merge |
| **Component Tests** | React components | React Testing Library | Every component |
| **E2E Tests** | Critical user flows | Playwright | Before deploy |
| **Visual Regression** | UI consistency | Percy/Chromatic | Weekly |
| **Performance Tests** | Load, bundle size | Lighthouse CI | Before deploy |

### Critical Test Cases

#### 1. OAuth Flow (E2E)
```javascript
// tests/e2e/auth-flow.spec.js

import { test, expect } from '@playwright/test';

test('OAuth login flow - LinkedIn', async ({ page }) => {
  // Navigate to login
  await page.goto('https://charlestonhacks.com/2card.html');
  await page.click('#login-btn');

  // Click LinkedIn OAuth
  await page.click('button:has-text("LinkedIn")');

  // LinkedIn redirects to their site (mock in test)
  await expect(page).toHaveURL(/linkedin\.com/);

  // Enter LinkedIn credentials (use test account)
  await page.fill('input[name="session_key"]', process.env.TEST_LINKEDIN_EMAIL);
  await page.fill('input[name="session_password"]', process.env.TEST_LINKEDIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Authorize app
  await page.click('button:has-text("Allow")');

  // Redirect back to app
  await expect(page).toHaveURL(/charlestonhacks\.com\/app/);

  // Verify profile created
  const userName = await page.textContent('.user-name');
  expect(userName).toBeTruthy();
});
```

#### 2. Profile Completeness (Unit)
```javascript
// tests/unit/ProfileCompletenessService.test.js

import { ProfileCompletenessService } from '../../src/features/profile/ProfileCompletenessService';

describe('ProfileCompletenessService', () => {
  test('calculates score correctly', () => {
    const profile = {
      name: 'John Doe',
      email: 'john@example.com',
      image_url: 'https://...',
      bio: 'A detailed bio about my experience and interests that is over 50 characters long.',
      skills: ['React', 'Node.js', 'PostgreSQL'],
      interests: ['AI', 'Web3'],
      headline: 'Full-Stack Developer',
      availability: 'Part-time',
      looking_for: ['Co-founder'],
      verified_linkedin: true,
      verified_email: true,
      connection_count: 5
    };

    const score = ProfileCompletenessService.calculate(profile);
    expect(score).toBe(100);  // Perfect profile
  });

  test('suggests improvements', () => {
    const incompleteProfile = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      skills: ['React']  // Only 1 skill
    };

    const suggestions = ProfileCompletenessService.getSuggestions(incompleteProfile);
    expect(suggestions).toContainEqual(
      expect.objectContaining({
        field: 'image_url',
        impact: 'high'
      })
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({
        field: 'skills',
        message: expect.stringContaining('Add at least 3 skills')
      })
    );
  });
});
```

#### 3. Matching Algorithm (Unit)
```javascript
// tests/unit/MatchingEngine.test.js

import { MatchingEngine } from '../../src/features/matching/MatchingEngine';

describe('MatchingEngine', () => {
  test('skill complementarity - perfect match', () => {
    const me = {
      skills: [{ name: 'React' }, { name: 'Design' }]
    };
    const them = {
      skills: [{ name: 'Node.js' }, { name: 'PostgreSQL' }]
    };

    const score = MatchingEngine.skillComplementarity(me, them);
    expect(score).toBeCloseTo(0.5);  // Balanced complementarity
  });

  test('availability alignment', () => {
    const me = { availability: 'Full-time' };
    const themFullTime = { availability: 'Full-time' };
    const themWeekends = { availability: 'Weekends' };

    expect(MatchingEngine.availabilityScore(me, themFullTime)).toBe(1.0);
    expect(MatchingEngine.availabilityScore(me, themWeekends)).toBeLessThan(0.5);
  });
});
```

---

## Deployment & Rollout

### Build Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

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
        run: cd react-app && npm ci

      - name: Run tests
        run: cd react-app && npm test

      - name: Build React app
        run: cd react-app && npm run build

      - name: Copy build to root
        run: |
          rm -rf react-dist
          mv react-app/build react-dist

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
          cname: charlestonhacks.com
```

### Gradual Rollout Plan

| Week | Feature Flag % | Monitoring | Rollback Trigger |
|------|---------------|------------|------------------|
| 1 | 10% | Error rate, auth success | >5% error increase |
| 2 | 25% | Onboarding completion | <60% completion |
| 3 | 50% | Search latency, CTR | >2s search time |
| 4 | 75% | Match quality, engagement | <10% suggestion clicks |
| 5 | 100% | All metrics | User complaints >10/day |

### Monitoring & Alerts

```javascript
// react-app/src/services/MonitoringService.js

export class MonitoringService {

  static init() {
    // Error tracking (Sentry or similar)
    this.initErrorTracking();

    // Performance monitoring
    this.initPerformanceMonitoring();

    // Analytics
    this.initAnalytics();
  }

  static trackEvent(eventName, properties = {}) {
    // Track to analytics platform (PostHog, Mixpanel, etc.)
    if (window.analytics) {
      window.analytics.track(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
        source: 'react-app'
      });
    }
  }

  static trackError(error, context = {}) {
    console.error('[Error]', error, context);

    // Send to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: context
      });
    }
  }

  static trackPerformance(metric, value) {
    // Track performance metric
    if (window.performance?.measure) {
      window.performance.measure(metric);
    }

    this.trackEvent('performance_metric', {
      metric,
      value,
      unit: 'ms'
    });
  }
}
```

### Key Metrics Dashboard

Monitor these in real-time:

1. **Auth Metrics**
   - OAuth provider distribution (LinkedIn vs Facebook vs Email)
   - Auth success rate
   - Profile enrichment success rate

2. **Onboarding Metrics**
   - Completion rate
   - Time to complete
   - Drop-off points (which step?)

3. **Directory Metrics**
   - Search queries per user
   - Results per search
   - Click-through rate
   - Zero-results rate

4. **Matching Metrics**
   - Suggestion → view rate
   - Suggestion → connection rate
   - Match score distribution

5. **Engagement Metrics**
   - Daily active users
   - Connection requests per day
   - Endorsements per day
   - Profile updates per week

6. **Technical Metrics**
   - Page load time (p50, p95, p99)
   - API response time
   - Error rate
   - Bundle size

---

## Appendix: Code Examples

### Full Example: UserCard Component

```javascript
// react-app/src/features/directory/components/UserCard.jsx

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { ConnectionService } from '../../../shared/services/ConnectionService';
import { EndorsementService } from '../../../shared/services/EndorsementService';
import './UserCard.css';

export function UserCard({ user, onConnect, onEndorse, showMatchScore = false }) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(user.connection_status);

  async function handleConnect() {
    if (!currentUser) {
      alert('Please login to connect');
      return;
    }

    setLoading(true);
    try {
      await ConnectionService.sendRequest(user.id, 'Would love to collaborate!');
      setConnectionStatus('pending');
      onConnect?.(user.id);
    } catch (error) {
      alert('Failed to send connection request');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEndorse(skillName) {
    if (!currentUser) {
      alert('Please login to endorse');
      return;
    }

    try {
      await EndorsementService.endorse(user.id, skillName);
      onEndorse?.(user.id, skillName);
    } catch (error) {
      alert('Failed to endorse skill');
      console.error(error);
    }
  }

  return (
    <div className="user-card">
      {/* Header */}
      <div className="user-card-header">
        <img
          src={user.image_url || 'https://via.placeholder.com/80'}
          alt={user.name}
          className="user-avatar"
        />
        <div className="user-info">
          <h3 className="user-name">
            {user.name}
            {user.verified_linkedin && <span className="badge linkedin" title="LinkedIn Verified">in</span>}
            {user.verified_facebook && <span className="badge facebook" title="Facebook Verified">f</span>}
          </h3>
          {user.headline && <p className="user-headline">{user.headline}</p>}
          <p className="user-meta">
            {user.availability && <span>{user.availability}</span>}
            {user.location && <span> • {user.location}</span>}
          </p>
        </div>
      </div>

      {/* Match Score */}
      {showMatchScore && user.match_score && (
        <div className="match-score">
          <div className="score-bar" style={{ width: `${user.match_score.score * 100}%` }} />
          <span className="score-label">{Math.round(user.match_score.score * 100)}% match</span>
          <p className="score-explanation">{user.match_score.explanation}</p>
        </div>
      )}

      {/* Bio */}
      {user.bio && (
        <p className="user-bio">
          {user.bio.length > 150 ? `${user.bio.slice(0, 150)}...` : user.bio}
        </p>
      )}

      {/* Skills */}
      <div className="user-skills">
        {user.skills?.slice(0, 6).map(skill => (
          <div
            key={skill.name}
            className={`skill-chip ${skill.verified ? 'verified' : ''}`}
            style={{ backgroundColor: skill.color || '#555' }}
          >
            <span>{skill.name}</span>
            {skill.proficiency && <small className="proficiency">{skill.proficiency}</small>}
            <button
              className="endorse-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleEndorse(skill.name);
              }}
              title="Endorse this skill"
            >
              +{skill.endorsement_count || 0}
            </button>
          </div>
        ))}
        {user.skills?.length > 6 && (
          <span className="skills-more">+{user.skills.length - 6} more</span>
        )}
      </div>

      {/* Social Proof */}
      <div className="user-stats">
        <span title="Endorsements">⭐ {user.endorsement_count || 0}</span>
        <span title="Connections">👥 {user.connection_count || 0}</span>
        {user.last_active && (
          <span title="Last active">
            🕐 {formatLastActive(user.last_active)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="user-actions">
        {connectionStatus === 'accepted' ? (
          <button className="btn-secondary" disabled>✓ Connected</button>
        ) : connectionStatus === 'pending' ? (
          <button className="btn-secondary" disabled>⏳ Request Sent</button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? 'Connecting...' : '🤝 Connect'}
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={() => window.location.href = `/app/profile/${user.id}`}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

function formatLastActive(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
```

---

## Summary & Next Steps

This ultra-comprehensive plan provides:

1. ✅ **OAuth-first auth system** with LinkedIn, Facebook, Google
2. ✅ **Profile enrichment** from social platforms (photo, skills, headline)
3. ✅ **Enhanced talent directory** with advanced search, filtering, matching
4. ✅ **Clear module boundaries** for legacy and React coexistence
5. ✅ **Database schema evolution** with backward compatibility
6. ✅ **Detailed migration phases** (32 weeks, 8 months)
7. ✅ **Testing strategy** (unit, integration, E2E)
8. ✅ **Deployment plan** with gradual rollout

### Immediate Next Steps (Week 1)

1. **Set up OAuth apps**:
   - [ ] Create LinkedIn app → Get client ID/secret
   - [ ] Create Facebook app → Get app ID/secret
   - [ ] Create Google Cloud project → Get OAuth credentials
   - [ ] Configure in Supabase dashboard

2. **Set up React app**:
   ```bash
   npx create-react-app react-app
   cd react-app
   npm install @supabase/supabase-js react-router-dom zustand @tanstack/react-query
   ```

3. **Create shared services**:
   - [ ] Extract `AuthService` from `main.js`
   - [ ] Extract `ProfileService`
   - [ ] Create `SupabaseClient` singleton

4. **Database migrations**:
   ```bash
   # Run migration to add OAuth fields
   psql $DATABASE_URL < migrations/001_add_oauth_fields.sql
   ```

5. **Test OAuth flow**:
   - [ ] Manual test: Login with LinkedIn
   - [ ] Verify profile auto-created
   - [ ] Verify avatar pulled from LinkedIn

---

**Questions? Concerns? Ready to start?** This plan is comprehensive but flexible - adjust timelines and priorities based on your team's capacity and user feedback.

**Last Updated**: 2025-10-04
**Next Review**: After Phase 0 completion
