import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, InjectionToken, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { bookableDates, formatDate } from './booking-dates';
import { BookingService } from './booking.service';

export const BOOKING_NOW = new InjectionToken<() => Date>('BOOKING_NOW', {
  providedIn: 'root',
  factory: () => () => new Date()
});

export const LOGIN_REQUIRED_MESSAGE = 'You must log in first';
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css'
})
export class BookingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = inject(BOOKING_NOW);
  bookable: string[] = [];
  selected: string | null = null;
  booked: string[] = [];
  busy = false;
  error: string | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly bookings: BookingService
  ) {}

  get selectedLabel(): string {
    return this.selected ? formatDate(this.selected) : '';
  }

  get isBooked(): boolean {
    return this.selected !== null && this.booked.includes(this.selected);
  }

  ngOnInit(): void {
    this.bookable = bookableDates(this.now());
    this.selected = this.bookable[0];
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      if (user) {
        this.loadBooked();
      } else {
        this.booked = [];
      }
    });
  }

  select(date: string): void {
    this.selected = date;
    this.error = null;
  }

  toggleBooking(): void {
    if (this.busy || !this.selected) {
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.error = LOGIN_REQUIRED_MESSAGE;
      return;
    }
    const date = this.selected;
    const withdrawing = this.isBooked;
    this.error = null;
    this.busy = true;
    (withdrawing ? this.bookings.withdraw(date) : this.bookings.book(date)).subscribe({
      next: () => {
        this.busy = false;
        this.booked = withdrawing ? this.booked.filter(d => d !== date) : [...this.booked, date];
      },
      error: (err: unknown) => {
        this.busy = false;
        if (withdrawing && err instanceof HttpErrorResponse && err.status === 404) {
          this.booked = this.booked.filter(d => d !== date);
        }
        this.fail(err);
      }
    });
  }

  private loadBooked(): void {
    this.bookings.listMine().subscribe({
      next: dates => (this.booked = dates),
      error: (err: unknown) => this.fail(err)
    });
  }

  // 401 means the session is gone: clear it through AuthService.
  private fail(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      this.auth.logout();
      this.error = LOGIN_REQUIRED_MESSAGE;
    } else {
      this.error = GENERIC_ERROR_MESSAGE;
    }
  }
}
