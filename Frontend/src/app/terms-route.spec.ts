import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './core/auth.service';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

describe('/terms route and header link', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppRoutingModule, RouterModule],
      declarations: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideLocationMocks()]
    }).compileComponents();
  });

  function termsLink(root: HTMLElement): HTMLAnchorElement | undefined {
    return Array.from(root.querySelectorAll('header a'))
      .find(a => a.textContent?.trim() === 'Terms') as HTMLAnchorElement | undefined;
  }

  async function openTerms() {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/terms');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, router };
  }

  it('AC1: should show the h1 "Terms of Service" in main at /terms', async () => {
    const { fixture } = await openTerms();
    const el = fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(Location).path()).toBe('/terms');
    expect(el.querySelector('main h1')?.textContent?.trim()).toBe('Terms of Service');
  });

  it('AC2: should show placeholder text stating it is not legal text', async () => {
    const { fixture } = await openTerms();
    const text = (fixture.nativeElement as HTMLElement).querySelector('main')?.textContent ?? '';
    expect(text).toMatch(/not legal/i);
  });

  it('AC3: should render a Terms link to /terms after Help and before Login', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const terms = termsLink(el);
    const help = Array.from(el.querySelectorAll('header a'))
      .find(a => a.textContent?.trim() === 'Help') as HTMLAnchorElement;
    const login = el.querySelector('header button') as HTMLElement;
    expect(terms).toBeDefined();
    expect(terms?.getAttribute('href')).toBe('/terms');
    expect(help.compareDocumentPosition(terms!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(terms!.compareDocumentPosition(login) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC3: should render the Terms link before the user name when signed in', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppRoutingModule, RouterModule],
      declarations: [AppComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideLocationMocks(),
        { provide: AuthService, useValue: { currentUser$: of({ fullName: 'Test User', email: 'a@b.c', type: 'user' }), logout: () => undefined } }
      ]
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const terms = termsLink(el);
    const name = el.querySelector('header .user-name') as HTMLElement;
    expect(terms).toBeDefined();
    expect(name).not.toBeNull();
    expect(terms!.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC4: should be keyboard focusable (href, no negative tabindex)', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const terms = termsLink(fixture.nativeElement as HTMLElement);
    expect(terms).toBeDefined();
    expect(terms?.hasAttribute('href')).toBeTrue();
    expect(terms!.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('AC4: should navigate client-side when the Terms link is clicked', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    router.initialNavigation();
    fixture.detectChanges();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    termsLink(fixture.nativeElement as HTMLElement)?.dispatchEvent(click);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(click.defaultPrevented).toBeTrue();
    expect(router.url).toBe('/terms');
    expect((fixture.nativeElement as HTMLElement).querySelector('main h1')?.textContent?.trim())
      .toBe('Terms of Service');
  });

  it('AC5: should keep the footer and the app-name h1 on the terms page', async () => {
    const { fixture } = await openTerms();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('header h1')?.textContent).toContain('Desk Booking');
    expect(el.querySelector('footer')).not.toBeNull();
  });
});
