import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, SESSION_STORAGE_KEY } from '../../core/auth.service';
import { TEST_USER, makeToken } from '../../testing/auth-test-utils';
import { Desk, DeskAvailability } from './booking.models';
import { DeskService } from './desk.service';

describe('DeskService', () => {
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/desks`;

  function create(token: string | null): DeskService {
    sessionStorage.clear();
    if (token) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: TEST_USER }));
    }
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(DeskService);
  }

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    sessionStorage.clear();
  });

  it('list should GET /desks without a token and map the payload (AC1)', () => {
    const service = create(null);
    let result: Desk[] | undefined;
    service.list().subscribe(d => (result = d));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    const desks = [{ id: 'A1', label: 'A1', row: 1, col: 1 }];
    req.flush({ success: true, payload: { desks } });
    expect(result).toEqual(desks);
    http.verify();
  });

  it('list should work for a signed-in user too and not send the token to the public endpoint', () => {
    const service = create(makeToken(3600));
    service.list().subscribe();
    const req = http.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ success: true, payload: { desks: [] } });
  });

  it('availability should GET /desks/availability?date= with the Bearer token (AC2)', () => {
    const token = makeToken(3600);
    const service = create(token);
    let result: DeskAvailability[] | undefined;
    service.availability('2026-11-09').subscribe(d => (result = d));
    const req = http.expectOne(r => r.url === `${url}/availability`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('date')).toBe('2026-11-09');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    const desks = [{ id: 'A1', booked: true, bookedBy: 'Ana' }, { id: 'A2', booked: false }];
    req.flush({ success: true, payload: { desks } });
    expect(result).toEqual(desks);
    http.verify();
  });

  it('availability should fail with a synthetic 401 and make no request without a token', () => {
    const service = create(null);
    let status = 0;
    service.availability('2026-11-09').subscribe({ error: (e: HttpErrorResponse) => (status = e.status) });
    expect(status).toBe(401);
    http.expectNone(() => true);
    http.verify();
  });

  it('should propagate server errors to the caller', () => {
    const service = create(makeToken(3600));
    const statuses: number[] = [];
    service.availability('2026-11-09').subscribe({ error: (e: HttpErrorResponse) => statuses.push(e.status) });
    http.expectOne(r => r.url === `${url}/availability`).flush({ success: false }, { status: 500, statusText: 'Server Error' });
    service.list().subscribe({ error: (e: HttpErrorResponse) => statuses.push(e.status) });
    http.expectOne(url).flush({ success: false }, { status: 500, statusText: 'Server Error' });
    expect(statuses).toEqual([500, 500]);
  });
});
