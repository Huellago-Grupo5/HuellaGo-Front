import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { AuthTokenService } from '../../services/auth-token.service';
import { ProfileNotificationService } from '../../services/profile-notification.service';
import { UserNotification } from '../../models/profile-notification.model';
import { HttpErrorResponse } from '@angular/common/http';
import { filter, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiErrorResponse } from '../../models/api-error-response.model';
import { LanguageService, HuellaGoLanguage } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';
import { AppearanceService } from '../../services/appearance.service';

@Component({
  selector: 'app-dashboard-shell',
  standalone: false,
  templateUrl: './dashboard-shell.html',
  styleUrls: ['./dashboard-shell.css', './notification-menu.css', './language-menu.css'],
})
export class DashboardShell implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('notificationArea') private notificationArea?: ElementRef<HTMLElement>;
  @ViewChild('languageArea') private languageArea?: ElementRef<HTMLElement>;
  menuOpen = false;
  notificationOpen = false;
  notificationLoading = false;
  notificationError = '';
  notifications: UserNotification[] = [];
  languageOpen = false;
  loggingOut = false;
  readonly languages: { code: HuellaGoLanguage; label: string }[] = [
    { code: 'es', label: 'Español' }, { code: 'en', label: 'English' }, { code: 'pt-BR', label: 'Português' },
  ];

  constructor(private readonly tokenStorage: AuthTokenService, private readonly router: Router,
    private readonly api: ProfileNotificationService, private readonly auth: AuthService,
    readonly languageService: LanguageService, private readonly appearance: AppearanceService) {}

  ngOnInit(): void {
    this.appearance.apply({ tema: 'claro', unidades: 'metric' });
    this.loadNotifications();
    this.api.getVisualPreferences().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: preferences => { this.appearance.apply(preferences); this.cdr.markForCheck(); },
    });
    this.router.events.pipe(
      filter((event) => event instanceof NavigationStart),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => { this.notificationOpen = false; this.languageOpen = false; });
  }

  get email(): string {
    return this.tokenStorage.getEmail() ?? 'Mi cuenta';
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { this.menuOpen = false; }
  toggleNotifications(): void {
    this.languageOpen = false;
    this.notificationOpen = !this.notificationOpen;
    if (this.notificationOpen) this.loadNotifications();
  }
  toggleLanguage(): void { this.notificationOpen = false; this.languageOpen = !this.languageOpen; }
  chooseLanguage(lang: HuellaGoLanguage): void {
    this.languageService.setLanguage(lang);
    this.languageOpen = false;
  }
  get languageLabel(): string { return this.languageService.label; }
  @HostListener('document:click', ['$event'])
  closeNotificationsOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Node && this.notificationOpen
      && !this.notificationArea?.nativeElement.contains(target)) {
      this.notificationOpen = false;
    }
    if (target instanceof Node && this.languageOpen
      && !this.languageArea?.nativeElement.contains(target)) this.languageOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeNotificationsOnEscape(): void { this.notificationOpen = false; this.languageOpen = false; }
  loadNotifications(): void {
    this.notificationLoading = true; this.notificationError = ''; this.cdr.markForCheck();
    this.api.getNotifications().pipe(timeout({ first: 15000 }), finalize(() => {
      this.notificationLoading = false; this.cdr.markForCheck();
    })).subscribe({
      next: (items) => { this.notifications = Array.isArray(items) ? items : []; this.cdr.markForCheck(); },
      error: (error: unknown) => {
        this.notificationError = error instanceof HttpErrorResponse
          ? ((error.error as ApiErrorResponse | null)?.mensaje ?? 'No se pudieron cargar las notificaciones.')
          : 'No se pudieron cargar las notificaciones.';
        this.cdr.markForCheck();
      },
    });
  }
  markNotificationRead(item: UserNotification): void {
    if (item.leida) return;
    this.api.markNotificationRead(item.id).subscribe({
      next: (updated) => { this.notifications = this.notifications.map((current) => current.id === updated.id ? updated : current); this.cdr.markForCheck(); },
      error: () => { this.notificationError = 'No se pudo guardar el estado leído. Intenta nuevamente.'; this.cdr.markForCheck(); },
    });
  }
  markAllRead(): void {
    if (!this.unreadCount) return;
    this.api.markAllNotificationsRead().subscribe({
      next: () => { this.notifications = this.notifications.map((item) => ({ ...item, leida: true })); this.cdr.markForCheck(); },
      error: () => { this.notificationError = 'No se pudo actualizar la bandeja. Intenta nuevamente.'; this.cdr.markForCheck(); },
    });
  }
  get unreadCount(): number { return this.notifications.filter((item) => !item.leida).length; }

  logout(): void {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.auth.logout().pipe(
      timeout({ first: 5000 }),
      finalize(() => {
        this.appearance.apply({ tema: 'claro', unidades: 'metric' });
        this.tokenStorage.clearSession();
        this.loggingOut = false;
        void this.router.navigate(['/login']);
      }),
    ).subscribe({ error: () => undefined });
  }
}
