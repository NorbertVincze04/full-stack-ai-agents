import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

describe('/info route integration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppRoutingModule, RouterModule],
      declarations: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should render InfoComponent inside main when navigating to /info', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/info');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(Location).path()).toBe('/info');
    expect(el.querySelector('main h1')?.textContent?.trim()).toBe('How it works');
    expect(el.querySelectorAll('main ol > li').length).toBe(3);
    expect(el.querySelector('header h1')?.textContent).toContain('Desk Booking');
  });

  it('should navigate client-side when the Help link is clicked', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    router.initialNavigation();
    fixture.detectChanges();
    const help = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('header a'))
      .find(a => a.textContent?.trim() === 'Help') as HTMLAnchorElement;
    help.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/info');
    expect((fixture.nativeElement as HTMLElement).querySelector('main h1')?.textContent?.trim())
      .toBe('How it works');
  });

  it('should keep the Help link focusable via keyboard (no negative tabindex)', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const help = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('header a'))
      .find(a => a.textContent?.trim() === 'Help') as HTMLAnchorElement;
    expect(help.hasAttribute('href')).toBeTrue();
    expect(help.tabIndex).toBeGreaterThanOrEqual(0);
  });
});
