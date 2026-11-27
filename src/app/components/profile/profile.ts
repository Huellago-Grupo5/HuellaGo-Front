import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { DashboardSummary } from '../../models/onboarding.model';
import { UserProfile } from '../../models/profile-notification.model';
import { ApiErrorResponse } from '../../models/api-error-response.model';
import { OnboardingService } from '../../services/onboarding.service';
import { ProfileNotificationService } from '../../services/profile-notification.service';
import { AuthTokenService } from '../../services/auth-token.service';
import { AppearanceService } from '../../services/appearance.service';
import { VisualPreferences } from '../../models/profile-notification.model';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrls: ['./profile.css', './profile-extra.css'],
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  profile: UserProfile | null = null;
  dashboard: DashboardSummary | null = null;
  loading = true;
  saving = false;
  preferenceSaving = false;
  privacySaving = false;
  visualSaving = false;
  visualPreferences: VisualPreferences = { tema: 'claro', unidades: 'metric' };
  error = '';
  message = '';
  view: 'summary' | 'edit' | 'password' = 'summary';
  readonly profileForm = this.fb.group({
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), Validators.pattern(/^[\p{L}][\p{L} .'-]*$/u)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), Validators.pattern(/^[\p{L}][\p{L} .'-]*$/u)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
  });
  readonly passwordForm = this.fb.group({
    contrasenaActual: ['', [Validators.required]],
    contrasenaNueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72), Validators.pattern(/^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\p{N})(?=.*[^\p{L}\p{N}\s])\S+$/u)]],
    confirmar: ['', [Validators.required]],
  });

  constructor(private readonly api: ProfileNotificationService, private readonly data: OnboardingService,
    private readonly tokenStorage: AuthTokenService, private readonly router: Router,
    private readonly appearance: AppearanceService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = ''; this.cdr.markForCheck();
    forkJoin({ profile: this.api.getProfile(), dashboard: this.data.getDashboard().pipe(catchError(() => of(null))) })
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: ({ profile, dashboard }) => { this.profile = profile; this.dashboard = dashboard; this.cdr.markForCheck(); },
        error: (error: unknown) => { this.error = this.errorText(error, 'No se pudo recuperar tu perfil.'); this.cdr.markForCheck(); },
      });
    this.api.getVisualPreferences().subscribe({
      next: (preferences) => { this.visualPreferences = preferences; this.appearance.apply(preferences); this.cdr.markForCheck(); },
      error: () => { this.appearance.apply(this.visualPreferences); },
    });
  }

  updateVisualPreferences(): void {
    if (this.visualSaving) return;
    this.visualSaving = true;
    this.api.updateVisualPreferences(this.visualPreferences).pipe(finalize(() => {
      this.visualSaving = false; this.cdr.markForCheck();
    })).subscribe({
      next: (saved) => { this.visualPreferences = saved; this.appearance.apply(saved); this.message = 'profile.visualSaved'; this.cdr.markForCheck(); },
      error: (error: unknown) => { this.error = this.errorText(error, 'profile.visualSaveError'); this.cdr.markForCheck(); },
    });
  }

  edit(): void {
    if (!this.profile) return;
    this.profileForm.reset({ nombres: this.profile.nombres, apellidos: this.profile.apellidos, correo: this.profile.correo });
    this.message = ''; this.error = ''; this.view = 'edit';
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.saving) { this.profileForm.markAllAsTouched(); return; }
    this.saving = true; this.error = ''; this.message = '';
    const { nombres, apellidos, correo } = this.profileForm.getRawValue();
    const previousEmail = this.tokenStorage.getEmail();
    this.api.updateProfile({ nombres: nombres!.trim(), apellidos: apellidos!.trim(), correo: correo!.trim() })
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (profile) => {
          this.profile = profile; this.message = 'profile.profileSaved';
          this.view = 'summary'; this.cdr.markForCheck();
          if (previousEmail && profile.correo.toLocaleLowerCase() !== previousEmail.toLocaleLowerCase()) {
            this.tokenStorage.clearSession();
            void this.router.navigate(['/login'], { queryParams: { correoActualizado: '1' } });
          }
        },
        error: (error: unknown) => { this.error = this.errorText(error, 'No se pudieron guardar tus datos.'); this.cdr.markForCheck(); },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const { contrasenaActual, contrasenaNueva, confirmar } = this.passwordForm.getRawValue();
    if (contrasenaNueva !== confirmar) { this.error = 'La confirmación no coincide con la nueva contraseña.'; return; }
    this.saving = true; this.error = ''; this.message = '';
    this.api.changePassword({ contrasenaActual: contrasenaActual!, contrasenaNueva: contrasenaNueva! })
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => { this.passwordForm.reset(); this.message = 'profile.passwordSaved'; this.view = 'summary'; this.cdr.markForCheck(); },
        error: (error: unknown) => { this.error = this.errorText(error, 'No se pudo cambiar la contraseña.'); this.cdr.markForCheck(); },
      });
  }

  toggleNotifications(enabled: boolean): void {
    this.preferenceSaving = true; this.error = ''; this.message = '';
    this.api.updateNotificationPreference(enabled).pipe(finalize(() => {
      this.preferenceSaving = false; this.cdr.markForCheck();
    })).subscribe({
      next: (preference) => {
        if (this.profile) this.profile = { ...this.profile, notificacionesActivas: preference.notificacionesActivas };
        this.message = preference.notificacionesActivas ? 'profile.notificationsEnabled' : 'profile.notificationsDisabled';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => { this.error = this.errorText(error, 'No se pudo actualizar la preferencia de notificaciones.'); this.cdr.markForCheck(); },
    });
  }

  toggleCommunityVisibility(enabled: boolean): void {
    if (!this.profile || this.privacySaving) return;
    this.privacySaving = true; this.error = ''; this.message = '';
    this.api.updatePrivacyPreference(enabled).pipe(finalize(() => {
      this.privacySaving = false; this.cdr.markForCheck();
    })).subscribe({
      next: (preference) => {
        if (this.profile) this.profile = { ...this.profile, visibilidadComunidad: preference.visibilidadComunidad };
        this.message = preference.visibilidadComunidad ? 'profile.visibilityEnabled' : 'profile.visibilityDisabled';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => { this.error = this.errorText(error, 'profile.visibilitySave'); this.cdr.markForCheck(); },
    });
  }

  back(): void { this.view = 'summary'; this.error = ''; this.message = ''; this.passwordForm.reset(); }
  private errorText(error: unknown, fallback: string): string {
    return error instanceof HttpErrorResponse ? ((error.error as ApiErrorResponse | null)?.mensaje ?? fallback) : fallback;
  }
}
