/**
 * Client for TrackFlow company API — authentication.
 */

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type UserPublic = {
  id: string;
  email: string;
  is_active: boolean;
  role: string;
  created_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
};

export type MeResponse = {
  email: string;
  role: string;
  profile: Profile | null;
};

export type ProfileUpdatePayload = {
  name: string | null;
  phone: string | null;
  address: string | null;
};

/** localStorage key used for the bearer access token. */
export const TOKEN_KEY = "trackflow_token";

const PUBLIC_AUTH_PATHS = new Set(["/login", "/register"]);

/** A single Pydantic validation error entry. */
export type ValidationErrorItem = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

type AuthRedirectFn = () => void;

let authRedirect: AuthRedirectFn | null = null;

/**
 * Register the app-router redirect used after logout / unauthorized.
 * AuthGuard should call this with `() => router.replace("/login")`.
 */
export function registerAuthRedirect(fn: AuthRedirectFn): void {
  authRedirect = fn;
}

function isPublicAuthPath(): boolean {
  if (typeof window === "undefined") return false;
  return PUBLIC_AUTH_PATHS.has(window.location.pathname);
}

function navigateToLogin(): void {
  if (authRedirect) {
    authRedirect();
    return;
  }
  window.location.assign("/login");
}

/**
 * Clear the session and send the user to /login.
 * No-op on /login and /register so a login 401 never clears or redirects.
 */
export function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  if (isPublicAuthPath()) return;
  localStorage.removeItem(TOKEN_KEY);
  navigateToLogin();
}

/** Explicit logout from the app shell. */
export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  navigateToLogin();
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined. Set it in .env.local (see .env.example).",
    );
  }
  return baseUrl.replace(/\/$/, "");
}

/**
 * Parse an error response. Returns either a string (general error) or an
 * array of validation entries (422 shape).
 */
export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string | ValidationErrorItem[]> {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("detail" in body)) {
      return fallback;
    }
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail as ValidationErrorItem[];
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * If the response is 401, clear the session and redirect (unless on auth pages).
 * Call this for every protected API response before other error handling.
 */
export function redirectIfUnauthorized(response: Response): void {
  if (response.status === 401) {
    handleUnauthorized();
  }
}

export function getAuthToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    handleUnauthorized();
    throw new AuthApiError("Not authenticated", 401);
  }
  return token;
}

/** Authorization header only — safe for multipart uploads. */
export function bearerHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
  };
}

/** JSON + Authorization headers for protected JSON requests. */
export function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAuthToken()}`,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const response = await fetch(`${getBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    // Do not call handleUnauthorized — login 401 means bad credentials.
    const err = await readApiError(
      response,
      `Login failed (${response.status})`,
    );
    throw new Error(typeof err === "string" ? err : "Login failed");
  }
  return (await response.json()) as TokenResponse;
}

export async function register(
  payload: RegisterPayload,
): Promise<UserPublic> {
  const response = await fetch(`${getBaseUrl()}/users/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await readApiError(
      response,
      `Registration failed (${response.status})`,
    );
    if (typeof err === "string") {
      throw new RegistrationError(err);
    }
    throw new RegistrationError("Validation failed", err);
  }
  return (await response.json()) as UserPublic;
}

export class RegistrationError extends Error {
  fieldErrors: ValidationErrorItem[] | null;

  constructor(message: string, fieldErrors?: ValidationErrorItem[]) {
    super(message);
    this.name = "RegistrationError";
    this.fieldErrors = fieldErrors ?? null;
  }
}

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

export async function getMe(): Promise<MeResponse> {
  const response = await fetch(`${getBaseUrl()}/auth/me`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!response.ok) {
    redirectIfUnauthorized(response);
    const err = await readApiError(
      response,
      `Failed to load profile (${response.status})`,
    );
    throw new AuthApiError(
      typeof err === "string" ? err : "Failed to load profile",
      response.status,
    );
  }
  return (await response.json()) as MeResponse;
}

export async function updateProfile(
  payload: ProfileUpdatePayload,
): Promise<Profile> {
  const response = await fetch(`${getBaseUrl()}/profiles/me`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    redirectIfUnauthorized(response);
    const err = await readApiError(
      response,
      `Profile update failed (${response.status})`,
    );
    throw new AuthApiError(
      typeof err === "string" ? err : "Profile update failed",
      response.status,
    );
  }
  return (await response.json()) as Profile;
}
