import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Mirrors the backend password policy: 12–72 UTF-8 bytes, mixed case, digit, symbol, no spaces. */
export function securePassword(control: AbstractControl<string>): ValidationErrors | null {
  const password = control.value;
  if (!password) return null;
  if (password.length < 12) return { passwordMinLength: true };
  if (password.length > 72 || new TextEncoder().encode(password).length > 72) return { passwordMaxLength: true };
  if (/\s/u.test(password)) return { passwordWhitespace: true };
  if (!/\p{Lu}/u.test(password)) return { passwordUppercase: true };
  if (!/\p{Ll}/u.test(password)) return { passwordLowercase: true };
  if (!/\p{Nd}/u.test(password)) return { passwordNumber: true };
  if (!/[^\p{L}\p{N}]/u.test(password)) return { passwordSymbol: true };
  return null;
}
