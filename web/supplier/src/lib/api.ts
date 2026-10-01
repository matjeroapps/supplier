export type ApiConfig = {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
  renewToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
};

export function createApiClient(config: ApiConfig) {
  async function request(method: string, path: string, body?: unknown): Promise<Response> {
    const token = await config.getAccessToken?.();
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(new URL(path, config.baseUrl), {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (res.status === 401 && config.renewToken) {
      let renewedToken: string | null = null;
      try {
        renewedToken = await config.renewToken();
      } catch {
        renewedToken = null;
      }

      if (renewedToken) {
        const retryHeaders: Record<string, string> = {
          Authorization: `Bearer ${renewedToken}`
        };
        if (body !== undefined) {
          retryHeaders['Content-Type'] = 'application/json';
        }

        const retryRes = await fetch(new URL(path, config.baseUrl), {
          method,
          headers: retryHeaders,
          body: body === undefined ? undefined : JSON.stringify(body)
        });

        if (retryRes.status === 401) {
          config.onUnauthorized?.();
        }
        return retryRes;
      } else {
        config.onUnauthorized?.();
        return res;
      }
    }

    if (res.status === 401) {
      config.onUnauthorized?.();
    }

    return res;
  }

  return {
    get(path: string): Promise<Response> {
      return request('GET', path);
    },
    post(path: string, body?: unknown): Promise<Response> {
      return request('POST', path, body);
    },
    put(path: string, body?: unknown): Promise<Response> {
      return request('PUT', path, body);
    },
    delete(path: string): Promise<Response> {
      return request('DELETE', path);
    }
  };
}
