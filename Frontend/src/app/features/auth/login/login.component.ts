import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: '../auth-form.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required]
  });
  readonly registered: boolean;
  submitted = false;
  submitting = false;
  errorMessage = '';

  constructor(route: ActivatedRoute) {
    this.registered = route.snapshot.queryParamMap.get('registered') === '1';
  }

  showError(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted);
  }

  submit(): void {
    if (this.submitting) {
      return;
    }
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting = true;
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        this.submitting = false;
        void this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.submitting = false;
        this.errorMessage = this.messageFor(err);
      }
    });
  }

  private messageFor(err: unknown): string {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    if (status === 401) {
      return 'Invalid email or password';
    }
    if (status === 429) {
      return 'Too many attempts, try again later';
    }
    return 'Login failed, please try again later';
  }
}
