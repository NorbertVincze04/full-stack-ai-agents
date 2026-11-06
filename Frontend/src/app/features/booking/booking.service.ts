import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

interface BookingsResponse {
  success: boolean;
  payload: { bookings: { date: string }[] };
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly url = `${environment.apiUrl}/bookings`;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  listMine(): Observable<string[]> {
    return this.withAuth(headers =>
      this.http.get<BookingsResponse>(`${this.url}/mine`, { headers }).pipe(map(res => res.payload.bookings.map(b => b.date)))
    );
  }

  book(date: string): Observable<void> {
    return this.withAuth(headers => this.http.post(this.url, { date }, { headers }).pipe(map(() => undefined)));
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
