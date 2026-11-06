import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, SESSION_STORAGE_KEY } from '../../core/auth.service';
import { TEST_USER, makeToken } from '../../testing/auth-test-utils';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/bookings`;

  function create(token: string | null): BookingService {
    sessionStorage.clear();
    if (token) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
    }
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(BookingService);
  }

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    sessionStorage.clear();
  });

  it('listMine should GET /bookings/mine with the Bearer token and map to date strings (FR8)', () => {
    const token = makeToken(3600);
    const service = create(token);
    let result: string[] | undefined;
    service.listMine().subscribe(d => (result = d));
    const req = http.expectOne(`${url}/mine`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ success: true, payload: { bookings: [{ date: '2026-11-09' }, { date: '2026-11-10' }] } });
    expect(result).toEqual(['2026-11-09', '2026-11-10']);
    http.verify();
  });

  it('book should POST { date } to /bookings with the Bearer token (FR5)', () => {
    const token = makeToken(3600);
    const service = create(token);
    service.book('2026-11-09').subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ date: '2026-11-09' });
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ success: true, payload: { booking: { date: '2026-11-09' } } }, { status: 201, statusText: 'Created' });
    http.verify();
  });

  it('withdraw should DELETE /bookings/<date> with the Bearer token (FR6)', () => {
    const token = makeToken(3600);
    const service = create(token);
    service.withdraw('2026-11-09').subscribe();
    const req = http.expectOne(`${url}/2026-11-09`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ success: true });
    http.verify();
  });

  it('should fail with a synthetic 401 and make no request when there is no token (FR7/FR13)', () => {
    const service = create(null);
    const statuses: number[] = [];
    const onError = (e: unknown) => statuses.push((e as HttpErrorResponse).status);
    service.listMine().subscribe({ error: onError });
    service.book('2026-11-09').subscribe({ error: onError });
    service.withdraw('2026-11-09').subscribe({ error: onError });
    expect(statuses).toEqual([401, 401, 401]);
    http.expectNone(() => true);
    http.verify();
  });

  it('should propagate server errors to the caller', () => {
    const service = create(makeToken(3600));
    let status = 0;
    service.book('2026-11-09').subscribe({ error: (e: HttpErrorResponse) => (status = e.status) });
    http.expectOne(url).flush({ success: false }, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
  });
});
