import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly title = 'Desk Booking';
  readonly currentYear = new Date().getFullYear();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly user$ = this.auth.currentUser$;

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
