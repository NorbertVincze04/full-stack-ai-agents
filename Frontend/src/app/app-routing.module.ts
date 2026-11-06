import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment, UrlMatchResult } from '@angular/router';

// Matches only /login and /register without consuming them; AuthRoutingModule resolves the page.
function authMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  return segments.length === 1 && ['login', 'register'].includes(segments[0].path) ? { consumed: [] } : null;
}

const routes: Routes = [
  { path: '', pathMatch: 'full', loadChildren: () => import('./features/booking/booking.module').then(m => m.BookingModule) },
  { path: 'info', loadChildren: () => import('./features/info/info.module').then(m => m.InfoModule) },
  { matcher: authMatcher, loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
