import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiErrorResponse } from '../../../models/api-error-response.model';
import { AuthService } from '../../../services/auth.service';
import { securePassword } from '../../../validators/secure-password.validator';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('contrasena')?.value;
  const confirmation = group.get('confirmarContrasena')?.value;
  return password === confirmation ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  readonly form = this.formBuilder.nonNullable.group(
    {
      nombres: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(80),
          Validators.pattern(/^[\p{L}][\p{L} .'-]*$/u),
        ],
      ],
      apellidos: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(80),
          Validators.pattern(/^[\p{L}][\p{L} .'-]*$/u),
        ],
      ],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      contrasena: ['', [Validators.required, securePassword]],
      confirmarContrasena: ['', [Validators.required]],
      aceptaTerminos: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatch },
  );

  loading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombres, apellidos, correo, contrasena } = this.form.getRawValue();
    this.loading = true;
    this.authService
      .register({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim(),
        contrasena,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], { queryParams: { registrado: '1' } });
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(error);
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con HuellaGo. Comprueba que el backend esté disponible.';
      }

      const body = error.error as ApiErrorResponse | null;
      if (body?.mensaje) {
        return body.errores?.length ? `${body.mensaje}: ${body.errores.join(', ')}` : body.mensaje;
      }
    }

    return 'No se pudo crear la cuenta. Inténtalo de nuevo.';
  }
}
