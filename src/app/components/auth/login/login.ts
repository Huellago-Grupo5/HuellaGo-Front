import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { ApiErrorResponse } from '../../../models/api-error-response.model';
import { AuthService } from '../../../services/auth.service';
import { OnboardingService } from '../../../services/onboarding.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  readonly form = this.formBuilder.nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    contrasena: ['', [Validators.required, Validators.maxLength(72)]],
  });

  loading = false;
  errorMessage = '';
  successMessage = '';
  forgotModalOpen = false;
  forgotLoading = false;
  forgotMessage = '';
  forgotError = '';

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly onboardingService: OnboardingService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('registrado') === '1') {
      this.successMessage = 'Tu cuenta se creó correctamente. Ya puedes iniciar sesión.';
    }
    if (this.route.snapshot.queryParamMap.get('revisarSesion') === '1') {
      this.errorMessage = 'No se pudo verificar tu progreso. Inicia sesión otra vez cuando el backend esté disponible.';
    }
    if (this.route.snapshot.queryParamMap.get('correoActualizado') === '1') {
      this.successMessage = 'Tu correo se actualizó. Inicia sesión con tu nuevo correo.';
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService
      .login(this.form.getRawValue())
      .pipe(switchMap(() => this.onboardingService.getInitialState()))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (state) => {
          void this.router.navigate([state.complete ? '/dashboard' : '/onboarding']);
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(error, 'No se pudo iniciar sesión.');
        },
      });
  }

  openForgotPassword(): void {
    this.forgotModalOpen = true;
    this.forgotError = '';
    this.forgotMessage = '';

    const correo = this.form.controls.correo.value.trim();
    if (!correo || this.form.controls.correo.invalid) {
      this.forgotError = 'Escribe un correo válido en el formulario y vuelve a intentarlo.';
      return;
    }

    this.forgotLoading = true;
    this.authService
      .requestPasswordRecovery({ correo })
      .pipe(finalize(() => (this.forgotLoading = false)))
      .subscribe({
        next: (response) => {
          this.forgotMessage = response.mensaje;
        },
        error: (error: unknown) => {
          this.forgotError = this.getErrorMessage(
            error,
            'No se pudo solicitar la recuperación. Inténtalo de nuevo más tarde.',
          );
        },
      });
  }

  closeForgotPassword(): void {
    this.forgotModalOpen = false;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con HuellaGo. Comprueba que el backend esté disponible.';
      }

      const body = error.error as ApiErrorResponse | null;
      if (body?.mensaje) return body.errores?.length ? `${body.mensaje}: ${body.errores.join(', ')}` : body.mensaje;
    }

    return fallback;
  }
}
