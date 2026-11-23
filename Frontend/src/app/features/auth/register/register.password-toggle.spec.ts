import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { setInput } from '../../../testing/auth-test-utils';
import { RegisterComponent } from './register.component';

describe('RegisterComponent password toggles', () => {
  let el: HTMLElement;
  let detect: () => void;
  let http: HttpTestingController;

  const input = (id: string) => el.querySelector(`#${id}`) as HTMLInputElement;
  const toggle = (id: string) => input(id).closest('.field')!.querySelector('button') as HTMLButtonElement;
  const fields = ['register-password', 'register-confirm-password'];

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      declarations: [RegisterComponent],
      imports: [ReactiveFormsModule, RouterModule],
      providers: [provideRouter([{ path: 'register', component: RegisterComponent }]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/register', RegisterComponent);
    spyOn(router, 'navigate').and.resolveTo(true);
    el = harness.routeNativeElement as HTMLElement;
    detect = () => harness.detectChanges();
    detect();
  });
  afterEach(() => sessionStorage.clear());

  for (const id of fields) {
    describe(id, () => {
      it('AC3/AC4: hidden on load with a "Show password" eye button', () => {
        expect(input(id).type).toBe('password');
        expect(toggle(id)).not.toBeNull();
        expect(toggle(id).getAttribute('aria-label')).toBe('Show password');
        expect(toggle(id).getAttribute('aria-pressed')).toBe('false');
      });

      it('AC3/AC4: click reveals, second click hides', () => {
        toggle(id).click();
        detect();
        expect(input(id).type).toBe('text');
        expect(toggle(id).getAttribute('aria-label')).toBe('Hide password');
        expect(toggle(id).getAttribute('aria-pressed')).toBe('true');
        toggle(id).click();
        detect();
        expect(input(id).type).toBe('password');
        expect(toggle(id).getAttribute('aria-label')).toBe('Show password');
      });

      it('AC5: type="button", no validation messages on click', () => {
        expect(toggle(id).type).toBe('button');
        toggle(id).click();
        detect();
        expect(el.querySelector('.field-error')).toBeNull();
      });

      it('AC7: native focusable button', () => {
        expect(toggle(id).tagName).toBe('BUTTON');
        expect(toggle(id).tabIndex).toBeGreaterThanOrEqual(0);
      });
    });
  }

  it('AC4: the two toggles are independent', () => {
    toggle('register-password').click();
    detect();
    expect(input('register-password').type).toBe('text');
    expect(input('register-confirm-password').type).toBe('password');
    expect(toggle('register-confirm-password').getAttribute('aria-pressed')).toBe('false');

    toggle('register-confirm-password').click();
    detect();
    toggle('register-password').click();
    detect();
    expect(input('register-password').type).toBe('password');
    expect(input('register-confirm-password').type).toBe('text');
  });

  it('AC6: values are kept while toggling', () => {
    setInput(el, '#register-password', 'secret123');
    setInput(el, '#register-confirm-password', 'secret123');
    toggle('register-password').click();
    toggle('register-confirm-password').click();
    detect();
    expect(input('register-password').value).toBe('secret123');
    expect(input('register-confirm-password').value).toBe('secret123');
  });

  it('AC6: submitting while revealed sends password and never confirmPassword', () => {
    setInput(el, '#register-full-name', 'Ada Lovelace');
    setInput(el, '#register-email', 'ada@example.com');
    setInput(el, '#register-password', 'secret123');
    setInput(el, '#register-confirm-password', 'secret123');
    toggle('register-password').click();
    toggle('register-confirm-password').click();
    detect();
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    detect();
    const req = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.body).toEqual({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'secret123' });
    expect('confirmPassword' in req.request.body).toBeFalse();
  });

  it('AC6: validation errors are unchanged after toggling (mismatch still reported on submit)', () => {
    setInput(el, '#register-password', 'secret123');
    setInput(el, '#register-confirm-password', 'other1234');
    toggle('register-confirm-password').click();
    detect();
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    detect();
    expect(el.querySelector('#register-confirm-password-error')).not.toBeNull();
    http.expectNone(`${environment.apiUrl}/auth/register`);
  });
});
