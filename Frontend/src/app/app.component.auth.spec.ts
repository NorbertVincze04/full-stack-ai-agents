import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { SESSION_STORAGE_KEY } from './core/auth.service';
import { TEST_USER, makeToken } from './testing/auth-test-utils';

describe('AppComponent header auth state', () => {
  function create(signedIn: boolean): ComponentFixture<AppComponent> {
    if (signedIn) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(3600), user: TEST_USER }));
    }
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture;
  }

  const root = (f: ComponentFixture<AppComponent>) => f.nativeElement as HTMLElement;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([])],
      declarations: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });
  afterEach(() => sessionStorage.clear());

  describe('signed out', () => {
    it('should show a Login button linking to /login', () => {
      const fixture = create(false);
      const button = fixture.debugElement.queryAll(By.css('header button'))[0];
      expect(button.nativeElement.textContent.trim()).toBe('Login');
      expect(button.nativeElement.getAttribute('type')).toBe('button');
      expect(button.injector.get(RouterLink).urlTree?.toString()).toBe('/login');
    });

    it('should not render a Register link or button', () => {
      const header = root(create(false)).querySelector('header') as HTMLElement;
      expect(header.querySelector('a[href="/register"]')).toBeNull();
      expect(header.textContent).not.toContain('Register');
    });

    it('should not render the logout button or a user name', () => {
      const el = root(create(false));
      expect(el.querySelector('button[aria-label="Log out"]')).toBeNull();
      expect(el.querySelector('.user-name')).toBeNull();
    });

    it('should keep the Help link', () => {
      const help = root(create(false)).querySelector('header a[href="/info"]');
      expect(help?.textContent?.trim()).toBe('Help');
    });
  });

  describe('signed in', () => {
    it('should show the full name instead of the Login button', () => {
      const el = root(create(true));
      expect(el.querySelector('.user-name')?.textContent?.trim()).toBe(TEST_USER.fullName);
      const labels = Array.from(el.querySelectorAll('header button')).map(b => b.textContent?.trim());
      expect(labels).not.toContain('Login');
    });

    it('should render a native logout button with aria-label "Log out" and an aria-hidden SVG', () => {
      const el = root(create(true));
      const button = el.querySelector('header button[aria-label="Log out"]') as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      const svg = button.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should place the logout button to the right of (after) the user name', () => {
      const el = root(create(true));
      const name = el.querySelector('.user-name') as HTMLElement;
      const button = el.querySelector('button[aria-label="Log out"]') as HTMLElement;
      expect(name.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should render the name as text (no HTML injection)', () => {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ token: makeToken(3600), user: { ...TEST_USER, fullName: '<b id="pwn">Eve</b>' } })
      );
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      expect(root(fixture).querySelector('#pwn')).toBeNull();
      expect(root(fixture).querySelector('.user-name')?.textContent).toBe('<b id="pwn">Eve</b>');
    });

    it('should sign out, clear sessionStorage, navigate to / and show Login again on logout click', () => {
      const fixture = create(true);
      const navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      (root(fixture).querySelector('button[aria-label="Log out"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(navigateByUrl).toHaveBeenCalledOnceWith('/');
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      const el = root(fixture);
      expect(el.querySelector('.user-name')).toBeNull();
      expect(el.querySelector('button[aria-label="Log out"]')).toBeNull();
      expect(el.querySelector('header button')?.textContent?.trim()).toBe('Login');
    });

    it('should show Login when the stored token is expired', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(-5), user: TEST_USER }));
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      expect(root(fixture).querySelector('.user-name')).toBeNull();
      expect(root(fixture).querySelector('header button')?.textContent?.trim()).toBe('Login');
    });
  });
});
