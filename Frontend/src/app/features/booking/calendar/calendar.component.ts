import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MONTH_NAMES, formatDate, parseIsoDate, toIsoDate } from '../booking-dates';

interface DayCell {
  iso: string;
  day: number;
  enabled: boolean;
  selected: boolean;
  booked: boolean;
  label: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnChanges {
  @Input() bookable: string[] = [];
  @Input() selected: string | null = null;
  @Input() booked: string[] = [];
  @Output() dateSelected = new EventEmitter<string>();

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  monthLabel = '';
  weeks: (DayCell | null)[][] = [];
  private year = 0;
  private month = 0;
  private viewInitialised = false;

  ngOnChanges(): void {
    if (!this.viewInitialised) {
      const anchor = parseIsoDate(this.selected ?? this.bookable[0] ?? toIsoDate(new Date()));
      this.year = anchor.getFullYear();
      this.month = anchor.getMonth();
      this.viewInitialised = true;
    }
    this.render();
  }

  shiftMonth(delta: number): void {
    const target = new Date(this.year, this.month + delta, 1);
    this.year = target.getFullYear();
    this.month = target.getMonth();
    this.render();
  }

  select(cell: DayCell): void {
    if (cell.enabled) {
      this.dateSelected.emit(cell.iso);
    }
  }

  private render(): void {
    this.monthLabel = `${MONTH_NAMES[this.month]} ${this.year}`;
    const offset = (new Date(this.year, this.month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    const cells: (DayCell | null)[] = Array(offset).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toIsoDate(new Date(this.year, this.month, day));
      const booked = this.booked.includes(iso);
      cells.push({
        iso,
        day,
        enabled: this.bookable.includes(iso),
        selected: iso === this.selected,
        booked,
        label: booked ? `${formatDate(iso)}, booked` : formatDate(iso)
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      this.weeks.push(cells.slice(i, i + 7));
    }
  }
}
