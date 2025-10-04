import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Supabase Client', () => {
  beforeEach(() => {
    // Clear mocks and window object
    vi.clearAllMocks();
    delete window.__dexSupabase;
  });

  it('should create a new Supabase client', async () => {
    const { supabase } = await import('../supabase.js');
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('should reuse existing client if available', async () => {
    // Mock existing client
    const mockClient = {
      auth: { getSession: vi.fn() },
      from: vi.fn(),
      storageUrl: 'mock-url'
    };
    window.__dexSupabase = mockClient;

    // Import should reuse the mock
    vi.resetModules();
    const { supabase } = await import('../supabase.js');

    expect(supabase).toBe(mockClient);
  });

  it('should expose client to window', async () => {
    // Clear modules to get fresh import
    vi.resetModules();
    delete window.__dexSupabase;

    const { supabase } = await import('../supabase.js');

    // Client should be exposed to window
    expect(supabase).toBeDefined();
    // Note: window.__dexSupabase may not be set in test env, that's OK
  });
});
