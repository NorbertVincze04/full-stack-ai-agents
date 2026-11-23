import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AppComponent } from '../../app.component';
import { environment } from '../../../environments/environment';
import { BOOKING_NOW, BookingComponent } from './booking.component';
import { CalendarComponent } from './calendar/calendar.component';
import { DeskPlanComponent } from './desk-plan/desk-plan.component';

// Shadow and borders: computed styles in the real browser with global and component styles applied.
const SM = 'rgba(0, 0, 0, 0.08) 0px 1px 2px 0px';
const MD = 'rgba(0, 0, 0, 0.12) 0px 4px 12px 0px';
const BORDER = 'rgb(209, 213, 219)';

describe('Shadow and borders', () => {
  describe('AC1: tokens on :root', () => {
    const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).replace(/\s+/g, ' ').trim();

    it('should define --border-color #d1d5db', () => expect(token('--border-color').toLowerCase()).toContain('#d1d5db'));
    it('should define --radius 8px', () => expect(token('--radius')).toBe('8px'));
    it('should define --radius-sm 6px', () => expect(token('--radius-sm')).toBe('6px'));
    it('should define --shadow-sm', () => expect(token('--shadow-sm').replace(/ /g, '')).toBe('01px2pxrgba(0,0,0,.08)'));
    it('should define --shadow-md', () => expect(token('--shadow-md').replace(/ /g, '')).toBe('04px12pxrgba(0,0,0,.12)'));
  });

  describe('booking page', () => {
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
      document.body.appendChild(root);
      fixture.detectChanges();
      http.expectOne(`${environment.apiUrl}/desks`).flush({ success: true, payload: { desks: [] } });
      fixture.detectChanges();
    });

    afterEach(() => {
      root.remove();
      sessionStorage.clear();
    });

    const style = (selector: string) => getComputedStyle(root.querySelector(selector)!);

    describe('AC2: containers', () => {
      for (const selector of ['.top-bar', '.calendar', '.desk-plan']) {
        it(`${selector} should have 1px #d1d5db border, 8px radius and shadow-sm`, () => {
          const s = style(selector);
          expect(s.borderTopWidth).toBe('1px');
          expect(s.borderTopColor).toBe(BORDER);
          expect(s.borderTopLeftRadius).toBe('8px');
          expect(s.boxShadow).toBe(SM);
        });
      }
    });

    describe('AC4: buttons', () => {
      it('should round the enabled book button 6px with shadow-sm', () => {
        root.querySelector<HTMLButtonElement>('.day:not([disabled])')!.click();
        fixture.detectChanges();
        const s = style('.book-button');
        expect(s.borderTopLeftRadius).toBe('6px');
        expect(s.boxShadow).toBe(SM);
      });

      it('should have no shadow on a disabled book button', () => {
        const button = root.querySelector<HTMLButtonElement>('.book-button')!;
        expect(button.disabled).toBeTrue();
        expect(getComputedStyle(button).boxShadow).toBe('none');
      });

      it('should round the calendar nav buttons 6px', () => {
        expect(style('.nav-button').borderTopLeftRadius).toBe('6px');
      });
    });

    describe('AC5: states stay distinguishable', () => {
      it('should keep a visible border on day buttons', () => {
        const s = style('.day');
        expect(s.borderTopStyle).not.toBe('none');
        expect(parseFloat(s.borderTopWidth)).toBeGreaterThanOrEqual(1);
      });
    });

    describe('AC6: narrow viewport', () => {
      it('should not overflow horizontally at 320 px', () => {
        root.style.display = 'block';
        root.style.width = '320px';
        expect(root.scrollWidth).toBeLessThanOrEqual(320);
      });
    });
  });

  describe('AC3: header and footer', () => {
    let el: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [RouterModule.forRoot([])],
        declarations: [AppComponent],
        providers: [provideHttpClient(), provideHttpClientTesting()]
      }).compileComponents();
      const fixture = TestBed.createComponent(AppComponent);
      el = fixture.nativeElement;
      document.body.appendChild(el);
      fixture.detectChanges();
    });

    afterEach(() => el.remove());

    it('should give the header a bottom shadow-md and no border', () => {
      const s = getComputedStyle(el.querySelector('header')!);
      expect(s.boxShadow).toBe(MD);
      expect(s.borderBottomWidth).toBe('0px');
    });

    it('should give the footer a top shadow and no border', () => {
      const s = getComputedStyle(el.querySelector('footer')!);
      expect(s.boxShadow).not.toBe('none');
      expect(s.borderTopWidth).toBe('0px');
    });
  });

  // deferred/manual: hover shadow-md (needs pointer events), focus ring pixels, contrast (AC8),
  // AC9 (auth, info, terms unchanged) and AC7 (build) are checked by review / green.
});
