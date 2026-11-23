import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { BOOKING_NOW, BookingComponent } from './booking.component';
import { CalendarComponent } from './calendar/calendar.component';
import { DeskPlanComponent } from './desk-plan/desk-plan.component';

// Hero section split (AC1-AC3): measured in the real browser with the component styles applied.
describe('BookingComponent hero layout', () => {
  let fixture: ComponentFixture<BookingComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      declarations: [BookingComponent, CalendarComponent, DeskPlanComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BOOKING_NOW, useValue: () => new Date(2026, 10, 6, 10, 0) }
      ]
    });
    const http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BookingComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/desks`).flush({ success: true, payload: { desks: [] } });
    fixture.detectChanges();
    root.style.display = 'block';
  });

  afterEach(() => sessionStorage.clear());

  const box = (selector: string) => root.querySelector(selector)!.getBoundingClientRect();

  describe('AC2: structure', () => {
    it('should nest app-calendar in .layout-calendar and app-desk-plan in .layout-plan inside .booking-layout', () => {
      expect(root.querySelector('.booking-layout > .layout-calendar > app-calendar')).not.toBeNull();
      expect(root.querySelector('.booking-layout > .layout-plan > app-desk-plan')).not.toBeNull();
    });
  });

  describe('AC1: wide viewport', () => {
    it('should give the calendar div and the desk plan div equal widths', () => {
      root.style.width = '1100px';
      expect(Math.abs(box('.layout-calendar').width - box('.layout-plan').width)).toBeLessThan(1);
    });

    it('should put the calendar on the left and the desk plan on the right, same top', () => {
      root.style.width = '1100px';
      const calendar = box('.layout-calendar');
      const plan = box('.layout-plan');
      expect(plan.left).toBeGreaterThanOrEqual(calendar.right - 1);
      expect(Math.abs(plan.top - calendar.top)).toBeLessThan(4);
    });

    it('should fill the row: both divs together take about the full container width minus the gap', () => {
      root.style.width = '1100px';
      const calendar = box('.layout-calendar');
      const plan = box('.layout-plan');
      const gap = plan.left - calendar.right;
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(calendar.width + plan.width + gap).toBeGreaterThan(1100 * 0.95);
    });
  });

  describe('AC3: narrow viewport', () => {
    it('should stack the desk plan below the calendar without horizontal overflow at 320 px', () => {
      root.style.width = '320px';
      expect(box('.layout-plan').top).toBeGreaterThanOrEqual(box('.layout-calendar').bottom - 1);
      expect(root.scrollWidth).toBeLessThanOrEqual(320);
    });

    it('should stack just below 768 px (767 px)', () => {
      root.style.width = '767px';
      expect(box('.layout-plan').top).toBeGreaterThanOrEqual(box('.layout-calendar').bottom - 1);
    });

    it('should sit side by side from 768 px', () => {
      root.style.width = '768px';
      const calendar = box('.layout-calendar');
      const plan = box('.layout-plan');
      expect(plan.left).toBeGreaterThanOrEqual(calendar.right - 1);
      expect(Math.abs(plan.top - calendar.top)).toBeLessThan(4);
    });
  });
});
