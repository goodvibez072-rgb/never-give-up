import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse as JSON to get clean error message
    let errorMessage = text;
    let errorDetails = null;
    
    try {
      const errorData = JSON.parse(text);
      // Extract just the message if it exists
      errorMessage = errorData.message || text;
      errorDetails = errorData.details || null;
    } catch {
      // If not JSON, use the text as-is
      errorMessage = text;
    }
    
    // Create enhanced error with status code
    interface ApiError extends Error {
      status: number;
      statusText: string;
      details: unknown;
    }
    
    const error = new Error(errorMessage) as ApiError;
    error.status = res.status;
    error.statusText = res.statusText;
    error.details = errorDetails;
    
    // Add user-friendly messages for common errors
    if (res.status === 404) {
      error.message = errorMessage || 'The requested resource was not found';
    } else if (res.status === 403) {
      error.message = errorMessage || 'You do not have permission to access this resource';
    } else if (res.status === 500) {
      error.message = errorMessage || 'An internal server error occurred. Please try again later';
    } else if (res.status === 503) {
      error.message = 'Service temporarily unavailable. Please try again in a moment';
    } else if (res.status >= 500) {
      error.message = errorMessage || 'A server error occurred. Please try again later';
    }
    
    throw error;
  }
}

// SECURITY FIX: CSRF token cache and fetching
// Cache includes an expiry so a stale token (e.g. after server restart) is
// automatically refreshed rather than retried forever.
let csrfToken: string | null = null;
let csrfTokenExpiry: number = 0;
const CSRF_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

function invalidateCsrfCache() {
  csrfToken = null;
  csrfTokenExpiry = 0;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken && Date.now() < csrfTokenExpiry) {
    return csrfToken;
  }

  // Invalidate before fetching to avoid a race returning a partially-set value
  csrfToken = null;

  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    csrfTokenExpiry = Date.now() + CSRF_TOKEN_TTL;
    return csrfToken || "";
  } catch (error) {
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // SECURITY FIX: Include CSRF token for state-changing requests
  if (method !== "GET" && method !== "HEAD") {
    const token = await getCsrfToken();
    headers["x-csrf-token"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If CSRF validation failed, invalidate the stale cached token and retry once
  // with a freshly-fetched token. This handles the case where the server restarted
  // and issued a new CSRF secret, invalidating any previously-cached tokens.
  if (res.status === 403 && method !== "GET" && method !== "HEAD") {
    const cloned = res.clone();
    const body = await cloned.json().catch(() => ({}));
    const msg: string = (body.message || body.error || "").toLowerCase();
    if (msg.includes("csrf") || msg.includes("invalid") || msg.includes("forbidden")) {
      invalidateCsrfCache();
      const freshToken = await getCsrfToken();
      headers["x-csrf-token"] = freshToken;
      const retryRes = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      await throwIfResNotOk(retryRes);
      return retryRes;
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Enhanced retry logic for network failures
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Don't retry on 4xx errors (client errors) except 408 (timeout) and 429 (rate limit)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: number }).status || 0;
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return false;
    }
  }
  
  // Retry up to 3 times for network errors and 5xx errors
  return failureCount < 3;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // PERFORMANCE: Smarter staleTime based on query type
      // Static content like series/manga details can be cached longer
      // Dynamic content like comments should refresh more frequently
      staleTime: 5 * 60 * 1000, // 5 minutes default (reduced from Infinity for fresher data)
      gcTime: 10 * 60 * 1000, // Keep unused data for 10 minutes (formerly cacheTime)
      retry: shouldRetry,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: shouldRetry,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
