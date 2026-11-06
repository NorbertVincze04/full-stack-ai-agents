import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import {
  EMAIL_MAX,
  FULL_NAME_MAX,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN,
  emailValidator,
  fullNameValidator,
  passwordValidator,
  passwordsMatchValidator
} from '../auth-validators';

type FieldName = 'fullName' | 'email' | 'password' | 'confirmPassword';

interface ServerFieldError {
  field?: unknown;
  message?: unknown;
}

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: '../auth-form.css'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', fullNameValidator],
      email: ['', emailValidator],
      password: ['', passwordValidator],
      confirmPassword: ['']
    },
    { validators: passwordsMatchValidator }
  );
  submitted = false;
  submitting = false;
  errorMessage = '';

  errorFor(name: FieldName): string | null {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted)) {
      return null;
    }
    const errors = control.errors ?? {};
    if (name === 'confirmPassword') {
      return errors['server'] ?? (this.form.hasError('passwordMismatch') ? 'Passwords do not match' : null);
    }
    if (errors['server']) {
      return errors['server'] as string;
    }
    if (!control.errors) {
      return null;
    }
    switch (name) {
      case 'fullName':
        return errors['required'] ? 'Full name is required' : `Full name must be at most ${FULL_NAME_MAX} characters`;
      case 'email':
        if (errors['required']) {
          return 'Email is required';
        }
        return errors['maxlength']
          ? `Email must be at most ${EMAIL_MAX} characters`
          : 'Enter a valid email address';
      default:
        if (errors['required']) {
          return 'Password is required';
        }
        if (errors['minlength']) {
          return `Password must be at least ${PASSWORD_MIN} characters`;
        }
        if (errors['maxbytes']) {
          return `Password must be at most ${PASSWORD_MAX_BYTES} bytes`;
        }
        return 'Password must contain at least one letter and one digit';
    }
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
    const { fullName, email, password } = this.form.getRawValue();
    this.submitting = true;
    // confirmPassword is client-side only and never sent.
    this.auth.register({ fullName: fullName.trim(), email: email.trim(), password }).subscribe({
      next: () => {
        this.submitting = false;
        void this.router.navigate(['/login'], { queryParams: { registered: '1' } });
      },
      error: (err: unknown) => {
        this.submitting = false;
        this.handleError(err);
      }
    });
  }

  private handleError(err: unknown): void {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    if (status === 409) {
      this.form.controls.email.setErrors({ server: 'Email already registered' });
      return;
    }
    if (status === 400) {
      const list = (err as HttpErrorResponse).error?.errors as ServerFieldError[] | undefined;
      let mapped = false;
      for (const item of Array.isArray(list) ? list : []) {
        const control =
          typeof item.field === 'string' && typeof item.message === 'string'
            ? (this.form.controls as Record<string, { setErrors(e: object): void } | undefined>)[item.field]
            : undefined;
        if (control) {
          control.setErrors({ server: item.message });
          mapped = true;
        }
      }
      if (!mapped) {
        this.errorMessage = 'Please check the form and try again';
      }
      return;
    }
    this.errorMessage =
      status === 429
        ? 'Too many attempts, try again later'
        : 'Registration failed, please try again later';
  }
}
