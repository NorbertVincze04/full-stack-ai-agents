import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { MyBooking } from './booking.models';

interface BookingsResponse {
  success: boolean;
  payload: { bookings: { date: string; desk?: string | null }[] };
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly url = `${environment.apiUrl}/bookings`;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  listMine(): Observable<MyBooking[]> {
    return this.withAuth(headers =>
      this.http
        .get<BookingsResponse>(`${this.url}/mine`, { headers })
        .pipe(map(res => res.payload.bookings.map(b => ({ date: b.date, desk: b.desk ?? null }))))
    );
  }

  book(date: string, desk: string): Observable<void> {
    return this.withAuth(headers => this.http.post(this.url, { date, desk }, { headers }).pipe(map(() => undefined)));
  }

  withdraw(date: string): Observable<void> {
    return this.withAuth(headers =>
      this.http.delete(`${this.url}/${encodeURIComponent(date)}`, { headers }).pipe(map(() => undefined))
    );
  }

  // No token (expired or signed out) is reported as a 401 without calling the API.
  private withAuth<T>(call: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const token = this.auth.getToken();
    if (!token) {
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }
    return call(new HttpHeaders({ Authorization: `Bearer ${token}` }));
  }
}
