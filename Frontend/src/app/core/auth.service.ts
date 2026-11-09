import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, AuthUser, RegisterRequest, StoredSession } from './auth.models';

export const SESSION_STORAGE_KEY = 'deskbooking.auth';

// UI-only decoding: the signature is verified by the backend, never here.
function readTokenExp(token: unknown): number | null {
  if (typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const exp = (JSON.parse(atob(padded)) as { exp?: unknown } | null)?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

function isAuthUser(value: unknown): value is AuthUser {
  const user = value as Partial<AuthUser> | null;
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.fullName === 'string' &&
    typeof user.email === 'string' &&
    (user.type === 'admin' || user.type === 'user')
  );
}

function isValidSession(session: Partial<StoredSession> | null | undefined): session is StoredSession {
  const exp = readTokenExp(session?.token);
  return exp !== null && exp * 1000 > Date.now() && isAuthUser(session?.user);
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  getCurrentUserName(): string {
    return this.session?.user?.fullName ?? '';
  }
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$: Observable<AuthUser | null> = this.userSubject.asObservable();
  private session: StoredSession | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly http: HttpClient) {
    this.applySession(this.loadSession());
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        map(res => {
          const { fullName, email: userEmail, type } = res.payload.user;
          const session: StoredSession = { token: res.payload.token, user: { fullName, email: userEmail, type } };
          if (!isValidSession(session)) {
            throw new Error('Invalid session received');
          }
          this.saveSession(session);
          this.applySession(session);
          return session.user;
        })
      );
  }

  // The token in the 201 response is deliberately ignored: no auto sign-in.
  register(request: RegisterRequest): Observable<void> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
        fullName: request.fullName,
        email: request.email,
        password: request.password
      })
      .pipe(map(() => undefined));
  }

  logout(): void {
    this.clearSession();
    this.applySession(null);
  }

  // Pure query: an expired token counts as signed out.
  isAuthenticated(): boolean {
    return isValidSession(this.session);
  }

  // Token for API calls; null when signed out or expired.
  getToken(): string | null {
    return isValidSession(this.session) ? this.session.token : null;
  }

  // Single place that updates the user stream and the expiry timer.
  private applySession(session: StoredSession | null): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    this.session = session;
    this.userSubject.next(session?.user ?? null);
    if (!session) {
      return;
    }
    const exp = readTokenExp(session.token) as number;
    // setTimeout overflows above 2^31-1 ms, so long delays are re-checked on fire.
    const delay = Math.min(Math.max(exp * 1000 - Date.now(), 0), 2147483647);
    this.expiryTimer = setTimeout(() => this.onExpiryTimer(), delay);
  }

  private onExpiryTimer(): void {
    if (isValidSession(this.session)) {
      this.applySession(this.session);
      return;
    }
    this.clearSession();
    this.applySession(null);
  }

  private loadSession(): StoredSession | null {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
    if (raw === null) {
      return null;
    }
    try {
      const session = JSON.parse(raw) as Partial<StoredSession> | null;
      if (isValidSession(session)) {
        return session;
      }
    } catch {
      // malformed JSON falls through to cleanup
    }
    this.clearSession();
    return null;
  }

  private saveSession(session: StoredSession): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // storage unavailable: the session lasts until reload
    }
  }

  private clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // nothing to clear
    }
  }
}
