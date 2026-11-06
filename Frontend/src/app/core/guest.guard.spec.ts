import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { TEST_USER, makeToken } from '../testing/auth-test-utils';
import { SESSION_STORAGE_KEY } from './auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean | UrlTree;
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
  });
  afterEach(() => sessionStorage.clear());

  it('should allow a signed-out user', () => {
    expect(run()).toBeTrue();
  });

  it('should redirect a signed-in user to /', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(3600), user: TEST_USER }));
    const result = run();
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('should allow a user whose stored token is expired', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: makeToken(-5), user: TEST_USER }));
    expect(run()).toBeTrue();
  });

  it('should allow a user whose stored token is malformed', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: 'garbage', user: TEST_USER }));
    expect(run()).toBeTrue();
  });
});
