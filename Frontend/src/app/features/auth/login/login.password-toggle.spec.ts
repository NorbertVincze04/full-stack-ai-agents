import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { setInput } from '../../../testing/auth-test-utils';
import { LoginComponent } from './login.component';

describe('LoginComponent password toggle', () => {
  let el: HTMLElement;
  let detect: () => void;

  const input = () => el.querySelector('#login-password') as HTMLInputElement;
  const toggle = () => input().closest('.field')!.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [ReactiveFormsModule, RouterModule],
      providers: [provideRouter([{ path: 'login', component: LoginComponent }]), provideHttpClient(), provideHttpClientTesting()]
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', LoginComponent);
    el = harness.routeNativeElement as HTMLElement;
    detect = () => harness.detectChanges();
    detect();
  });
  afterEach(() => sessionStorage.clear());

  it('AC1: hides the password on load and shows an eye button labelled "Show password"', () => {
    expect(input().type).toBe('password');
    expect(toggle()).not.toBeNull();
    expect(toggle().getAttribute('aria-label')).toBe('Show password');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('AC2: click reveals the password and a second click hides it again', () => {
    toggle().click();
    detect();
    expect(input().type).toBe('text');
    expect(toggle().getAttribute('aria-label')).toBe('Hide password');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');

    toggle().click();
    detect();
    expect(input().type).toBe('password');
    expect(toggle().getAttribute('aria-label')).toBe('Show password');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('AC5: the toggle is type="button" and does not submit or show validation messages', () => {
    expect(toggle().type).toBe('button');
    toggle().click();
    detect();
    expect(el.querySelector('.field-error')).toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(input().getAttribute('aria-invalid')).not.toBe('true');
  });

  it('AC6: keeps the typed value while toggling', () => {
    setInput(el, '#login-password', 'secret123');
    toggle().click();
    detect();
    expect(input().value).toBe('secret123');
    toggle().click();
    detect();
    expect(input().value).toBe('secret123');
  });

  it('AC6: does not send a request when toggling', () => {
    const http = TestBed.inject(HttpTestingController);
    toggle().click();
    detect();
    http.verify();
  });

  it('AC7: the toggle is a native focusable button (Enter/Space operable)', () => {
    expect(toggle().tagName).toBe('BUTTON');
    expect(toggle().tabIndex).toBeGreaterThanOrEqual(0);
    expect(toggle().disabled).toBeFalse();
  });
});
