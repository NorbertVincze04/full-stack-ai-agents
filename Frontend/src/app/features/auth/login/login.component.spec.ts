import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { SESSION_STORAGE_KEY } from '../../../core/auth.service';
import { TEST_USER, authResponse, makeToken, setInput } from '../../../testing/auth-test-utils';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const loginUrl = `${environment.apiUrl}/auth/login`;
  let http: HttpTestingController;
  let router: Router;
  let navigateByUrl: jasmine.Spy;
  let el: HTMLElement;
  let detect: () => void;

  async function open(url = '/login'): Promise<void> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, LoginComponent);
    navigateByUrl = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    el = harness.routeNativeElement as HTMLElement;
    detect = () => harness.detectChanges();
    detect();
  }

  function fill(email: string, password: string): void {
    setInput(el, '#login-email', email);
    setInput(el, '#login-password', password);
  }

  function submit(): void {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    detect();
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [ReactiveFormsModule, RouterModule],
      providers: [provideRouter([{ path: 'login', component: LoginComponent }]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });
  afterEach(() => sessionStorage.clear());

  it('should render labelled email and password inputs with autocomplete and an h2', async () => {
    await open();
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Login');
    expect(el.querySelector('label[for="login-email"]')).not.toBeNull();
    expect(el.querySelector('label[for="login-password"]')).not.toBeNull();
    expect(el.querySelector('#login-email')?.getAttribute('autocomplete')).toBe('email');
    const password = el.querySelector('#login-password') as HTMLInputElement;
    expect(password.type).toBe('password');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
  });

  it('should link to /register', async () => {
    await open();
    const link = el.querySelector('a[href="/register"]');
    expect(link?.textContent?.trim()).toBe('Register');
  });

  it('should not show the success message by default', async () => {
    await open();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('should show the success message when registered=1', async () => {
    await open('/login?registered=1');
    expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe('Account created, please log in');
  });

  it('should not show the success message for other registered values', async () => {
    await open('/login?registered=yes');
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  describe('validation', () => {
    it('should require both fields and not call the API', async () => {
      await open();
      submit();
      expect(el.querySelector('#login-email-error')?.textContent?.trim()).toBe('Email is required');
      expect(el.querySelector('#login-password-error')?.textContent?.trim()).toBe('Password is required');
      expect(el.querySelector('#login-email')?.getAttribute('aria-describedby')).toBe('login-email-error');
      expect(el.querySelector('#login-email')?.getAttribute('aria-invalid')).toBe('true');
      expect(el.querySelector('#login-password')?.getAttribute('aria-describedby')).toBe('login-password-error');
      http.expectNone(loginUrl);
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('should require the password when only the email is filled', async () => {
      await open();
      fill('ada@example.com', '');
      submit();
      expect(el.querySelector('#login-email-error')).toBeNull();
      expect(el.querySelector('#login-password-error')).not.toBeNull();
      http.expectNone(loginUrl);
    });

    it('should show no error before the user interacts', async () => {
      await open();
      expect(el.querySelector('.field-error')).toBeNull();
    });
  });

  describe('submit', () => {
    it('should POST the trimmed email and the password', async () => {
      await open();
      fill('  ada@example.com ', 'secret123');
      submit();
      const req = http.expectOne(loginUrl);
      expect(req.request.body).toEqual({ email: 'ada@example.com', password: 'secret123' });
      req.flush(authResponse());
    });

    it('should navigate to / on success, store the session and keep the password out of storage', async () => {
      await open();
      fill('ada@example.com', 'secret123');
      submit();
      http.expectOne(loginUrl).flush(authResponse(makeToken(3600)));
      detect();

      expect(navigateByUrl).toHaveBeenCalledOnceWith('/');
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) as string;
      expect(JSON.parse(raw).user).toEqual(TEST_USER);
      expect(raw).not.toContain('secret123');
      expect(el.querySelector('[role="alert"]')).toBeNull();
    });

    it('should show "Invalid email or password" on 401 and stay signed out', async () => {
      await open();
      fill('ada@example.com', 'wrongpass1');
      submit();
      http.expectOne(loginUrl).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
      detect();

      expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Invalid email or password');
      expect(navigateByUrl).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('should show "Too many attempts, try again later" on 429', async () => {
      await open();
      fill('ada@example.com', 'secret123');
      submit();
      http.expectOne(loginUrl).flush({ success: false }, { status: 429, statusText: 'Too Many Requests' });
      detect();

      expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Too many attempts, try again later');
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    for (const status of [500, 503, 0]) {
      it(`should show a generic message on status ${status} without revealing details`, async () => {
        await open();
        fill('ada@example.com', 'secret123');
        submit();
        http.expectOne(loginUrl).flush({ success: false, message: 'db exploded' }, { status: status || 500, statusText: 'Err' });
        detect();

        const text = el.querySelector('[role="alert"]')?.textContent?.trim();
        expect(text).toBe('Login failed, please try again later');
        expect(text).not.toContain('db exploded');
        expect(navigateByUrl).not.toHaveBeenCalled();
      });
    }

    it('should show the generic message on a network error', async () => {
      await open();
      fill('ada@example.com', 'secret123');
      submit();
      http.expectOne(loginUrl).error(new ProgressEvent('error'));
      detect();
      expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Login failed, please try again later');
    });

    it('should show the generic message when the server returns an expired token', async () => {
      await open();
      fill('ada@example.com', 'secret123');
      submit();
      http.expectOne(loginUrl).flush(authResponse(makeToken(-60)));
      detect();
      expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Login failed, please try again later');
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('should guard against double submit while a request is in flight', async () => {
      await open();
      fill('ada@example.com', 'secret123');
      submit();
      const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
      expect(button.getAttribute('aria-busy')).toBe('true');

      submit();
      (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      detect();
      const requests = http.match(loginUrl);
      expect(requests.length).toBe(1);
      requests[0].flush(authResponse());
    });

    it('should re-enable the button after a failure so the user can retry', async () => {
      await open();
      fill('ada@example.com', 'secret123');
      submit();
      http.expectOne(loginUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
      detect();
      expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeFalse();

      submit();
      http.expectOne(loginUrl).flush(authResponse());
    });

    it('should clear the previous error when submitting again', async () => {
      await open();
      fill('ada@example.com', 'secret123');
      submit();
      http.expectOne(loginUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
      detect();
      expect(el.querySelector('[role="alert"]')).not.toBeNull();

      submit();
      expect(el.querySelector('[role="alert"]')).toBeNull();
      http.expectOne(loginUrl).flush(authResponse());
    });
  });
});
