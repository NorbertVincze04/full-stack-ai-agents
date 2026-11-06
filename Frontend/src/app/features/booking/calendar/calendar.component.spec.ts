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
