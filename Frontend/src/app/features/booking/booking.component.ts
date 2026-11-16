import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, InjectionToken, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { bookableDates, formatDate } from './booking-dates';
import { Desk, DeskAvailability, MyBooking } from './booking.models';
import { BookingService } from './booking.service';
import { DeskService } from './desk.service';

export const BOOKING_NOW = new InjectionToken<() => Date>('BOOKING_NOW', {
  providedIn: 'root',
  factory: () => () => new Date()
});

export const LOGIN_REQUIRED_MESSAGE = 'You must log in first';
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';
export const NO_DATE_MESSAGE = 'No date selected';
export const SELECT_DESK_MESSAGE = 'Please select a desk first';
export const BOOKING_CONFLICT_MESSAGE = 'This desk or date is already booked. Please choose another desk.';

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
  desks: Desk[] = [];
  availability: DeskAvailability[] | null = null;
  selectedDesk: string | null = null;
  signedIn = false;
  busy = false;
  error: string | null = null;
  private myBookings: MyBooking[] = [];
  private availabilitySub: Subscription | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly bookings: BookingService,
    private readonly deskService: DeskService
  ) {}

  get selectedLabel(): string {
    return this.selected ? formatDate(this.selected) : NO_DATE_MESSAGE;
  }

  get isBooked(): boolean {
    return this.selected !== null && this.booked.includes(this.selected);
  }

  get yourDesk(): string | null {
    return this.myBookings.find(b => b.date === this.selected)?.desk ?? null;
  }

  ngOnInit(): void {
    this.bookable = bookableDates(this.now());
    this.loadDesks();
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      this.signedIn = !!user;
      if (user) {
        this.loadBooked();
        this.loadAvailability();
      } else {
        this.setBookings([]);
        this.availabilitySub?.unsubscribe();
        this.availability = null;
        this.selectedDesk = null;
      }
    });
  }

  select(date: string): void {
    this.selected = date;
    this.selectedDesk = null;
    this.error = null;
    this.loadAvailability();
  }

  deselect(): void {
    this.selected = null;
    this.selectedDesk = null;
    this.error = null;
    this.loadAvailability();
  }

  selectDesk(desk: string): void {
    this.selectedDesk = desk;
    this.error = null;
  }

  deselectDesk(): void {
    this.selectedDesk = null;
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
    const desk = this.selectedDesk;
    if (!withdrawing && !desk) {
      this.error = SELECT_DESK_MESSAGE;
      return;
    }
    const previousDesk = this.yourDesk;
    this.error = null;
    this.busy = true;
    (withdrawing ? this.bookings.withdraw(date) : this.bookings.book(date, desk!)).subscribe({
      next: () => {
        this.busy = false;
        if (withdrawing) {
          this.setBookings(this.myBookings.filter(b => b.date !== date));
          this.markDesk(previousDesk, { booked: false });
          this.selectedDesk = null;
        } else {
          this.setBookings([...this.myBookings, { date, desk }]);
          this.markDesk(desk, { booked: true, bookedBy: this.auth.getCurrentUserName() });
          this.selectedDesk = null;
        }
      },
      error: (err: unknown) => {
        this.busy = false;
        if (withdrawing && err instanceof HttpErrorResponse && err.status === 404) {
          this.setBookings(this.myBookings.filter(b => b.date !== date));
        }
        if (!withdrawing && err instanceof HttpErrorResponse && err.status === 409) {
          this.error = BOOKING_CONFLICT_MESSAGE;
          this.selectedDesk = null;
          this.loadAvailability();
          return;
        }
        this.fail(err);
      }
    });
  }

  private setBookings(bookings: MyBooking[]): void {
    this.myBookings = bookings;
    this.booked = bookings.map(b => b.date);
  }

  // Local update of one desk so the plan reflects our own book/withdraw without a reload.
  private markDesk(id: string | null, state: { booked: boolean; bookedBy?: string }): void {
    if (!id || !this.availability) {
      return;
    }
    this.availability = this.availability.map(d => (d.id === id ? { id, ...state } : d));
  }

  private loadDesks(): void {
    this.deskService.list().subscribe({
      next: desks => (this.desks = desks),
      error: () => (this.error = GENERIC_ERROR_MESSAGE)
    });
  }

  private loadAvailability(): void {
    this.availabilitySub?.unsubscribe();
    this.availabilitySub = null;
    this.availability = null;
    if (!this.selected || !this.signedIn) {
      return;
    }
    this.availabilitySub = this.deskService.availability(this.selected).subscribe({
      next: availability => (this.availability = availability),
      error: (err: unknown) => this.fail(err)
    });
  }

  private loadBooked(): void {
    this.bookings.listMine().subscribe({
      next: bookings => this.setBookings(bookings),
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
