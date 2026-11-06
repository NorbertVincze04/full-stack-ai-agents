import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { AuthService, SESSION_STORAGE_KEY } from '../../../core/auth.service';
import { authResponse, makeToken, setInput } from '../../../testing/auth-test-utils';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  const registerUrl = `${environment.apiUrl}/auth/register`;
  let http: HttpTestingController;
  let router: Router;
  let navigate: jasmine.Spy;
  let el: HTMLElement;
  let detect: () => void;

  async function open(): Promise<void> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/register', RegisterComponent);
    navigate = spyOn(router, 'navigate').and.resolveTo(true);
    el = harness.routeNativeElement as HTMLElement;
    detect = () => harness.detectChanges();
    detect();
  }

  function fill(values: Partial<Record<'name' | 'email' | 'password' | 'confirm', string>> = {}): void {
    const v = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'secret123', confirm: 'secret123', ...values };
    setInput(el, '#register-full-name', v.name);
    setInput(el, '#register-email', v.email);
    setInput(el, '#register-password', v.password);
    setInput(el, '#register-confirm-password', v.confirm);
  }

  function submit(): void {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    detect();
  }

  const text = (selector: string) => el.querySelector(selector)?.textContent?.trim();

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      declarations: [RegisterComponent],
      imports: [ReactiveFormsModule, RouterModule],
      providers: [provideRouter([{ path: 'register', component: RegisterComponent }]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });
  afterEach(() => sessionStorage.clear());

  it('should render labelled fields with autocomplete attributes, password types and an h2', async () => {
    await open();
    expect(text('h2')).toBe('Register');
    for (const id of ['full-name', 'email', 'password', 'confirm-password']) {
      expect(el.querySelector(`label[for="register-${id}"]`)).withContext(id).not.toBeNull();
    }
    expect(el.querySelector('#register-full-name')?.getAttribute('autocomplete')).toBe('name');
    expect(el.querySelector('#register-email')?.getAttribute('autocomplete')).toBe('email');
    for (const id of ['#register-password', '#register-confirm-password']) {
      const input = el.querySelector(id) as HTMLInputElement;
      expect(input.type).toBe('password');
      expect(input.getAttribute('autocomplete')).toBe('new-password');
    }
  });

  it('should link to /login', async () => {
    await open();
    expect(el.querySelector('a[href="/login"]')?.textContent?.trim()).toBe('Login');
  });

  describe('validation (D1)', () => {
    it('should require all fields and not call the API', async () => {
      await open();
      submit();
      expect(text('#register-full-name-error')).toBe('Full name is required');
      expect(text('#register-email-error')).toBe('Email is required');
      expect(text('#register-password-error')).toBe('Password is required');
      http.expectNone(registerUrl);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should link errors via aria-describedby and set aria-invalid', async () => {
      await open();
      submit();
      expect(el.querySelector('#register-email')?.getAttribute('aria-describedby')).toBe('register-email-error');
      expect(el.querySelector('#register-email')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should treat a whitespace-only full name as empty', async () => {
      await open();
      fill({ name: '   ' });
      submit();
      expect(text('#register-full-name-error')).toBe('Full name is required');
      http.expectNone(registerUrl);
    });

    it('should accept a 100 character full name and reject 101', async () => {
      await open();
      fill({ name: 'a'.repeat(101) });
      submit();
      expect(text('#register-full-name-error')).toBe('Full name must be at most 100 characters');
      http.expectNone(registerUrl);

      fill({ name: 'a'.repeat(100) });
      detect();
      expect(el.querySelector('#register-full-name-error')).toBeNull();
    });

    for (const bad of ['plain', 'a@b', '@b.co', 'a b@c.co', 'a@@b.co']) {
      it(`should reject the invalid email "${bad}"`, async () => {
        await open();
        fill({ email: bad });
        submit();
        expect(text('#register-email-error')).toBe('Enter a valid email address');
        http.expectNone(registerUrl);
      });
    }

    it('should reject an email longer than 254 characters', async () => {
      await open();
      fill({ email: `${'a'.repeat(250)}@b.co` });
      submit();
      expect(text('#register-email-error')).toBe('Email must be at most 254 characters');
      http.expectNone(registerUrl);
    });

    it('should reject a password shorter than 8 characters', async () => {
      await open();
      fill({ password: 'abc1234', confirm: 'abc1234' });
      submit();
      expect(text('#register-password-error')).toBe('Password must be at least 8 characters');
      http.expectNone(registerUrl);
    });

    it('should reject a password longer than 72 bytes (counted in UTF-8 bytes)', async () => {
      await open();
      const long = `a1${'a'.repeat(71)}`; // 73 bytes
      fill({ password: long, confirm: long });
      submit();
      expect(text('#register-password-error')).toBe('Password must be at most 72 bytes');
      http.expectNone(registerUrl);
    });

    it('should count multi-byte characters as several bytes', async () => {
      await open();
      const multi = `1${'é'.repeat(36)}`; // 37 chars, 73 bytes
      fill({ password: multi, confirm: multi });
      submit();
      expect(text('#register-password-error')).toBe('Password must be at most 72 bytes');
    });

    it('should accept a 72 byte password', async () => {
      await open();
      const ok = `a1${'a'.repeat(70)}`;
      fill({ password: ok, confirm: ok });
      submit();
      const req = http.expectOne(registerUrl);
      expect(req.request.body.password).toBe(ok);
      req.flush(authResponse(), { status: 201, statusText: 'Created' });
    });

    for (const [name, pw] of [['letters only', 'abcdefgh'], ['digits only', '12345678']] as const) {
      it(`should reject a password with ${name}`, async () => {
        await open();
        fill({ password: pw, confirm: pw });
        submit();
        expect(text('#register-password-error')).toBe('Password must contain at least one letter and one digit');
        http.expectNone(registerUrl);
      });
    }

    it('should show a mismatch message on confirmPassword and not call the API', async () => {
      await open();
      fill({ confirm: 'different1' });
      submit();
      expect(text('#register-confirm-password-error')).toBe('Passwords do not match');
      expect(el.querySelector('#register-confirm-password')?.getAttribute('aria-describedby'))
        .toBe('register-confirm-password-error');
      http.expectNone(registerUrl);
    });

    it('should show no error before interaction', async () => {
      await open();
      expect(el.querySelector('.field-error')).toBeNull();
    });
  });

  describe('submit', () => {
    it('should send only fullName, email and password (trimmed) and never confirmPassword', async () => {
      await open();
      fill({ name: '  Ada Lovelace  ', email: ' ada@example.com ' });
      submit();
      const req = http.expectOne(registerUrl);
      expect(req.request.body).toEqual({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'secret123' });
      expect(Object.keys(req.request.body).sort()).toEqual(['email', 'fullName', 'password']);
      req.flush(authResponse(), { status: 201, statusText: 'Created' });
    });

    it('should navigate to /login?registered=1 on success without signing the user in', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush(authResponse(makeToken(3600)), { status: 201, statusText: 'Created' });
      detect();

      expect(navigate).toHaveBeenCalledOnceWith(['/login'], { queryParams: { registered: '1' } });
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(TestBed.inject(AuthService).isAuthenticated()).toBeFalse();
    });

    it('should not place the password in the navigation URL', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush(authResponse(), { status: 201, statusText: 'Created' });
      expect(JSON.stringify(navigate.calls.mostRecent().args)).not.toContain('secret123');
    });

    it('should show "Email already registered" on the email field for 409', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush({ success: false, message: 'Email already registered' }, { status: 409, statusText: 'Conflict' });
      detect();

      expect(text('#register-email-error')).toBe('Email already registered');
      expect(el.querySelector('#register-email')?.getAttribute('aria-describedby')).toBe('register-email-error');
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should map 400 field errors inline', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush(
        {
          success: false,
          message: 'Validation failed',
          errors: [
            { field: 'fullName', message: 'fullName is too long' },
            { field: 'email', message: 'email is invalid' },
            { field: 'password', message: 'password is too weak' },
            { field: 'unknown', message: 'ignored' }
          ]
        },
        { status: 400, statusText: 'Bad Request' }
      );
      detect();

      expect(text('#register-full-name-error')).toBe('fullName is too long');
      expect(text('#register-email-error')).toBe('email is invalid');
      expect(text('#register-password-error')).toBe('password is too weak');
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should show a general alert for a 400 without usable field errors', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush({ success: false }, { status: 400, statusText: 'Bad Request' });
      detect();
      expect(text('[role="alert"]')).toBe('Please check the form and try again');
    });

    it('should render server 400 messages as text, not HTML', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush(
        { errors: [{ field: 'email', message: '<img src=x id="pwn">' }] },
        { status: 400, statusText: 'Bad Request' }
      );
      detect();
      expect(el.querySelector('#pwn')).toBeNull();
      expect(text('#register-email-error')).toBe('<img src=x id="pwn">');
    });

    it('should show the rate limit message on 429', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush({}, { status: 429, statusText: 'Too Many Requests' });
      detect();
      expect(text('[role="alert"]')).toBe('Too many attempts, try again later');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should show a generic message on 500', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush({ message: 'db exploded' }, { status: 500, statusText: 'Server Error' });
      detect();
      expect(text('[role="alert"]')).toBe('Registration failed, please try again later');
    });

    it('should guard against double submit while in flight', async () => {
      await open();
      fill();
      submit();
      const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
      submit();
      (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const requests = http.match(registerUrl);
      expect(requests.length).toBe(1);
      requests[0].flush(authResponse(), { status: 201, statusText: 'Created' });
    });

    it('should re-enable the button after an error', async () => {
      await open();
      fill();
      submit();
      http.expectOne(registerUrl).flush({}, { status: 500, statusText: 'Server Error' });
      detect();
      expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeFalse();
    });
  });
});
