import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiErrorResponse } from '../../../models/api-error-response.model';
import { AuthService } from '../../../services/auth.service';
import { securePassword } from '../../../validators/secure-password.validator';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('nuevaContrasena')?.value === group.get('confirmarContrasena')?.value
    ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: false,
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    nuevaContrasena: ['', [Validators.required, securePassword]],
    confirmarContrasena: ['', Validators.required],
  }, { validators: passwordsMatch });

  private token = '';
  loading = false;
  error = '';
  errorIsKey = false;
  success = false;
  invalidLink = false;

  constructor(route: ActivatedRoute, location: Location, private readonly auth: AuthService, private readonly router: Router) {
    const candidate = route.snapshot.queryParamMap.get('token') ?? '';
    this.invalidLink = !/^[A-Za-z0-9_-]{43}$/.test(candidate);
    if (!this.invalidLink) this.token = candidate;
    // Keep the one-time credential in memory only; remove it from browser history/address bar.
    if (candidate) location.replaceState('/restablecer-contrasena');
  }

  submit(): void {
    this.error = '';
    this.errorIsKey = false;
    if (this.invalidLink || this.loading) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.form.errors?.['passwordsMismatch']) { this.error = 'auth.passwordMismatch'; this.errorIsKey = true; return; }

    this.loading = true;
    this.auth.resetPassword(this.token, this.form.controls.nuevaContrasena.value)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: () => { this.success = true; this.token = ''; this.form.reset(); },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            const body = error.error as ApiErrorResponse | null;
            this.error = body?.mensaje ?? 'auth.resetPasswordError';
            this.errorIsKey = !body?.mensaje;
          } else { this.error = 'auth.resetPasswordError'; this.errorIsKey = true; }
        },
      });
  }

  login(): void { void this.router.navigate(['/login']); }
}
