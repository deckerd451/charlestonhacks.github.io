/**
 * Mantine Theme Configuration
 *
 * Customize the look and feel of the application by modifying this file.
 * Documentation: https://mantine.dev/theming/theme-object/
 */

export const mantineTheme = {
  /** Color scheme: 'light' | 'dark' | 'auto' */
  colorScheme: 'dark',

  /** Primary color used for buttons, links, etc. */
  primaryColor: 'cyan',

  /** Custom color palette */
  colors: {
    // Dark mode colors
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
    // Custom brand colors (optional)
    brand: [
      '#E3FAFC',
      '#C5F6FA',
      '#99E9F2',
      '#66D9E8',
      '#3BC9DB',
      '#22B8CF',
      '#15AABF',
      '#1098AD',
      '#0C8599',
      '#0B7285',
    ],
  },

  /** Default border radius for all components */
  defaultRadius: 'md', // xs | sm | md | lg | xl

  /** Font configuration */
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, sans-serif',

  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: 700,
    sizes: {
      h1: { fontSize: '2.125rem', lineHeight: 1.3 },
      h2: { fontSize: '1.625rem', lineHeight: 1.35 },
      h3: { fontSize: '1.375rem', lineHeight: 1.4 },
      h4: { fontSize: '1.125rem', lineHeight: 1.45 },
      h5: { fontSize: '1rem', lineHeight: 1.5 },
      h6: { fontSize: '0.875rem', lineHeight: 1.5 },
    },
  },

  /** Spacing scale (used for margins, paddings, etc.) */
  spacing: {
    xs: '0.625rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '2rem',
  },

  /** Component-specific defaults */
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        padding: 'lg',
        radius: 'md',
        withBorder: true,
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    MultiSelect: {
      defaultProps: {
        radius: 'md',
      },
    },
  },

  /** Global styles */
  globalStyles: (theme) => ({
    body: {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
      color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
    },
  }),
};

/**
 * Availability badge color mapping
 * Used for color-coding user availability status
 */
export const availabilityColors = {
  'Full-time': 'green',
  'Part-time': 'blue',
  'Weekends': 'orange',
  'Evenings': 'purple',
  'Flexible': 'teal',
  'Unavailable': 'gray',
};

/**
 * Profile completeness calculation
 * Returns a score from 0-100 based on profile fields
 */
export function calculateProfileCompleteness(profile) {
  let score = 0;
  if (profile?.name) score += 20;
  if (profile?.email) score += 20;
  if (profile?.image_url) score += 20;
  if (profile?.bio && profile.bio.length > 50) score += 15;
  if (profile?.skills?.length >= 3) score += 15;
  if (profile?.interests?.length >= 2) score += 10;
  return score;
}
