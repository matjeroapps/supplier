import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient } from './api';

describe('createApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches Bearer token header when getAccessToken provides a token', async () => {
    const getAccessToken = vi.fn(async () => 'mock-access-token-123');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken
    });

    const res = await api.get('/v1/supplier/products');
    expect(res.status).toBe(200);
    expect(getAccessToken).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/v1/supplier/products' }),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-access-token-123' }
      })
    );
  });

  it('sends request without Authorization header when getAccessToken returns null', async () => {
    const getAccessToken = vi.fn(async () => null);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken
    });

    await api.get('/v1/supplier/products');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/v1/supplier/products' }),
      expect.objectContaining({ headers: undefined })
    );
  });

  it('invokes onUnauthorized callback when response status is 401 and renewToken is not provided', async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      onUnauthorized
    });

    const res = await api.get('/v1/supplier/profile');
    expect(res.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('returns response with status 403 on forbidden access without throwing', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000'
    });

    const res = await api.get('/v1/supplier/profile');
    expect(res.status).toBe(403);
    expect(res.ok).toBe(false);
  });

  it('attaches Bearer token and Content-Type on POST, PUT, DELETE requests', async () => {
    const getAccessToken = vi.fn(async () => 'token-post');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken
    });

    await api.post('/v1/supplier/products', { name: 'Test' });
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/v1/supplier/products' }),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-post'
        },
        body: JSON.stringify({ name: 'Test' })
      })
    );

    await api.put('/v1/supplier/products/1', { name: 'Updated' });
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/v1/supplier/products/1' }),
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-post'
        },
        body: JSON.stringify({ name: 'Updated' })
      })
    );

    await api.delete('/v1/supplier/products/1');
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/v1/supplier/products/1' }),
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-post' }
      })
    );
  });

  it('replays request exactly once with renewed token on initial 401 response', async () => {
    const getAccessToken = vi.fn(async () => 'expired-token');
    const renewToken = vi.fn(async () => 'renewed-token-123');
    const onUnauthorized = vi.fn();

    let callCount = 0;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      callCount++;
      const authHeader = (init?.headers as Record<string, string> | undefined)?.['Authorization'];
      if (callCount === 1) {
        expect(authHeader).toBe('Bearer expired-token');
        return new Response(JSON.stringify({ error: 'Expired token' }), { status: 401 });
      }
      expect(authHeader).toBe('Bearer renewed-token-123');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken,
      renewToken,
      onUnauthorized
    });

    const res = await api.get('/v1/supplier/products');
    expect(res.status).toBe(200);
    expect(renewToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('never retries a second 401 response and invokes onUnauthorized once', async () => {
    const getAccessToken = vi.fn(async () => 'expired-token');
    const renewToken = vi.fn(async () => 'renewed-token-still-invalid');
    const onUnauthorized = vi.fn();

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken,
      renewToken,
      onUnauthorized
    });

    const res = await api.get('/v1/supplier/products');
    expect(res.status).toBe(401);
    expect(renewToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('invokes onUnauthorized once and returns original 401 response when renewToken returns null or throws', async () => {
    const getAccessToken = vi.fn(async () => 'expired-token');
    const renewToken = vi.fn(async () => {
      throw new Error('Renewal failed');
    });
    const onUnauthorized = vi.fn();

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    globalThis.fetch = fetchMock;

    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken,
      renewToken,
      onUnauthorized
    });

    const res = await api.get('/v1/supplier/products');
    expect(res.status).toBe(401);
    expect(renewToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
