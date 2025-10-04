# CharlestonHacks Site Map

## Main Navigation

### Home
- **index.html** - Interactive card-based landing page with neural background
  - Features: Splash screen, countdown timer, BTC price, audio effects
  - Links to all major sections via clickable card regions

## Core Features

### Community & Networking
- **2card.html** - Innovation Engine (primary community platform)
  - User authentication (magic links)
  - Profile creation (skills, interests, bio, photo)
  - Individual search by skills
  - Team builder
  - Leaderboard with endorsements
  - Connection requests and notifications

- **neural.html** - Dex AGI Neural Interactive
  - Visual network of user connections
  - Interactive canvas with drag-and-drop nodes
  - Layout toggling (force-directed vs grid)
  - Connection suggestions

- **dex.html** - Dex AGI (alternate interface)
  - Hash-based routing (dashboard, onboarding)
  - Event bus architecture

- **profiles.html** - Team Gallery
  - Display CharlestonHacks team members
  - Profile cards with photos and info

### Games & Interactive
- **cardmatchgame.html** - Matching Game
  - Card matching game with CharlestonHacks theme
  - Dynamic backgrounds

### Events

#### Past Events
- **harborhack24.html** - Harbor Hack 2024
- **harborhack23.html** - Harbor Hack 2023
- **hacknights24.html** - Hack Nights 2024
- **summerhack.html** - Summer Hack
- **meetupmashup.html** - Meetup Mashup
- **techweek.html** - Tech Week

#### Special Pages
- **innovationengine.html** - Innovation Engine landing (may redirect to 2card.html)
- **hackops.html** - Hack Ops information

### Information & Resources
- **docs.html** - Documentation and resources
  - Event documentation
  - Photo galleries (lightgallery integration)

- **news.html** - News and updates
  - Latest CharlestonHacks news
  - Photo galleries

- **Poster.html** - Event poster gallery
  - Visual event materials

### Community Engagement
- **donations.html** - Sponsorship and donations
  - GitHub sponsors link
  - Support information

- **swag.html** - Swag voting and merchandise
  - Vote on swag designs
  - Product showcase

- **subscribe.html** - Mailing list subscription
  - Mailchimp integration
  - Stay updated on events

### Utility Pages
- **experimental.html** - Experimental zone
  - Testing ground for new features
  - Photo galleries

- **splash.html** - Splash screen (standalone)

### Technical/SEO
- **google22f512ce9f62a273.html** - Google site verification

## External Links

From homepage icons section:
- GitHub Sponsors: `https://github.com/sponsors/deckerd451`
- LinkedIn: `https://www.linkedin.com/company/charlestonhacks`
- Instagram: `https://www.instagram.com/charlestonhacks/`
- Facebook: `https://www.facebook.com/deckerdb26354`
- Email: `hello@charlestonhacks.com`
- Public site: `https://charlestonhacks.mailchimpsites.com/`

## Backend Services

### Supabase Database
URL: `https://hvmotpzhliufzomewzfl.supabase.co`

Tables:
- `community` - User profiles
- `skills` - Skills with endorsements
- `signals` - Activity feed
- `feedback` - Connection feedback

### Routing Service (Optional)
- **routingService.js** - Express API on port 4000
  - `/signals` - POST/GET signals
  - `/feedback` - POST/GET feedback

## Navigation Patterns

### From Homepage (index.html)
The main card interface provides these navigation paths:
- Top-left → Poster.html
- Top-center → docs.html
- Top-right → 2card.html
- Middle-left → experimental.html
- Middle-right → swag.html
- Bottom-left → news.html
- Bottom-center → donations.html
- Bottom-right → cardmatchgame.html

### Home Icons (Bottom of index.html)
- Heart → GitHub sponsors
- People-arrows → 2card.html
- Bell → subscribe.html
- LinkedIn, Instagram, Email, Facebook → External social links

## Asset Directories

- **/images/** - Graphics, photos, character cards, backgrounds
- **/icons/** - Icon assets
- **/assets/js/** - JavaScript modules
- **/assets/css/** - Stylesheets
- **/assets/** - Audio files (atmospherel.m4a, chime.mp3, keys.m4a)

## Key User Flows

1. **New visitor** → index.html → Splash screen → Explore via card interface
2. **Community member** → 2card.html → Login → Create profile → Search/Build team
3. **Event attendee** → Specific event page (e.g., harborhack24.html)
4. **Network explorer** → neural.html → View connections graph
5. **Stay updated** → subscribe.html → Join mailing list
