import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { TEST_USER, authResponse, makeToken } from '../testing/auth-test-utils';
import { AuthUser } from './auth.models';
import { AuthService, SESSION_STORAGE_KEY } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;

  function createService(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  function currentUser(service: AuthService): AuthUser | null {
    let user: AuthUser | null = null;
    service.currentUser$.subscribe(u => (user = u)).unsubscribe();
    return user;
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    TestBed.inject(AuthService).logout();
    sessionStorage.clear();
  });

  describe('login', () => {
    it('should POST email and password to environment.apiUrl/auth/login', () => {
      const service = createService();
      service.login('ada@example.com', 'secret123').subscribe();
      const req = http.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'ada@example.com', password: 'secret123' });
      req.flush(authResponse());
      http.verify();
    });

    it('should emit the user, store token and user in sessionStorage, and never store the password', () => {
      const service = createService();
      const token = makeToken(3600);
      let result: AuthUser | undefined;
      service.login('ada@example.com', 'secret123').subscribe(u => (result = u));
      http.expectOne(`${environment.apiUrl}/auth/login`).flush(authResponse(token));

      expect(result).toEqual(TEST_USER);
      expect(currentUser(service)).toEqual(TEST_USER);
      expect(service.isAuthenticated()).toBeTrue();
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) as string;
      expect(JSON.parse(raw)).toEqual({ token, user: TEST_USER });
      expect(raw).not.toContain('secret123');
    });

    it('should propagate HTTP errors and stay signed out', () => {
      const service = createService();
      let status = 0;
      service.login('ada@example.com', 'bad').subscribe({ error: e => (status = e.status) });
      http.expectOne(`${environment.apiUrl}/auth/login`).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });

      expect(status).toBe(401);
      expect(currentUser(service)).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('should reject a login response whose token is already expired', () => {
      const service = createService();
      let failed = false;
      service.login('ada@example.com', 'secret123').subscribe({ error: () => (failed = true) });
      http.expectOne(`${environment.apiUrl}/auth/login`).flush(authResponse(makeToken(-60)));

      expect(failed).toBeTrue();
      expect(currentUser(service)).toBeNull();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('should reject a login response whose token is malformed', () => {
      const service = createService();
      let failed = false;
      service.login('ada@example.com', 'secret123').subscribe({ error: () => (failed = true) });
      http.expectOne(`${environment.apiUrl}/auth/login`).flush(authResponse('not-a-jwt'));

      expect(failed).toBeTrue();
      expect(service.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });

  describe('register', () => {
    it('should POST only fullName, email and password to environment.apiUrl/auth/register', () => {
      const service = createService();
      const request = { fullName: 'Ada', email: 'ada@example.com', password: 'secret123', confirmPassword: 'secret123' };
      service.register(request).subscribe();
      const req = http.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ fullName: 'Ada', email: 'ada@example.com', password: 'secret123' });
      expect(Object.keys(req.request.body)).not.toContain('confirmPassword');
      req.flush(authResponse());
    });

    it('should not store or emit the token from the register response', () => {
      const service = createService();
      let done = false;
      service
        .register({ fullName: 'Ada', email: 'ada@example.com', password: 'secret123' })
        .subscribe(() => (done = true));
      http.expectOne(`${environment.apiUrl}/auth/register`).flush(authResponse(makeToken(3600)));

      expect(done).toBeTrue();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(currentUser(service)).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should propagate 409 errors', () => {
      const service = createService();
      let status = 0;
      service
        .register({ fullName: 'Ada', email: 'ada@example.com', password: 'secret123' })
        .subscribe({ error: e => (status = e.status) });
      http
        .expectOne(`${environment.apiUrl}/auth/register`)
        .flush({ success: false, message: 'Email already registered' }, { status: 409, statusText: 'Conflict' });
      expect(status).toBe(409);
    });
  });

  describe('session on load', () => {
    it('should restore a valid stored session', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(3600), user: TEST_USER }));
      const service = createService();
      expect(currentUser(service)).toEqual(TEST_USER);
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should sign out and remove the entry when the stored token is expired', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(-10), user: TEST_USER }));
      const service = createService();
      expect(currentUser(service)).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    for (const [name, token] of [
      ['not a JWT', 'garbage'],
      ['payload is not base64 JSON', 'a.%%%.c'],
      ['payload has no exp', `a.${btoa(JSON.stringify({ id: 1 }))}.c`],
      ['exp is not a number', `a.${btoa(JSON.stringify({ exp: 'soon' }))}.c`]
    ] as const) {
      it(`should sign out and remove the entry when the token is malformed (${name})`, () => {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
        const service = createService();
        expect(currentUser(service)).toBeNull();
        expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      });
    }

    it('should sign out and remove the entry when the stored JSON is malformed', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, '{not json');
      const service = createService();
      expect(currentUser(service)).toBeNull();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('should sign out and remove the entry when the stored user shape is invalid', () => {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ token: makeToken(3600), user: { fullName: 'Ada', email: 'a@b.co', type: 'root' } })
      );
      const service = createService();
      expect(currentUser(service)).toBeNull();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('should stay signed out with nothing stored', () => {
      const service = createService();
      expect(currentUser(service)).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('logout', () => {
    it('should clear sessionStorage and emit null', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(3600), user: TEST_USER }));
      const service = createService();
      expect(currentUser(service)).toEqual(TEST_USER);

      service.logout();

      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(currentUser(service)).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('expiry while the app is open', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('should sign out and clear storage when the token expires', () => {
      const now = new Date(2030, 0, 1);
      jasmine.clock().mockDate(now);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(60, now.getTime()), user: TEST_USER }));
      const service = createService();
      expect(currentUser(service)).toEqual(TEST_USER);

      jasmine.clock().tick(59 * 1000);
      expect(currentUser(service)).toEqual(TEST_USER);

      jasmine.clock().tick(2 * 1000);
      expect(currentUser(service)).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });
});
