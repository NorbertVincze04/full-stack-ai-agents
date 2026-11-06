import { AbstractControl, ValidationErrors } from '@angular/forms';

export const FULL_NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the server rules; the server validates again.
export function fullNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return { required: true };
  }
  return value.length > FULL_NAME_MAX ? { maxlength: true } : null;
}

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return { required: true };
  }
  if (value.length > EMAIL_MAX) {
    return { maxlength: true };
  }
  return EMAIL_PATTERN.test(value) ? null : { email: true };
}

export function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (value === '') {
    return { required: true };
  }
  if (value.length < PASSWORD_MIN) {
    return { minlength: true };
  }
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return { maxbytes: true };
  }
  return /\p{L}/u.test(value) && /\d/.test(value) ? null : { complexity: true };
}

export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}
