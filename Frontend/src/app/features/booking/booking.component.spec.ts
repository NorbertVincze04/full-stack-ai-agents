import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService, SESSION_STORAGE_KEY } from '../../core/auth.service';
import { TEST_USER, makeToken } from '../../testing/auth-test-utils';
import { BOOKING_NOW, BookingComponent, GENERIC_ERROR_MESSAGE, LOGIN_REQUIRED_MESSAGE } from './booking.component';
import { CalendarComponent } from './calendar/calendar.component';
import { environment } from '../../../environments/environment';

describe('BookingComponent', () => {
  let fixture: ComponentFixture<BookingComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;
  const url = `${environment.apiUrl}/bookings`;
  const token = makeToken(3600);

  // Fixed "today": Friday 6 Nov 2026 -> window 6, 9, 10, 11 Nov.
  function setup(opts: { loggedIn: boolean; now?: Date; mine?: string[] }): void {
    sessionStorage.clear();
    if (opts.loggedIn) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
    }
    TestBed.configureTestingModule({
      declarations: [BookingComponent, CalendarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BOOKING_NOW, useValue: () => opts.now ?? new Date(2026, 10, 6, 10, 0) }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BookingComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
    if (opts.loggedIn) {
      flushMine(opts.mine ?? []);
    }
  }

  function flushMine(dates: string[]): void {
    http.expectOne(`${url}/mine`).flush({ success: true, payload: { bookings: dates.map(date => ({ date })) } });
    fixture.detectChanges();
  }

  const button = () => root.querySelector<HTMLButtonElement>('.book-button')!;
  const dateLabel = () => root.querySelector('.selected-date')?.textContent?.trim();
  const message = () => root.querySelector('.top-bar-message')?.textContent?.trim();
  const day = (n: number) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.day')).find(b => b.textContent?.trim() === String(n))!;

  function click(): void {
    button().click();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    sessionStorage.clear();
  });

  describe('selection (FR2, FR3)', () => {
    beforeEach(() => setup({ loggedIn: false }));

    it('should preselect the first bookable date and show it on the left of the bar', () => {
      expect(dateLabel()).toBe('Fri, 6 Nov 2026');
      expect(day(6).getAttribute('aria-pressed')).toBe('true');
      const row = root.querySelector('.top-bar-row')!;
      expect(row.firstElementChild).toBe(root.querySelector('.selected-date'));
      expect(row.lastElementChild).toBe(button());
    });

    it('should update the label when another bookable date is selected', () => {
      day(9).click();
      fixture.detectChanges();
      expect(dateLabel()).toBe('Mon, 9 Nov 2026');
      expect(day(9).getAttribute('aria-pressed')).toBe('true');
      expect(day(6).getAttribute('aria-pressed')).toBe('false');
    });

    it('should not change the selection when a weekend, past or out-of-window day is clicked', () => {
      day(7).click();
      day(8).click();
      day(5).click();
      day(12).click();
      fixture.detectChanges();
      expect(dateLabel()).toBe('Fri, 6 Nov 2026');
    });

    it('should preselect the next Monday when today is a Saturday', () => {
      TestBed.resetTestingModule();
      setup({ loggedIn: false, now: new Date(2026, 10, 7) });
      expect(dateLabel()).toBe('Mon, 9 Nov 2026');
      expect(day(9).getAttribute('aria-disabled')).toBe('false');
      expect(day(6).getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('anonymous user (FR7)', () => {
    beforeEach(() => setup({ loggedIn: false }));

    it('should show Book Now and make no API call on load', () => {
      expect(button().textContent?.trim()).toBe('Book Now');
      http.expectNone(() => true);
    });

    it('should show "You must log in first" on click, with no request and no redirect', () => {
      click();
      expect(message()).toBe(LOGIN_REQUIRED_MESSAGE);
      expect(message()).toBe('You must log in first');
      expect(button().textContent?.trim()).toBe('Book Now');
      http.expectNone(() => true);
    });

    it('should expose the message in an aria-live region', () => {
      expect(root.querySelector('.top-bar-message')?.getAttribute('aria-live')).toBe('polite');
    });

    it('should clear the message when another date is selected', () => {
      click();
      day(9).click();
      fixture.detectChanges();
      expect(message()).toBe('');
    });
  });

  describe('logged in (FR4, FR5, FR6, FR8)', () => {
    it('should load booked dates on load and show Withdraw booking for a booked selected date (FR8)', () => {
      setup({ loggedIn: true, mine: ['2026-11-06'] });
      expect(button().textContent?.trim()).toBe('Withdraw booking');
    });

    it('should show Book Now when the selected date is not booked', () => {
      setup({ loggedIn: true, mine: ['2026-11-09'] });
      expect(button().textContent?.trim()).toBe('Book Now');
    });

    it('should make the label follow the selected date (FR4)', () => {
      setup({ loggedIn: true, mine: ['2026-11-09', '2026-11-11'] });
      day(9).click();
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Withdraw booking');
      day(10).click();
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Book Now');
      day(11).click();
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Withdraw booking');
    });

    it('should POST { date } with Bearer token on Book Now and switch to Withdraw booking (FR5)', () => {
      setup({ loggedIn: true });
      click();
      const req = http.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ date: '2026-11-06' });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ success: true, payload: { booking: { date: '2026-11-06' } } }, { status: 201, statusText: 'Created' });
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Withdraw booking');
      expect(message()).toBe('');
    });

    it('should allow bookings for several dates (FR5)', () => {
      setup({ loggedIn: true });
      click();
      http.expectOne(url).flush({ success: true }, { status: 201, statusText: 'Created' });
      day(9).click();
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Book Now');
      click();
      const req = http.expectOne(url);
      expect(req.request.body).toEqual({ date: '2026-11-09' });
      req.flush({ success: true }, { status: 201, statusText: 'Created' });
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Withdraw booking');
      expect(day(6).getAttribute('aria-label')).toContain('booked');
      expect(day(9).getAttribute('aria-label')).toContain('booked');
    });

    it('should DELETE /bookings/<date> on Withdraw booking and return to Book Now (FR6)', () => {
      setup({ loggedIn: true, mine: ['2026-11-06', '2026-11-09'] });
      click();
      const req: TestRequest = http.expectOne(`${url}/2026-11-06`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ success: true });
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Book Now');
      day(9).click();
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Withdraw booking'); // other date untouched
    });

    it('should disable the button while a request is in flight and re-enable afterwards', () => {
      setup({ loggedIn: true });
      click();
      expect(button().disabled).toBeTrue();
      button().click();
      http.expectOne(url).flush({ success: true }, { status: 201, statusText: 'Created' });
      http.expectNone(url);
      fixture.detectChanges();
      expect(button().disabled).toBeFalse();
    });

    it('should show a generic error on 409 and keep the state unchanged', () => {
      setup({ loggedIn: true });
      click();
      http.expectOne(url).flush({ success: false }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
      expect(button().textContent?.trim()).toBe('Book Now');
      expect(button().disabled).toBeFalse();
    });

    it('should show a generic error on 500 when booking', () => {
      setup({ loggedIn: true });
      click();
      http.expectOne(url).flush({ success: false }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
    });

    it('should show a generic error and keep Withdraw booking on a 500 withdraw', () => {
      setup({ loggedIn: true, mine: ['2026-11-06'] });
      click();
      http.expectOne(`${url}/2026-11-06`).flush({ success: false }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
      expect(button().textContent?.trim()).toBe('Withdraw booking');
    });

    it('should drop the date locally when withdraw returns 404', () => {
      setup({ loggedIn: true, mine: ['2026-11-06'] });
      click();
      http.expectOne(`${url}/2026-11-06`).flush({ success: false }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Book Now');
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
    });

    it('should show a generic error and stay signed in when loading booked dates fails with 500', () => {
      sessionStorage.clear();
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
      TestBed.configureTestingModule({
        declarations: [BookingComponent, CalendarComponent],
        providers: [provideHttpClient(), provideHttpClientTesting()]
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(BookingComponent);
      root = fixture.nativeElement;
      fixture.detectChanges();
      http.expectOne(`${url}/mine`).flush({ success: false }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
      expect(TestBed.inject(AuthService).isAuthenticated()).toBeTrue();
    });
  });

  describe('session expiry (FR13)', () => {
    it('should log out and show "You must log in first" when booking returns 401', () => {
      setup({ loggedIn: true });
      const auth = TestBed.inject(AuthService);
      click();
      http.expectOne(url).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();
      expect(auth.isAuthenticated()).toBeFalse();
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(message()).toBe('You must log in first');
    });

    it('should log out and show the message when withdraw returns 401', () => {
      setup({ loggedIn: true, mine: ['2026-11-06'] });
      const auth = TestBed.inject(AuthService);
      click();
      http.expectOne(`${url}/2026-11-06`).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();
      expect(auth.isAuthenticated()).toBeFalse();
      expect(message()).toBe('You must log in first');
    });

    it('should log out and show the message when loading booked dates returns 401', () => {
      sessionStorage.clear();
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
      TestBed.configureTestingModule({
        declarations: [BookingComponent, CalendarComponent],
        providers: [provideHttpClient(), provideHttpClientTesting()]
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(BookingComponent);
      root = fixture.nativeElement;
      fixture.detectChanges();
      http.expectOne(`${url}/mine`).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();
      expect(TestBed.inject(AuthService).isAuthenticated()).toBeFalse();
      expect(message()).toBe('You must log in first');
    });

    it('should clear booked state after logout so the button shows Book Now', () => {
      setup({ loggedIn: true, mine: ['2026-11-06'] });
      expect(button().textContent?.trim()).toBe('Withdraw booking');
      TestBed.inject(AuthService).logout();
      fixture.detectChanges();
      expect(button().textContent?.trim()).toBe('Book Now');
    });

    it('should make no API call after the session has expired (no token)', () => {
      setup({ loggedIn: true });
      TestBed.inject(AuthService).logout();
      fixture.detectChanges();
      click();
      expect(message()).toBe('You must log in first');
      http.expectNone(() => true);
    });
  });
});
