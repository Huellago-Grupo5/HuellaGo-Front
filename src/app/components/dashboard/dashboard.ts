import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { ApiErrorResponse } from '../../models/api-error-response.model';
import {
  CarbonFootprint,
  DashboardSummary,
  FootprintActivity,
  FootprintBreakdown,
  FootprintEquivalences,
} from '../../models/onboarding.model';
import { AuthTokenService } from '../../services/auth-token.service';
import { OnboardingService } from '../../services/onboarding.service';
import { AppearanceService } from '../../services/appearance.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly appearance = inject(AppearanceService);
  summary: DashboardSummary | null = null;
  daily: CarbonFootprint | null = null;
  history: CarbonFootprint[] = [];
  breakdown: FootprintBreakdown | null = null;
  equivalences: FootprintEquivalences | null = null;
  loading = true;
  detailsLoading = true;
  reportLoading = false;
  errorMessage = '';
  detailsMessage = '';
  reportMessage = '';

  constructor(private readonly api: OnboardingService, private readonly tokenStorage: AuthTokenService) {}

  ngOnInit(): void {
    this.api.getDashboard().pipe(
      timeout({ first: 20000 }),
      finalize(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      }),
    ).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'No se pudo cargar tu dashboard.');
        this.changeDetector.markForCheck();
      },
    });
    this.loadDetails();
  }

  activityIcon(category: string): string {
    const normalized = category.toLocaleLowerCase('es');
    if (normalized.includes('transporte')) return 'assets/images/autoimagen.png';
    if (normalized.includes('energ')) return 'assets/images/energiaimagen.png';
    if (normalized.includes('aliment')) return 'assets/images/Alimentaciónimagen.png';
    return 'assets/images/Residuosimagen.png';
  }

  activityPercent(activity: FootprintActivity): number {
    const total = Number(this.breakdown?.co2Total ?? 0);
    if (!total || activity.co2 === null) return 0;
    return Math.max(0, Math.min(100, (Number(activity.co2) / total) * 100));
  }

  get historyLine(): Array<{ entry: CarbonFootprint; x: number; y: number }> {
    const entries = [...this.history].slice(0, 6).reverse();
    if (!entries.length) return [];
    const values = entries.map((entry) => Number(entry.co2Total));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return entries.map((entry, index) => ({
      entry,
      x: entries.length === 1 ? 50 : 8 + index * (84 / (entries.length - 1)),
      y: max === min ? 53 : 91 - ((Number(entry.co2Total) - min) / span) * 76,
    }));
  }

  get historyLinePoints(): string {
    return this.historyLine.map((point) => `${point.x},${point.y}`).join(' ');
  }

  get activities(): FootprintActivity[] {
    return [...(this.breakdown?.actividades ?? [])].sort((a, b) => Number(b.co2 ?? 0) - Number(a.co2 ?? 0));
  }

  retryDashboard(): void {
    this.loading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();
    this.api.getDashboard().pipe(timeout({ first: 20000 }), finalize(() => {
      this.loading = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'No se pudo cargar tu dashboard.');
        this.changeDetector.markForCheck();
      },
    });
  }

  downloadReport(): void {
    this.reportLoading = true;
    this.reportMessage = '';
    this.api.downloadEnvironmentalReport().pipe(finalize(() => {
      this.reportLoading = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: (file) => {
        const objectUrl = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = 'reporte-ambiental-huellago.pdf';
        link.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: (error: unknown) => {
        this.reportMessage = this.messageFrom(error, 'No se pudo descargar el reporte.');
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadDetails(): void {
    const userId = this.tokenStorage.getUserId();
    if (!userId) {
      this.detailsLoading = false;
      this.detailsMessage = 'No se pudo recuperar el identificador de tu sesión.';
      this.changeDetector.markForCheck();
      return;
    }
    forkJoin({
      daily: this.api.getDailyFootprint().pipe(timeout({ first: 20000 }), catchUnavailable()),
      history: this.api.getFootprintHistory().pipe(timeout({ first: 20000 }), catchUnavailable()),
      breakdown: this.api.getFootprintBreakdown(userId).pipe(timeout({ first: 20000 }), catchUnavailable()),
      equivalences: this.api.getEquivalences().pipe(timeout({ first: 20000 }), catchUnavailable()),
    }).pipe(finalize(() => {
      this.detailsLoading = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: ({ daily, history, breakdown, equivalences }) => {
        this.daily = daily;
        this.history = history ?? [];
        this.breakdown = breakdown;
        this.equivalences = equivalences;
        if (!daily && !history && !breakdown && !equivalences) {
          this.detailsMessage = 'El resumen está disponible, pero no se pudieron cargar los detalles de la huella.';
        }
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.detailsMessage = 'El resumen está disponible, pero no se pudieron cargar los detalles de la huella.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private messageFrom(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.mensaje ?? fallback;
    }
    return fallback;
  }
}

function catchUnavailable<T>() {
  return (source: Observable<T>) => source.pipe(catchError(() => of(null)));
}
