import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

// Mock Supabase
vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: null },
        error: null
      })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: {} }
      })),
      signInWithOAuth: vi.fn(() => Promise.resolve({
        data: { url: 'https://oauth-url.com' },
        error: null
      })),
      signInWithOtp: vi.fn(() => Promise.resolve({
        error: null
      })),
      signOut: vi.fn(() => Promise.resolve({
        error: null
      })),
    }
  }
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      session: null,
      loading: true
    });
  });

  it('should initialize with loading state', () => {
    const state = useAuthStore.getState();
    expect(state.loading).toBe(true);
    expect(state.user).toBe(null);
    expect(state.session).toBe(null);
  });

  it('should initialize auth state', async () => {
    const state = useAuthStore.getState();
    await state.initialize();

    // Should no longer be loading
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('should sign in with OAuth', async () => {
    const state = useAuthStore.getState();
    const result = await state.signInWithOAuth('linkedin_oidc');

    expect(result).toBeDefined();
    expect(result.url).toBe('https://oauth-url.com');
  });

  it('should sign in with magic link', async () => {
    const state = useAuthStore.getState();
    await state.signInWithMagicLink('test@example.com');

    // Should not throw
    expect(true).toBe(true);
  });

  it('should sign out', async () => {
    const state = useAuthStore.getState();

    // Set initial user
    useAuthStore.setState({
      user: { id: '123', email: 'test@example.com' },
      session: { access_token: 'token' }
    });

    await state.signOut();

    // User should be null
    const newState = useAuthStore.getState();
    expect(newState.user).toBe(null);
    expect(newState.session).toBe(null);
  });
});
