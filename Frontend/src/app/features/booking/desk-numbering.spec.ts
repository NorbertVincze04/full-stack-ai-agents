import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, SESSION_STORAGE_KEY } from '../../core/auth.service';
import { TEST_USER, makeToken } from '../../testing/auth-test-utils';
import { BOOKING_NOW, BookingComponent } from './booking.component';
import { Desk, DeskAvailability, MyBooking } from './booking.models';
import { CalendarComponent } from './calendar/calendar.component';
import { DeskPlanComponent } from './desk-plan/desk-plan.component';

// Task 650: 16 desks A1-D4 as 4 blocks of 2 x 2 (A, B above; C, D below); API shape unchanged.
const LETTERS = ['A', 'B', 'C', 'D'];
const labels = LETTERS.flatMap(l => [1, 2, 3, 4].map(n => `${l}${n}`));

// Grid 4 x 4: block origin by letter (A top-left, B top-right, C bottom-left, D bottom-right), 2 x 2 inside a block.
const layout: Desk[] = LETTERS.flatMap((letter, b) =>
  [1, 2, 3, 4].map(n => ({
    id: `${letter}${n}`,
    label: `${letter}${n}`,
    row: (b >= 2 ? 2 : 0) + (n <= 2 ? 1 : 2),
    col: (b % 2 === 1 ? 2 : 0) + (n % 2 === 1 ? 1 : 2)
  }))
);
const allFree: DeskAvailability[] = labels.map(id => ({ id, booked: false }));

describe('Desk numbering (task 650): desk plan', () => {
  let fixture: ComponentFixture<DeskPlanComponent>;
  let root: HTMLElement;

  function render(availability: DeskAvailability[] | null, extra: { selectedDesk?: string; yourDesk?: string } = {}): void {
    const ref = fixture.componentRef;
    ref.setInput('desks', layout);
    ref.setInput('availability', availability);
    ref.setInput('selectedDesk', extra.selectedDesk ?? null);
    ref.setInput('yourDesk', extra.yourDesk ?? null);
    ref.setInput('signedIn', availability !== null);
    fixture.detectChanges();
  }
  const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button.desk'));
  const labelOf = (b: HTMLElement) => b.querySelector('.desk-label')?.textContent?.trim();
  const byLabel = (l: string) => buttons().find(b => labelOf(b) === l)!;

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [DeskPlanComponent] });
    fixture = TestBed.createComponent(DeskPlanComponent);
    root = fixture.nativeElement;
  });

  it('AC2: should render 16 desks with labels A1-A4, B1-B4, C1-C4, D1-D4 in this order', () => {
    render(null);
    expect(buttons().map(labelOf)).toEqual(labels);
  });

  it('AC2: should show the label only, with no letter headings', () => {
    render(allFree);
    expect(root.querySelectorAll('h1, h3, h4, h5, h6, [role="heading"]').length).toBe(0);
    const headings = Array.from(root.querySelectorAll('h2')).map(h => h.textContent?.trim());
    expect(headings).toEqual(['Office floor plan']);
    for (const b of buttons()) {
      expect(labelOf(b)).toMatch(/^[A-D][1-4]$/);
    }
  });

  it('AC2: should place each letter as a 2 x 2 block from the row/col of the API', () => {
    render(allFree);
    for (const letter of LETTERS) {
      const cells = [1, 2, 3, 4].map(n => {
        const b = byLabel(`${letter}${n}`);
        return { row: Number(b.style.gridRowStart), col: Number(b.style.gridColumnStart) };
      });
      const rows = new Set(cells.map(c => c.row));
      const cols = new Set(cells.map(c => c.col));
      expect(rows.size).toBe(2);
      expect(cols.size).toBe(2);
      expect(Math.max(...rows) - Math.min(...rows)).toBe(1);
      expect(Math.max(...cols) - Math.min(...cols)).toBe(1);
      expect(new Set(cells.map(c => `${c.row}/${c.col}`)).size).toBe(4);
    }
  });

  it('AC2: should put A and B in the upper half and C and D in the lower half', () => {
    render(allFree);
    const rowOf = (l: string) => Number(byLabel(l).style.gridRowStart);
    const colOf = (l: string) => Number(byLabel(l).style.gridColumnStart);
    expect(Math.max(rowOf('A1'), rowOf('A4'), rowOf('B1'), rowOf('B4'))).toBeLessThan(
      Math.min(rowOf('C1'), rowOf('C4'), rowOf('D1'), rowOf('D4'))
    );
    expect(colOf('A4')).toBeLessThan(colOf('B1'));
    expect(colOf('C4')).toBeLessThan(colOf('D1'));
  });

  it('AC2: should give every desk its own cell (no overlap)', () => {
    render(allFree);
    const cells = buttons().map(b => `${b.style.gridRowStart}/${b.style.gridColumnStart}`);
    expect(new Set(cells).size).toBe(16);
  });

  it('AC2: should set data-block to the letter of each desk', () => {
    render(allFree);
    for (const b of buttons()) {
      expect(b.getAttribute('data-block')).toBe(labelOf(b)![0]);
    }
  });

  it('AC2: should separate the blocks: left-edge class only in column 3, top-edge class only in row 3', () => {
    render(allFree);
    for (const b of buttons()) {
      expect(b.classList.contains('block-left-edge')).withContext(labelOf(b)!).toBe(b.style.gridColumnStart === '3');
      expect(b.classList.contains('block-top-edge')).withContext(labelOf(b)!).toBe(b.style.gridRowStart === '3');
    }
    expect(buttons().filter(b => b.classList.contains('block-left-edge')).length).toBe(4);
    expect(buttons().filter(b => b.classList.contains('block-top-edge')).length).toBe(4);
  });

  it('AC3: should let the user select, deselect and see C3 as yours', () => {
    render(allFree);
    const emitted: string[] = [];
    let deselected = 0;
    fixture.componentInstance.deskSelected.subscribe(id => emitted.push(id));
    fixture.componentInstance.deskDeselected.subscribe(() => deselected++);
    byLabel('C3').click();
    expect(emitted).toEqual(['C3']);
    render(allFree, { selectedDesk: 'C3' });
    expect(byLabel('C3').getAttribute('aria-label')).toBe('Desk C3, selected');
    byLabel('C3').click();
    expect(deselected).toBe(1);
    render(allFree, { yourDesk: 'C3' });
    expect(byLabel('C3').getAttribute('aria-label')).toBe('Desk C3, yours');
  });

  it('AC3: should show a desk as booked with the booker name for new ids (D4)', () => {
    render(labels.map(id => (id === 'D4' ? { id, booked: true, bookedBy: 'Ana' } : { id, booked: false })));
    expect(byLabel('D4').getAttribute('aria-label')).toBe('Desk D4, booked by Ana');
    expect(byLabel('D4').disabled).toBeTrue();
    expect(byLabel('D3').disabled).toBeFalse();
  });

  it('AC4: should mark no desk as booked or yours when no desk id matches (booking without desk)', () => {
    render(allFree, { yourDesk: null as unknown as string });
    for (const b of buttons()) {
      expect(b.getAttribute('aria-label')).toMatch(/available$/);
    }
  });
});

describe('Desk numbering (task 650): booking page', () => {
  let fixture: ComponentFixture<BookingComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;
  const bookingsUrl = `${environment.apiUrl}/bookings`;
  const desksUrl = `${environment.apiUrl}/desks`;
  const token = makeToken(3600);

  function setup(mine: MyBooking[], booked: Record<string, string> = {}): void {
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
    http.expectOne(`${bookingsUrl}/mine`).flush({ success: true, payload: { bookings: mine } });
    day(6).click();
    fixture.detectChanges();
    flushAvailability(booked);
  }
  function flushAvailability(booked: Record<string, string>): void {
    http.expectOne(r => r.url === `${desksUrl}/availability`).flush({
      success: true,
      payload: { desks: labels.map(id => (booked[id] ? { id, booked: true, bookedBy: booked[id] } : { id, booked: false })) }
    });
    fixture.detectChanges();
  }
  const day = (n: number) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.day')).find(b => b.textContent?.trim() === String(n))!;
  const desk = (id: string) => root.querySelector<HTMLButtonElement>(`button.desk[aria-label^="Desk ${id}"]`)!;
  const bookButton = () => root.querySelector<HTMLButtonElement>('.book-button')!;

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    sessionStorage.clear();
  });

  it('AC1/AC2: should render the 16 desks loaded from GET /desks', () => {
    setup([]);
    expect(root.querySelectorAll('button.desk').length).toBe(16);
    expect(desk('A1')).toBeTruthy();
    expect(desk('D4')).toBeTruthy();
  });

  it('AC3: should POST { date, desk: "C3" }, show C3 as yours and withdraw it again', () => {
    setup([]);
    desk('C3').click();
    fixture.detectChanges();
    expect(desk('C3').getAttribute('aria-pressed')).toBe('true');
    bookButton().click();
    fixture.detectChanges();
    const req = http.expectOne(bookingsUrl);
    expect(req.request.body).toEqual({ date: '2026-11-06', desk: 'C3' });
    req.flush({ success: true, payload: { booking: { date: '2026-11-06', desk: 'C3' } } }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(desk('C3').getAttribute('aria-label')).toBe('Desk C3, yours');
    expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
    bookButton().click();
    http.expectOne(`${bookingsUrl}/2026-11-06`).flush({ success: true });
    fixture.detectChanges();
    expect(desk('C3').getAttribute('aria-label')).toBe('Desk C3, available');
    expect(bookButton().textContent?.trim()).toBe('Book Now');
  });

  it('AC3: should show a desk booked by someone else as taken (B2) and keep the others selectable', () => {
    setup([], { B2: 'Ana' });
    expect(desk('B2').getAttribute('aria-label')).toBe('Desk B2, booked by Ana');
    expect(desk('B2').disabled).toBeTrue();
    expect(desk('B3').disabled).toBeFalse();
  });

  it('AC4: should list a booking without desk as booked for the date, with no desk marked yours or booked', () => {
    setup([{ date: '2026-11-06', desk: null }]);
    expect(bookButton().textContent?.trim()).toBe('Withdraw booking');
    expect(root.querySelectorAll('button.desk').length).toBe(16);
    for (const b of Array.from(root.querySelectorAll<HTMLButtonElement>('button.desk'))) {
      expect(b.getAttribute('aria-label')).toMatch(/available$/);
    }
  });

  it('AC4: should not show a desk label or an "undefined"/"null" text for a booking without desk', () => {
    setup([{ date: '2026-11-06', desk: null }]);
    expect(root.textContent).not.toMatch(/undefined|null/);
    expect(root.querySelector('.desk.yours')).toBeNull();
  });

  it('AC4: should free the date when a booking without desk is withdrawn', () => {
    setup([{ date: '2026-11-06', desk: null }]);
    bookButton().click();
    http.expectOne(`${bookingsUrl}/2026-11-06`).flush({ success: true });
    fixture.detectChanges();
    expect(bookButton().textContent?.trim()).toBe('Book Now');
  });
});
