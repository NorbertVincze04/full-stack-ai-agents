import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { Desk, DeskAvailability } from './booking.models';

interface DesksResponse<T> {
  success: boolean;
  payload: { desks: T[] };
}

@Injectable({ providedIn: 'root' })
export class DeskService {
  private readonly url = `${environment.apiUrl}/desks`;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  // Public: layout only, no token.
  list(): Observable<Desk[]> {
    return this.http.get<DesksResponse<Desk>>(this.url).pipe(map(res => res.payload.desks));
  }

  // No token (expired or signed out) is reported as a 401 without calling the API.
  availability(date: string): Observable<DeskAvailability[]> {
    const token = this.auth.getToken();
    if (!token) {
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const params = new HttpParams().set('date', date);
    return this.http
      .get<DesksResponse<DeskAvailability>>(`${this.url}/availability`, { headers, params })
      .pipe(map(res => res.payload.desks));
  }
}
