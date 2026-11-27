import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { ApiErrorResponse } from '../../models/api-error-response.model';
import { CarbonFootprint, EnvironmentalObjective, FootprintBreakdown, FootprintEquivalences, HabitRecord } from '../../models/onboarding.model';
import { AuthTokenService } from '../../services/auth-token.service';
import { OnboardingService } from '../../services/onboarding.service';
import { AppearanceService } from '../../services/appearance.service';

@Component({
  selector: 'app-footprint',
  standalone: false,
  templateUrl: './footprint.html',
  styleUrl: './footprint.css',
})
export class Footprint implements OnInit {
  readonly appearance = inject(AppearanceService);
  private readonly cdr = inject(ChangeDetectorRef);
  history: CarbonFootprint[] = [];
  breakdown: FootprintBreakdown | null = null;
  equivalences: FootprintEquivalences | null = null;
  habits: HabitRecord[] = [];
  objectives: EnvironmentalObjective[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly api: OnboardingService, private readonly tokens: AuthTokenService) {}

  ngOnInit(): void { this.load(); }

  recalculate(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.recalculateFootprint().pipe(finalize(() => {
      this.saving = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => {
        this.successMessage = 'La nueva medición se guardó en tu historial.';
        this.load();
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'No se pudo recalcular la huella.');
        this.cdr.markForCheck();
      },
    });
  }

  get latest(): CarbonFootprint | null { return this.history[0] ?? null; }

  get profileProgress(): number {
    const normalized = (v: string | null | undefined) => this.api.normalize(v);
    const required: Array<[string, string]> = [['Transporte','medio'],['Transporte','kmSemana'],['Transporte','diasSemana'],['Energía','vivienda'],['Energía','personas'],['Energía','fuente'],['Alimentación','tipo'],['Residuos','plasticos'],['Residuos','reciclas']];
    const done = required.filter(([category, name]) => this.habits.some(h => normalized(h.categoriaNombre) === normalized(category) && normalized(h.nombre) === normalized(name) && h.valor !== null)).length;
    return Math.round(done / required.length * 100);
  }

  hasHabit(category: string, name: string): boolean {
    const c = this.api.normalize(category), n = this.api.normalize(name);
    return this.habits.some(h => this.api.normalize(h.categoriaNombre) === c && this.api.normalize(h.nombre) === n && h.valor !== null);
  }

  habitText(category: string, name: string): string {
    const habit = this.habits.find((item) => this.api.normalize(item.categoriaNombre) === this.api.normalize(category)
      && this.api.normalize(item.nombre) === this.api.normalize(name));
    if (!habit || habit.valor === null) return 'Sin registrar';
    if (this.api.normalize(name) === 'kmsemana') return this.appearance.format(Number(habit.valor), habit.unidad || 'km/semana');
    if (['medio','vivienda','fuente','tipo','plasticos'].includes(this.api.normalize(name))) return habit.unidad ?? 'Registrado';
    if (this.api.normalize(name) === 'reciclas') return Number(habit.valor) === 1 ? 'Sí reciclas' : 'No reciclas';
    return `${habit.valor}${habit.unidad ? ` ${habit.unidad}` : ''}`;
  }

  private load(): void {
    const userId = this.tokens.getUserId();
    if (!userId) {
      this.loading = false;
      this.errorMessage = 'No se pudo recuperar tu sesión.';
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    forkJoin({
      history: this.api.getFootprintHistory().pipe(timeout({ first: 20000 })),
      breakdown: this.api.getFootprintBreakdown(userId).pipe(timeout({ first: 20000 }), catchOptional()),
      equivalents: this.api.getEquivalences().pipe(timeout({ first: 20000 }), catchOptional()),
      habits: this.api.getHabits().pipe(timeout({ first: 20000 }), catchOptional()),
      objectives: this.api.getSelectedObjectives().pipe(timeout({ first: 20000 }), catchOptional()),
    }).pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: ({ history, breakdown, equivalents, habits, objectives }) => {
        this.history = history;
        this.breakdown = breakdown;
        this.equivalences = equivalents;
        this.habits = habits ?? [];
        this.objectives = objectives ?? [];
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'No se pudo cargar el historial de huellas.');
        this.cdr.markForCheck();
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

function catchOptional<T>() {
  return (source: import('rxjs').Observable<T>) => source.pipe(catchError(() => of(null)));
}
