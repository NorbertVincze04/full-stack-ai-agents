import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, SESSION_STORAGE_KEY } from '../../core/auth.service';
import { TEST_USER, makeToken } from '../../testing/auth-test-utils';
import {
  BOOKING_NOW,
  BookingComponent,
  GENERIC_ERROR_MESSAGE,
  LOGIN_REQUIRED_MESSAGE,
  NO_DATE_MESSAGE,
  SELECT_DESK_MESSAGE
} from './booking.component';
import { DeskAvailability, MyBooking } from './booking.models';
import { CalendarComponent } from './calendar/calendar.component';
import { DeskPlanComponent } from './desk-plan/desk-plan.component';

// Select/deselect toggles on the booking page (spec 649 AC1-AC10), driven through the DOM and HTTP only.
describe('BookingComponent select/deselect (649)', () => {
  let fixture: ComponentFixture<BookingComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;
  const bookingsUrl = `${environment.apiUrl}/bookings`;
  const desksUrl = `${environment.apiUrl}/desks`;
  const availabilityUrl = `${desksUrl}/availability`;
  const token = makeToken(3600);
  const ids = Array.from({ length: 16 }, (_, i) => `${'ABCD'[Math.floor(i / 4)]}${(i % 4) + 1}`);
  const layout = ids.map((id, i) => ({ id, label: id, row: Math.floor(i / 4) + 1, col: (i % 4) + 1 }));
  const own = TEST_USER.fullName;

  // Fixed "today": Friday 6 Nov 2026 -> window 6, 9, 10, 11 Nov. No day is clicked by setup.
  function setup(opts: { loggedIn: boolean; mine?: MyBooking[] }): void {
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
    http.expectOne(desksUrl).flush({ success: true, payload: { desks: layout } });
    if (opts.loggedIn) {
      http.expectOne(`${bookingsUrl}/mine`).flush({ success: true, payload: { bookings: opts.mine ?? [] } });
    }
    fixture.detectChanges();
  }

  const mine = [{ date: '2026-11-06', desk: 'A1' }];

  function availabilityFor(date: string | null, bookings: MyBooking[], others: Record<string, string> = {}): DeskAvailability[] {
    const ownDesk = bookings.find(b => b.date === date)?.desk;
    return ids.map(id =>
      id === ownDesk ? { id, booked: true, bookedBy: own } : others[id] ? { id, booked: true, bookedBy: others[id] } : { id, booked: false }
    );
  }

  function flushAvailability(bookings: MyBooking[] = [], others: Record<string, string> = {}): string | null {
    const req = http.expectOne(r => r.url === availabilityUrl);
    const date = req.request.params.get('date');
    req.flush({ success: true, payload: { desks: availabilityFor(date, bookings, others) } });
    fixture.detectChanges();
    return date;
  }

  const day = (n: number) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.day')).find(b => b.textContent?.trim() === String(n))!;
  const desks = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button.desk'));
  const desk = (id: string) => root.querySelector<HTMLButtonElement>(`button.desk[aria-label^="Desk ${id}"]`)!;
  const bookButton = () => root.querySelector<HTMLButtonElement>('.book-button')!;
  const dateLabel = () => root.querySelector('.selected-date')?.textContent?.trim();
  const message = () => root.querySelector('.top-bar-message')?.textContent?.trim();
  const click = (el: HTMLElement) => {
    el.click();
    fixture.detectChanges();
  };
  const allNeutral = () => desks().every(b => b.disabled && !b.querySelector('.desk-state') && !b.hasAttribute('aria-pressed'));
  const pressedDays = () => Array.from(root.querySelectorAll('button.day')).filter(b => b.getAttribute('aria-pressed') === 'true');
  const pressedDesks = () => desks().filter(b => b.getAttribute('aria-pressed') === 'true');

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    sessionStorage.clear();
  });

  describe('AC5: page load without a day', () => {
    it('should show "No date selected", highlight no day, keep the 4 weekdays enabled and disable Book Now (signed out)', () => {
      setup({ loggedIn: false });
      expect(dateLabel()).toBe(NO_DATE_MESSAGE);
      expect(dateLabel()).toBe('No date selected');
      expect(pressedDays().length).toBe(0);
      expect(root.querySelectorAll('button.day.selected').length).toBe(0);
      expect(
        Array.from(root.querySelectorAll<HTMLButtonElement>('button.day'))
          .filter(b => !b.disabled)
          .map(b => b.textContent?.trim())
      ).toEqual(['6', '9', '10', '11']);
      expect(bookButton().disabled).toBeTrue();
      expect(allNeutral()).toBeTrue();
      http.expectNone(r => r.url === availabilityUrl);
    });

    it('should send no availability request on login and keep desks neutral and unselectable (signed in)', () => {
      setup({ loggedIn: true });
      expect(dateLabel()).toBe('No date selected');
      expect(pressedDays().length).toBe(0);
      expect(bookButton().disabled).toBeTrue();
      expect(desks().length).toBe(16);
      expect(allNeutral()).toBeTrue();
      http.expectNone(r => r.url === availabilityUrl);
    });

    it('should do nothing when the disabled Book Now is clicked: no request, no message', () => {
      setup({ loggedIn: true });
      click(bookButton());
      expect(message()).toBe('');
      http.expectNone(() => true);
    });

    it('should do nothing when the disabled Book Now is clicked while signed out: no "log in" message', () => {
      setup({ loggedIn: false });
      click(bookButton());
      expect(message()).toBe('');
      expect(message()).not.toBe(LOGIN_REQUIRED_MESSAGE);
      http.expectNone(() => true);
    });

    it('should not use "Please select a date first" and offer a non-clickable, non-focusable Book Now', () => {
      setup({ loggedIn: true });
      expect(root.textContent).not.toContain('Please select a date first');
      bookButton().focus();
      expect(document.activeElement).not.toBe(bookButton());
    });
  });

  describe('AC1, AC3: calendar toggle', () => {
    it('should select a day on the first click and deselect it on the second (signed out)', () => {
      setup({ loggedIn: false });
      click(day(9));
      expect(day(9).getAttribute('aria-pressed')).toBe('true');
      expect(dateLabel()).toBe('Mon, 9 Nov 2026');
      expect(bookButton().disabled).toBeFalse();
      click(day(9));
      expect(day(9).getAttribute('aria-pressed')).toBe('false');
      expect(day(9).classList).not.toContain('selected');
      expect(dateLabel()).toBe('No date selected');
      expect(bookButton().disabled).toBeTrue();
    });

    it('should keep at most one day selected when another day is clicked', () => {
      setup({ loggedIn: false });
      click(day(9));
      click(day(10));
      expect(pressedDays().length).toBe(1);
      expect(day(10).getAttribute('aria-pressed')).toBe('true');
      expect(day(9).getAttribute('aria-pressed')).toBe('false');
      expect(dateLabel()).toBe('Tue, 10 Nov 2026');
    });

    it('should select a day again after deselecting it and request availability again (signed in)', () => {
      setup({ loggedIn: true });
      click(day(9));
      expect(flushAvailability()).toBe('2026-11-09');
      click(day(9));
      click(day(9));
      expect(flushAvailability()).toBe('2026-11-09');
      expect(day(9).getAttribute('aria-pressed')).toBe('true');
    });

    it('should not select or toggle disabled days', () => {
      setup({ loggedIn: true });
      for (const n of [5, 7, 8, 12]) {
        click(day(n));
      }
      expect(dateLabel()).toBe('No date selected');
      expect(pressedDays().length).toBe(0);
      http.expectNone(r => r.url === availabilityUrl);
    });
  });

  describe('AC6: deselecting the day', () => {
    it('should show the no-date state, clear availability, send no request and keep Book Now inert (signed in)', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability([], { A4: 'Ana' });
      expect(desk('A4').getAttribute('aria-label')).toBe('Desk A4, booked by Ana');
      click(day(9));
      expect(dateLabel()).toBe('No date selected');
      expect(pressedDays().length).toBe(0);
      expect(allNeutral()).toBeTrue();
      expect(bookButton().disabled).toBeTrue();
      click(bookButton());
      expect(message()).toBe('');
      http.expectNone(() => true);
    });

    it('should drop an in-flight availability request when the day is deselected', () => {
      setup({ loggedIn: true });
      click(day(9));
      const pending = http.expectOne(r => r.url === availabilityUrl);
      click(day(9));
      expect(pending.cancelled).toBeTrue();
      expect(allNeutral()).toBeTrue();
    });

    it('should reset the desk selection when the day is deselected and selected again', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability();
      click(desk('A3'));
      expect(desk('A3').getAttribute('aria-pressed')).toBe('true');
      click(day(9));
      click(day(9));
      flushAvailability();
      expect(pressedDesks().length).toBe(0);
      click(bookButton());
      expect(message()).toBe(SELECT_DESK_MESSAGE);
      http.expectNone(bookingsUrl);
    });

    it('should reset the desk selection when another day is selected', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability();
      click(desk('A3'));
      click(day(10));
      expect(flushAvailability()).toBe('2026-11-10');
      expect(pressedDesks().length).toBe(0);
    });

    it('should clear the message on deselect', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability();
      click(bookButton());
      expect(message()).toBe(SELECT_DESK_MESSAGE);
      click(day(9));
      expect(message()).toBe('');
    });

    it('should show the no-date state after deselecting a day, also after a login-required message', () => {
      setup({ loggedIn: false });
      click(day(9));
      click(bookButton());
      expect(message()).toBe(LOGIN_REQUIRED_MESSAGE);
      click(day(9));
      expect(message()).toBe('');
      expect(bookButton().disabled).toBeTrue();
    });
  });

  describe('AC2, AC4: desk toggle', () => {
    beforeEach(() => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability([], { A4: 'Ana' });
    });

    it('should select a desk (Selected, aria-pressed true) and deselect it on the second click (Available, aria-pressed false)', () => {
      click(desk('A3'));
      expect(desk('A3').getAttribute('aria-pressed')).toBe('true');
      expect(desk('A3').getAttribute('aria-label')).toBe('Desk A3, selected');
      expect(desk('A3').querySelector('.desk-state')?.textContent).toMatch(/Selected/);
      click(desk('A3'));
      expect(desk('A3').getAttribute('aria-pressed')).toBe('false');
      expect(desk('A3').getAttribute('aria-label')).toBe('Desk A3, available');
      expect(desk('A3').querySelector('.desk-state')?.textContent).toMatch(/Available/);
      http.expectNone(() => true);
    });

    it('should keep at most one desk selected', () => {
      click(desk('A3'));
      click(desk('B4'));
      expect(pressedDesks().map(b => b.querySelector('.desk-label')?.textContent?.trim())).toEqual(['B4']);
    });

    it('should send no request and ask for a desk when Book Now is pressed after the desk was deselected (AC4)', () => {
      click(desk('A3'));
      click(desk('A3'));
      click(bookButton());
      expect(message()).toBe(SELECT_DESK_MESSAGE);
      http.expectNone(bookingsUrl);
    });

    it('should book the desk that is selected after a deselect and reselect', () => {
      click(desk('A3'));
      click(desk('A3'));
      click(desk('B2'));
      click(bookButton());
      const req = http.expectOne(bookingsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ date: '2026-11-09', desk: 'B2' });
      req.flush({ success: true }, { status: 201, statusText: 'Created' });
    });

    it('should clear the message when a desk is selected or deselected', () => {
      click(bookButton());
      expect(message()).toBe(SELECT_DESK_MESSAGE);
      click(desk('A3'));
      expect(message()).toBe('');
      click(bookButton());
      http.expectOne(bookingsUrl).flush({ success: false }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(message()).toBe(GENERIC_ERROR_MESSAGE);
      click(desk('A3'));
      expect(message()).toBe('');
    });

    it('should not select or toggle a desk booked by someone else', () => {
      click(desk('A4'));
      click(desk('A4'));
      expect(desk('A4').disabled).toBeTrue();
      expect(pressedDesks().length).toBe(0);
      click(bookButton());
      expect(message()).toBe(SELECT_DESK_MESSAGE);
    });
  });

  describe('AC7: own booked day', () => {
    beforeEach(() => {
      setup({ loggedIn: true, mine });
      click(day(6));
      flushAvailability(mine);
    });

    it('should show Withdraw booking and the own desk as yours when the own day is selected', () => {
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      expect(bookButton().disabled).toBeFalse();
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, yours');
    });

    it('should deselect the own day without a DELETE and keep the booked marker', () => {
      click(day(6));
      http.expectNone(r => r.method === 'DELETE');
      http.expectNone(() => true);
      expect(dateLabel()).toBe('No date selected');
      expect(day(6).getAttribute('aria-pressed')).toBe('false');
      expect(day(6).classList).toContain('booked');
      expect(day(6).getAttribute('aria-label')).toBe('Fri, 6 Nov 2026, booked');
      expect(bookButton().disabled).toBeTrue();
      expect(allNeutral()).toBeTrue();
    });

    it('should select the own day again and offer Withdraw booking with the own desk still yours', () => {
      click(day(6));
      click(day(6));
      flushAvailability(mine);
      expect(day(6).getAttribute('aria-pressed')).toBe('true');
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, yours');
      http.expectNone(r => r.method === 'DELETE');
    });

    it('should withdraw only through Withdraw booking, with a DELETE for the date', () => {
      click(bookButton());
      const req = http.expectOne(`${bookingsUrl}/2026-11-06`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      fixture.detectChanges();
      expect(bookButton().textContent?.trim()).toBe('Book Now');
      expect(day(6).classList).not.toContain('booked');
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, available');
    });

    it('should keep the booking when moving to another day and back (no DELETE)', () => {
      click(day(9));
      flushAvailability(mine);
      expect(bookButton().textContent?.trim()).toBe('Book Now');
      expect(day(6).classList).toContain('booked');
      click(day(6));
      flushAvailability(mine);
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      http.expectNone(r => r.method === 'DELETE');
    });
  });

  describe('AC8: own desk', () => {
    beforeEach(() => {
      setup({ loggedIn: true, mine });
      click(day(6));
      flushAvailability(mine);
    });

    it('should be clickable and toggle a selected highlight, still labelled as yours, without any request', () => {
      expect(desk('A1').disabled).toBeFalse();
      expect(desk('A1').getAttribute('aria-pressed')).toBe('false');
      click(desk('A1'));
      expect(desk('A1').getAttribute('aria-pressed')).toBe('true');
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, yours');
      expect(desk('A1').querySelector('.desk-state')?.textContent).toMatch(/Yours/);
      expect(desk('A1').classList).toContain('picked');
      click(desk('A1'));
      expect(desk('A1').getAttribute('aria-pressed')).toBe('false');
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, yours');
      expect(desk('A1').classList).not.toContain('picked');
      http.expectNone(() => true);
    });

    it('should keep Withdraw booking enabled, and unchanged, while the own desk is selected or deselected', () => {
      click(desk('A1'));
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      expect(bookButton().disabled).toBeFalse();
      click(desk('A1'));
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      expect(bookButton().disabled).toBeFalse();
      expect(day(6).classList).toContain('booked');
    });

    it('should withdraw by date when the own desk is selected and then show the desk as available and not pressed', () => {
      click(desk('A1'));
      click(bookButton());
      const req = http.expectOne(`${bookingsUrl}/2026-11-06`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
      fixture.detectChanges();
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, available');
      expect(desk('A1').getAttribute('aria-pressed')).toBe('false');
      expect(bookButton().textContent?.trim()).toBe('Book Now');
    });

    it('should drop the own desk highlight when the day is deselected and selected again', () => {
      click(desk('A1'));
      click(day(6));
      click(day(6));
      flushAvailability(mine);
      expect(desk('A1').getAttribute('aria-pressed')).toBe('false');
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, yours');
    });

    it('should not let another free desk selection change the own desk label or the Withdraw booking button', () => {
      click(desk('A1'));
      click(desk('B1'));
      expect(desk('A1').getAttribute('aria-pressed')).toBe('false');
      expect(desk('A1').getAttribute('aria-label')).toBe('Desk A1, yours');
      expect(desk('B1').getAttribute('aria-pressed')).toBe('true');
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
    });
  });

  describe('AC9, AC10: unchanged rules and accessibility', () => {
    it('should keep desks neutral and unselectable when signed out even with a day selected', () => {
      setup({ loggedIn: false });
      click(day(9));
      expect(allNeutral()).toBeTrue();
      for (const b of desks()) {
        click(b);
      }
      expect(pressedDesks().length).toBe(0);
      http.expectNone(() => true);
    });

    it('should still show "You must log in first" for signed-out Book Now once a day is selected, without a request', () => {
      setup({ loggedIn: false });
      click(day(9));
      click(bookButton());
      expect(message()).toBe('You must log in first');
      http.expectNone(() => true);
    });

    it('should keep the booking flow (POST then Withdraw booking) after the toggles', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability();
      click(day(9));
      click(day(9));
      flushAvailability();
      click(desk('A3'));
      click(desk('A3'));
      click(desk('B3'));
      click(bookButton());
      const req = http.expectOne(bookingsUrl);
      expect(req.request.body).toEqual({ date: '2026-11-09', desk: 'B3' });
      req.flush({ success: true }, { status: 201, statusText: 'Created' });
      fixture.detectChanges();
      expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
      expect(day(9).classList).toContain('booked');
      expect(desk('B3').getAttribute('aria-label')).toBe('Desk B3, yours');
    });

    it('should show 409 handling unchanged and reset the desk selection', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability();
      click(desk('A3'));
      click(bookButton());
      http.expectOne(bookingsUrl).flush({ success: false }, { status: 409, statusText: 'Conflict' });
      flushAvailability([], { A3: 'Ben' });
      expect(desk('A3').getAttribute('aria-label')).toBe('Desk A3, booked by Ben');
      expect(pressedDesks().length).toBe(0);
    });

    it('should expose day and desk toggles as focusable native buttons with an accessible name and aria-pressed', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability();
      for (const el of [day(9), desk('A3')]) {
        expect(el.tagName).toBe('BUTTON');
        expect(el.getAttribute('type')).toBe('button');
        expect(el.getAttribute('aria-label')).toBeTruthy();
        expect(el.hasAttribute('aria-pressed')).toBeTrue();
        el.focus();
        expect(document.activeElement).toBe(el);
      }
    });

    it('should make the disabled Book Now unfocusable after the day is deselected', () => {
      setup({ loggedIn: true });
      click(day(9));
      flushAvailability();
      click(day(9));
      expect(bookButton().disabled).toBeTrue();
      bookButton().focus();
      expect(document.activeElement).not.toBe(bookButton());
    });
  });
});
