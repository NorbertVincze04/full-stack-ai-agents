import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, SESSION_STORAGE_KEY } from '../../core/auth.service';
import { TEST_USER, makeToken } from '../../testing/auth-test-utils';
import {
  BOOKING_CONFLICT_MESSAGE,
  BOOKING_NOW,
  BookingComponent,
  GENERIC_ERROR_MESSAGE,
  LOGIN_REQUIRED_MESSAGE,
  SELECT_DESK_MESSAGE
} from './booking.component';
import { DeskAvailability, MyBooking } from './booking.models';
import { CalendarComponent } from './calendar/calendar.component';
import { DeskPlanComponent } from './desk-plan/desk-plan.component';

// Desk flows on the booking page (AC1, AC2, AC4, AC5), driven through the DOM and HTTP only.
describe('BookingComponent desk plan', () => {
  let fixture: ComponentFixture<BookingComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;
  const bookingsUrl = `${environment.apiUrl}/bookings`;
  const desksUrl = `${environment.apiUrl}/desks`;
  const token = makeToken(3600);
  const ids = Array.from({ length: 12 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`);
  const layout = ids.map((id, i) => ({ id, label: id, row: Math.floor(i / 4) + 1, col: (i % 4) + 1 }));
  const free = (overrides: Record<string, string> = {}): DeskAvailability[] =>
    ids.map(id => (overrides[id] ? { id, booked: true, bookedBy: overrides[id] } : { id, booked: false }));

  // Fixed "today": Friday 6 Nov 2026 -> window 6, 9, 10, 11 Nov. The page starts without a day (spec 649), so setup clicks `day` (null = leave unselected).
  function setup(opts: {
    loggedIn: boolean;
    mine?: MyBooking[];
    booked?: Record<string, string>;
    flushLayout?: boolean;
    day?: number | null;
  }): void {
    sessionStorage.clear();
    if (opts.loggedIn) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
    }
    TestBed.configureTestingModule({
      declarations: [BookingComponent, CalendarComponent, DeskPlanComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BOOKING_NOW, useValue: () => new Date(2026, 10, 6, 10, 0) }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BookingComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
    if (opts.flushLayout !== false) {
      http.expectOne(desksUrl).flush({ success: true, payload: { desks: layout } });
    }
    if (opts.loggedIn) {
      http.expectOne(`${bookingsUrl}/mine`).flush({ success: true, payload: { bookings: opts.mine ?? [] } });
    }
    const initialDay = opts.day === undefined ? 6 : opts.day;
    if (initialDay !== null) {
      day(initialDay).click();
      fixture.detectChanges();
      if (opts.loggedIn) {
        flushAvailability(opts.booked ?? {});
      }
    }
    fixture.detectChanges();
  }

  function flushAvailability(booked: Record<string, string> = {}): string | null {
    const req = http.expectOne(r => r.url === `${desksUrl}/availability`);
    req.flush({ success: true, payload: { desks: free(booked) } });
    fixture.detectChanges();
    return req.request.params.get('date');
  }

  const desks = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button.desk'));
  const desk = (id: string) => root.querySelector<HTMLButtonElement>(`button.desk[aria-label^="Desk ${id}"]`)!;
  const pick = (id: string) => {
    desk(id).click();
    fixture.detectChanges();
  };
  const bookButton = () => root.querySelector<HTMLButtonElement>('.book-button')!;
  const message = () => root.querySelector('.top-bar-message')?.textContent?.trim();
  const day = (n: number) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.day')).find(b => b.textContent?.trim() === String(n))!;
  const clickBook = () => {
    bookButton().click();
    fixture.detectChanges();
  };

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    sessionStorage.clear();
  });

  describe('AC1: layout on the page', () => {
    it('should render the calendar and exactly 12 desks loaded from GET /desks', () => {
      setup({ loggedIn: false });
      expect(root.querySelector('app-calendar')).not.toBeNull();
      expect(root.querySelector('app-desk-plan')).not.toBeNull();
      expect(desks().length).toBe(12);
    });

    it('should show the plan to signed-out users without state and without an availability request', () => {
      setup({ loggedIn: false });
      http.expectNone(r => r.url === `${desksUrl}/availability`);
      for (const b of desks()) {
        expect(b.disabled).toBeTrue();
        expect(b.querySelector('.desk-state')).toBeNull();
      }
      expect(root.querySelector('.plan-hint')?.textContent).toMatch(/log in/i);
    });

    it('should send no Authorization header to GET /desks', () => {
      sessionStorage.clear();
      TestBed.configureTestingModule({
        declarations: [BookingComponent, CalendarComponent, DeskPlanComponent],
        providers: [provideHttpClient(), provideHttpClientTesting()]
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(BookingComponent);
      fixture.detectChanges();
      const req = http.expectOne(desksUrl);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ success: true, payload: { desks: layout } });
    });

    it('should show a generic message when the layout cannot be loaded', () => {
      setup({ loggedIn: false, flushLayout: false });
      http.expectOne(desksUrl).flush({ success: false }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
      expect(desks().length).toBe(0);
    });

    // Layout (FR10): measured in the real browser with the component styles applied.
    function layoutAt(width: number): { calendar: DOMRect; plan: DOMRect; scrollWidth: number } {
      setup({ loggedIn: false });
      root.style.display = 'block';
      root.style.width = `${width}px`;
      const calendar = root.querySelector('.layout-calendar')!.getBoundingClientRect();
      const plan = root.querySelector('.layout-plan')!.getBoundingClientRect();
      return { calendar, plan, scrollWidth: root.scrollWidth };
    }

    it('should place calendar and plan side by side on a wide viewport', () => {
      const { calendar, plan } = layoutAt(1100);
      expect(plan.left).toBeGreaterThanOrEqual(calendar.right - 1);
      expect(Math.abs(plan.top - calendar.top)).toBeLessThan(4);
    });

    it('should stack calendar and plan on a narrow viewport without horizontal overflow at 320 px', () => {
      const { calendar, plan, scrollWidth } = layoutAt(320);
      expect(plan.top).toBeGreaterThanOrEqual(calendar.bottom - 1);
      expect(scrollWidth).toBeLessThanOrEqual(320);
    });
  });

  describe('AC2: availability for the selected date', () => {
    it('should request availability for the clicked date, not on load, and mark booked desks with the booker name', () => {
      sessionStorage.clear();
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
      TestBed.configureTestingModule({
        declarations: [BookingComponent, CalendarComponent, DeskPlanComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: BOOKING_NOW, useValue: () => new Date(2026, 10, 6, 10, 0) }
        ]
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(BookingComponent);
      root = fixture.nativeElement;
      fixture.detectChanges();
      http.expectOne(desksUrl).flush({ success: true, payload: { desks: layout } });
      http.expectOne(`${bookingsUrl}/mine`).flush({ success: true, payload: { bookings: [] } });
      http.expectNone(r => r.url === `${desksUrl}/availability`);
      day(6).click();
      fixture.detectChanges();
      const req = http.expectOne(r => r.url === `${desksUrl}/availability`);
      expect(req.request.params.get('date')).toBe('2026-11-06');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ success: true, payload: { desks: free({ D04: 'Ana' }) } });
      fixture.detectChanges();
      expect(desk('D04').getAttribute('aria-label')).toBe('Desk D04, booked by Ana');
      expect(desk('D04').querySelector('.desk-by')?.textContent?.trim()).toBe('Ana');
      expect(desk('D03').getAttribute('aria-label')).toBe('Desk D03, available');
    });

    it('should reload availability when the date changes and show the new state', () => {
      setup({ loggedIn: true, booked: { D04: 'Ana' } });
      day(9).click();
      fixture.detectChanges();
      const date = flushAvailability({ D07: 'Ben' });
      expect(date).toBe('2026-11-09');
      expect(desk('D04').getAttribute('aria-label')).toBe('Desk D04, available');
      expect(desk('D07').getAttribute('aria-label')).toBe('Desk D07, booked by Ben');
    });

    it('should ignore a stale availability response when the date changed meanwhile', () => {
      setup({ loggedIn: true });
      day(9).click();
      fixture.detectChanges();
      day(10).click();
      fixture.detectChanges();
      const reqs = http.match(r => r.url === `${desksUrl}/availability`);
      const dates = reqs.map(r => r.request.params.get('date'));
      const current = reqs.find(r => r.request.params.get('date') === '2026-11-10');
      expect(dates).toContain('2026-11-10');
      current!.flush({ success: true, payload: { desks: free({ D02: 'Current' }) } });
      fixture.detectChanges();
      for (const stale of reqs.filter(r => r !== current && !r.cancelled)) {
        stale.flush({ success: true, payload: { desks: free({ D09: 'Stale' }) } });
      }
      fixture.detectChanges();
      expect(desk('D02').getAttribute('aria-label')).toBe('Desk D02, booked by Current');
      expect(desk('D09').getAttribute('aria-label')).toBe('Desk D09, available');
    });

    it('should show a generic message when availability fails with 500', () => {
      setup({ loggedIn: true });
      day(9).click();
      fixture.detectChanges();
      http.expectOne(r => r.url === `${desksUrl}/availability`).flush({ success: false }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
      expect(TestBed.inject(AuthService).isAuthenticated()).toBeTrue();
    });

    it('should log out and show "You must log in first" when availability returns 401', () => {
      setup({ loggedIn: true });
      day(9).click();
      fixture.detectChanges();
      http.expectOne(r => r.url === `${desksUrl}/availability`).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();
      expect(TestBed.inject(AuthService).isAuthenticated()).toBeFalse();
      expect(message()).toBe(LOGIN_REQUIRED_MESSAGE);
    });

    it('should drop the desk states after logout', () => {
      setup({ loggedIn: true, booked: { D04: 'Ana' } });
      TestBed.inject(AuthService).logout();
      fixture.detectChanges();
      for (const b of desks()) {
        expect(b.disabled).toBeTrue();
        expect(b.querySelector('.desk-state')).toBeNull();
      }
      expect(root.querySelector('.plan-hint')).not.toBeNull();
    });
  });

  describe('AC4: booking a selected desk', () => {
    it('should highlight a free desk when selected', () => {
      setup({ loggedIn: true });
      pick('D03');
      expect(desk('D03').getAttribute('aria-pressed')).toBe('true');
      expect(desk('D03').getAttribute('aria-label')).toBe('Desk D03, selected');
      expect(desk('D02').getAttribute('aria-pressed')).toBe('false');
    });

    it('should move the selection when another free desk is picked', () => {
      setup({ loggedIn: true });
      pick('D03');
      pick('D08');
      expect(desk('D03').getAttribute('aria-pressed')).toBe('false');
      expect(desk('D08').getAttribute('aria-pressed')).toBe('true');
    });

    it('should send no request and ask for a desk when Book Now is pressed without a selection', () => {
      setup({ loggedIn: true });
      clickBook();
      http.expectNone(bookingsUrl);
      expect(message()).toBe(SELECT_DESK_MESSAGE);
      expect(bookButton().textContent?.trim()).toBe('Book Now');
    });

    it('should POST { date, desk }, show the desk as yours (still selectable, spec 649 R3) and switch to Withdraw booking', () => {
      setup({ loggedIn: true });
      pick('D03');
      clickBook();
      const req = http.expectOne(bookingsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ date: '2026-11-06', desk: 'D03' });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ success: true, payload: { booking: { date: '2026-11-06', desk: 'D03' } } }, { status: 201, statusText: 'Created' });
      fixture.detectChanges();
      expect(desk('D03').getAttribute('aria-label')).toBe('Desk D03, yours');
      expect(desk('D03').disabled).toBeFalse();
      expect(desk('D03').getAttribute('aria-pressed')).toBe('false');
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
    });

    it('should send the user id nowhere in the booking request body', () => {
      setup({ loggedIn: true });
      pick('D03');
      clickBook();
      const req = http.expectOne(bookingsUrl);
      expect(Object.keys(req.request.body as object).sort()).toEqual(['date', 'desk']);
      req.flush({ success: true }, { status: 201, statusText: 'Created' });
    });

    it('should reset the desk selection when the date changes', () => {
      setup({ loggedIn: true });
      pick('D03');
      day(9).click();
      fixture.detectChanges();
      flushAvailability();
      expect(desks().some(b => b.getAttribute('aria-pressed') === 'true')).toBeFalse();
      clickBook();
      http.expectNone(bookingsUrl);
      expect(message()).toBe(SELECT_DESK_MESSAGE);
    });

    it('should show my desk as yours from my bookings and free it again after withdrawing', () => {
      setup({ loggedIn: true, mine: [{ date: '2026-11-06', desk: 'D05' }], booked: { D05: TEST_USER.fullName } });
      expect(desk('D05').getAttribute('aria-label')).toBe('Desk D05, yours');
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      clickBook();
      http.expectOne(`${bookingsUrl}/2026-11-06`).flush({ success: true });
      fixture.detectChanges();
      expect(desk('D05').getAttribute('aria-label')).toBe('Desk D05, available');
      expect(desk('D05').disabled).toBeFalse();
      expect(bookButton().textContent?.trim()).toBe('Book Now');
    });

    it('should show a legacy booking without desk as booked for the date but occupy no desk', () => {
      setup({ loggedIn: true, mine: [{ date: '2026-11-06', desk: null }] });
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      for (const b of desks()) {
        expect(b.getAttribute('aria-label')).not.toMatch(/yours|booked/);
      }
    });

    it('should show "You must log in first" and make no request when signed out', () => {
      setup({ loggedIn: false });
      clickBook();
      http.expectNone(bookingsUrl);
      expect(message()).toBe(LOGIN_REQUIRED_MESSAGE);
    });
  });

  describe('AC5: booked desks and conflicts', () => {
    it('should not select a booked desk', () => {
      setup({ loggedIn: true, booked: { D04: 'Ana' } });
      pick('D04');
      expect(desk('D04').getAttribute('aria-label')).toBe('Desk D04, booked by Ana');
      clickBook();
      http.expectNone(bookingsUrl);
      expect(message()).toBe(SELECT_DESK_MESSAGE);
    });

    it('should show an error and refresh availability on 409', () => {
      setup({ loggedIn: true });
      pick('D03');
      clickBook();
      http.expectOne(bookingsUrl).flush({ success: false, message: 'Desk already booked' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(message()).toBe(BOOKING_CONFLICT_MESSAGE);
      const date = flushAvailability({ D03: 'Ben' });
      expect(date).toBe('2026-11-06');
      expect(desk('D03').getAttribute('aria-label')).toBe('Desk D03, booked by Ben');
      expect(desk('D03').disabled).toBeTrue();
      expect(bookButton().textContent?.trim()).toBe('Book Now');
    });

    it('should keep the plan unchanged and show a generic message on a 500 when booking', () => {
      setup({ loggedIn: true });
      pick('D03');
      clickBook();
      http.expectOne(bookingsUrl).flush({ success: false }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
      expect(bookButton().textContent?.trim()).toBe('Book Now');
    });
  });
});
