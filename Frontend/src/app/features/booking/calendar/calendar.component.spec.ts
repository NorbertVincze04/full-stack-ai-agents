import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  let fixture: ComponentFixture<CalendarComponent>;
  let component: CalendarComponent;
  let root: HTMLElement;
  const bookable = ['2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11'];

  function dayButtons(): HTMLButtonElement[] {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button.day'));
  }

  function dayButton(day: number): HTMLButtonElement {
    return dayButtons().find(b => b.textContent?.trim() === String(day))!;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [CalendarComponent] });
    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    root = fixture.nativeElement;
    component.bookable = bookable;
    component.selected = '2026-11-06';
    component.booked = [];
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('should render the month of the selected date with all its days', () => {
    expect(root.querySelector('.month-label')?.textContent).toContain('November 2026');
    expect(dayButtons().length).toBe(30);
  });

  it('should enable only the bookable days (FR2)', () => {
    const enabled = dayButtons().filter(b => !b.disabled).map(b => b.textContent?.trim());
    expect(enabled).toEqual(['6', '9', '10', '11']);
  });

  it('should mark disabled days with aria-disabled and enabled days with aria-disabled=false', () => {
    expect(dayButton(7).getAttribute('aria-disabled')).toBe('true'); // Saturday
    expect(dayButton(8).getAttribute('aria-disabled')).toBe('true'); // Sunday
    expect(dayButton(5).getAttribute('aria-disabled')).toBe('true'); // past
    expect(dayButton(12).getAttribute('aria-disabled')).toBe('true'); // beyond window
    expect(dayButton(9).getAttribute('aria-disabled')).toBe('false');
  });

  it('should set aria-pressed only on the selected day', () => {
    expect(dayButton(6).getAttribute('aria-pressed')).toBe('true');
    expect(dayButton(9).getAttribute('aria-pressed')).toBe('false');
  });

  it('should emit dateSelected when an enabled day is clicked', () => {
    const emitted: string[] = [];
    component.dateSelected.subscribe(d => emitted.push(d));
    dayButton(10).click();
    expect(emitted).toEqual(['2026-11-10']);
  });

  describe('toggle (spec 649 AC1, AC7, AC9, AC10)', () => {
    let selected: string[];
    let deselected: number;

    beforeEach(() => {
      selected = [];
      deselected = 0;
      component.dateSelected.subscribe(d => selected.push(d));
      component.dateDeselected.subscribe(() => deselected++);
    });

    it('should emit dateDeselected and not dateSelected when the selected day is clicked', () => {
      dayButton(6).click();
      expect(deselected).toBe(1);
      expect(selected).toEqual([]);
    });

    it('should emit dateSelected and not dateDeselected when an unselected enabled day is clicked', () => {
      dayButton(9).click();
      expect(selected).toEqual(['2026-11-09']);
      expect(deselected).toBe(0);
    });

    it('should show no pressed day and no highlight when nothing is selected, keeping the 4 bookable days enabled', () => {
      component.selected = null;
      component.ngOnChanges();
      fixture.detectChanges();
      expect(dayButtons().some(b => b.getAttribute('aria-pressed') === 'true')).toBeFalse();
      expect(dayButtons().filter(b => b.classList.contains('selected')).length).toBe(0);
      expect(dayButtons().filter(b => !b.disabled).map(b => b.textContent?.trim())).toEqual(['6', '9', '10', '11']);
      expect(dayButton(6).getAttribute('aria-pressed')).toBe('false');
    });

    it('should select a day again after it was deselected', () => {
      component.selected = null;
      component.ngOnChanges();
      fixture.detectChanges();
      dayButton(6).click();
      expect(selected).toEqual(['2026-11-06']);
      expect(deselected).toBe(0);
    });

    it('should render the month of the first bookable day when it starts without a selection', () => {
      const other = TestBed.createComponent(CalendarComponent);
      other.componentInstance.bookable = ['2026-12-01', '2026-12-02'];
      other.componentInstance.selected = null;
      other.componentInstance.booked = [];
      other.componentInstance.ngOnChanges();
      other.detectChanges();
      expect(other.nativeElement.querySelector('.month-label')?.textContent).toContain('December 2026');
      expect(other.nativeElement.querySelectorAll('button.day[aria-pressed="true"]').length).toBe(0);
    });

    it('should deselect a selected day the user has booked and keep its booked marker and label', () => {
      component.booked = ['2026-11-06'];
      component.ngOnChanges();
      fixture.detectChanges();
      expect(dayButton(6).getAttribute('aria-pressed')).toBe('true');
      dayButton(6).click();
      expect(deselected).toBe(1);
      expect(selected).toEqual([]);
      component.selected = null;
      component.ngOnChanges();
      fixture.detectChanges();
      expect(dayButton(6).getAttribute('aria-pressed')).toBe('false');
      expect(dayButton(6).classList).toContain('booked');
      expect(dayButton(6).getAttribute('aria-label')).toBe('Fri, 6 Nov 2026, booked');
    });

    it('should emit nothing when a disabled day is clicked, even a disabled selected day', () => {
      component.selected = '2026-11-07';
      component.ngOnChanges();
      fixture.detectChanges();
      dayButton(7).click();
      dayButton(12).click();
      expect(selected).toEqual([]);
      expect(deselected).toBe(0);
      component.select({ iso: '2026-11-07', day: 7, enabled: false, selected: true, booked: false, label: '' });
      expect(deselected).toBe(0);
    });

    it('should render days as native type=button elements so Enter and Space toggle them', () => {
      for (const b of dayButtons()) {
        expect(b.tagName).toBe('BUTTON');
        expect(b.getAttribute('type')).toBe('button');
      }
      dayButton(6).focus();
      expect(document.activeElement).toBe(dayButton(6));
      expect(dayButton(6).getAttribute('aria-label')).toBe('Fri, 6 Nov 2026');
    });
  });

  it('should not emit when a disabled day is clicked or selected programmatically', () => {
    const emitted: string[] = [];
    component.dateSelected.subscribe(d => emitted.push(d));
    dayButton(7).click();
    dayButton(12).click();
    component.select({ iso: '2026-11-07', day: 7, enabled: false, selected: false, booked: false, label: '' });
    expect(emitted).toEqual([]);
  });

  it('should mark booked days and include "booked" in their label', () => {
    component.booked = ['2026-11-09'];
    component.ngOnChanges();
    fixture.detectChanges();
    expect(dayButton(9).classList).toContain('booked');
    expect(dayButton(9).getAttribute('aria-label')).toBe('Mon, 9 Nov 2026, booked');
    expect(dayButton(10).classList).not.toContain('booked');
  });

  it('should navigate to the next and previous month', () => {
    root.querySelector<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.month-label')?.textContent).toContain('December 2026');
    expect(dayButtons().every(b => b.disabled)).toBeTrue();
    root.querySelector<HTMLButtonElement>('button[aria-label="Previous month"]')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.month-label')?.textContent).toContain('November 2026');
  });

  it('should show a window crossing into the next month as enabled there', () => {
    component.bookable = ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'];
    component.selected = '2026-11-30';
    component.ngOnChanges();
    root.querySelector<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
    fixture.detectChanges();
    expect(dayButtons().filter(b => !b.disabled).map(b => b.textContent?.trim())).toEqual(['1', '2', '3']);
  });
});
