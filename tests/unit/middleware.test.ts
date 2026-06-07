import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

vi.mock('@/lib/supabase/middleware', () => ({
  updateSupabaseSession: vi.fn(),
}));

describe('Middleware Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (urlPath: string): NextRequest => {
    const url = new URL(urlPath, 'http://localhost:3000');
    return new NextRequest(url);
  };

  it('should redirect unauthenticated users from /dashboard to /login', async () => {
    const request = createRequest('/dashboard');
    
    // Mock updateSupabaseSession to return no authenticated user
    const mockResponse = NextResponse.next();
    vi.mocked(updateSupabaseSession).mockResolvedValueOnce({
      response: mockResponse,
      user: null,
    });

    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307); // Temporary Redirect
    expect(response.headers.get('location')).toContain('/login');
  });

  it('should redirect authenticated users from /login to /dashboard', async () => {
    const request = createRequest('/login');
    
    // Mock updateSupabaseSession to return an authenticated user
    const mockResponse = NextResponse.next();
    const mockUser = { id: 'user-123', email: 'user@example.com' } as any;
    vi.mocked(updateSupabaseSession).mockResolvedValueOnce({
      response: mockResponse,
      user: mockUser,
    });

    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('should redirect authenticated users from /signup to /dashboard', async () => {
    const request = createRequest('/signup');
    
    const mockResponse = NextResponse.next();
    const mockUser = { id: 'user-123', email: 'user@example.com' } as any;
    vi.mocked(updateSupabaseSession).mockResolvedValueOnce({
      response: mockResponse,
      user: mockUser,
    });

    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('should allow unauthenticated users to access landing page /', async () => {
    const request = createRequest('/');
    
    const mockResponse = NextResponse.next();
    vi.mocked(updateSupabaseSession).mockResolvedValueOnce({
      response: mockResponse,
      user: null,
    });

    const response = await middleware(request);
    
    // Should pass through (not redirect)
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('should redirect unauthenticated users from /audit to /login', async () => {
    const request = createRequest('/audit');
    
    const mockResponse = NextResponse.next();
    vi.mocked(updateSupabaseSession).mockResolvedValueOnce({
      response: mockResponse,
      user: null,
    });

    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('should redirect unauthenticated users from /audit/results to /login', async () => {
    const request = createRequest('/audit/results');
    
    const mockResponse = NextResponse.next();
    vi.mocked(updateSupabaseSession).mockResolvedValueOnce({
      response: mockResponse,
      user: null,
    });

    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('should return 401 response for protected API route /api/audits when unauthenticated', async () => {
    const request = createRequest('/api/audits');
    
    const mockResponse = NextResponse.next();
    vi.mocked(updateSupabaseSession).mockResolvedValueOnce({
      response: mockResponse,
      user: null,
    });

    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(401);
  });
});
