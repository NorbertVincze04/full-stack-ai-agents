import { AuthResponse, AuthUser } from '../core/auth.models';

export const TEST_USER: AuthUser = { fullName: 'Ada Lovelace', email: 'ada@example.com', type: 'user' };

function base64Url(value: object | string): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Unsigned JWT-shaped token; the frontend only decodes `exp`.
export function makeToken(expSecondsFromNow: number, nowMs: number = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + expSecondsFromNow;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ id: 1, exp })}.signature`;
}

export function authResponse(token: string = makeToken(3600), user: AuthUser = TEST_USER): AuthResponse {
  return { success: true, payload: { token, user } };
}

export function setInput(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}
