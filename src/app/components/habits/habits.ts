import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { concatMap, finalize, from, Observable, timeout, toArray } from 'rxjs';
import { ApiErrorResponse } from '../../models/api-error-response.model';
import { HabitRecord } from '../../models/onboarding.model';
import { OnboardingService } from '../../services/onboarding.service';
import { AppearanceService } from '../../services/appearance.service';

@Component({
  selector: 'app-habits',
  standalone: false,
  templateUrl: './habits.html',
  styleUrl: './habits.css',
})
export class Habits implements OnInit {
  readonly appearance = inject(AppearanceService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly form = this.fb.nonNullable.group({
    medio: ['Bicicleta', Validators.required],
    kmSemana: [null as number | null, [Validators.required, Validators.min(0.01)]],
    diasSemana: [5, [Validators.required, Validators.min(1), Validators.max(7)]],
    vivienda: ['Casa', Validators.required],
    personas: [null as number | null, [Validators.required, Validators.min(1)]],
    fuente: ['Electricidad', Validators.required],
    tipo: ['Mixta', Validators.required],
    plasticos: ['Medio', Validators.required],
    reciclas: [true, Validators.required],
  });

  habits: HabitRecord[] = [];
  loading = true;
  loaded = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  saved = false;

  constructor(private readonly api: OnboardingService) {}

  ngOnInit(): void {
    this.loadHabits();
  }

  retryLoad(): void {
    this.errorMessage = '';
    this.loading = true;
    this.loadHabits();
  }

  private loadHabits(): void {
    this.api.getHabits().pipe(timeout({ first: 20000 }), finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: (habits) => {
        this.habits = habits;
        this.restore(habits);
        this.loaded = true;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'No se pudieron cargar tus hábitos actuales.');
        this.cdr.markForCheck();
      },
    });
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.saved = false;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Revisa los valores: kilómetros mayores que cero, días de 1 a 7 y al menos una persona.';
      return;
    }
    const values = this.form.getRawValue();
    const updates = [
      ['Transporte', 'medio', 0, values.medio],
      ['Transporte', 'kmSemana', this.appearance.toStorage(Number(values.kmSemana), 'km/semana'), 'km/semana'],
      ['Transporte', 'diasSemana', values.diasSemana, 'dias/semana'],
      ['Energía', 'vivienda', 0, values.vivienda],
      ['Energía', 'personas', Number(values.personas), 'personas'],
      ['Energía', 'fuente', 0, values.fuente],
      ['Alimentación', 'tipo', 0, values.tipo],
      ['Residuos', 'plasticos', 0, values.plasticos],
      ['Residuos', 'reciclas', values.reciclas ? 1 : 0, 'boolean'],
    ] as const;
    const missing = updates.find(([category, name]) => this.habits.filter((habit) => this.api.normalize(habit.categoriaNombre) === this.api.normalize(category)
      && this.api.normalize(habit.nombre) === this.api.normalize(name)).length !== 1);
    if (missing) {
      this.errorMessage = `No se encontró un registro único para ${missing[0]}: ${missing[1]}.`;
      return;
    }

    const changed = updates.some(([category, name, value, unit]) => {
      const current = this.habits.find((habit) => this.api.normalize(habit.categoriaNombre) === this.api.normalize(category)
        && this.api.normalize(habit.nombre) === this.api.normalize(name));
      return !current || current.valor === null || Number(current.valor) !== value || this.api.normalize(current.unidad) !== this.api.normalize(unit);
    });
    if (!changed) {
      this.successMessage = 'Tus hábitos ya tienen esos valores. No se creó una medición nueva.';
      this.saved = true;
      return;
    }

    // Solo se envían PUT para los registros que realmente cambiaron.
    const requests: Observable<HabitRecord>[] = updates.flatMap(([category, name, value, unit]) => {
      const current = this.habits.find((habit) => this.api.normalize(habit.categoriaNombre) === this.api.normalize(category)
        && this.api.normalize(habit.nombre) === this.api.normalize(name));
      if (!current || (current.valor !== null && Number(current.valor) === value && this.api.normalize(current.unidad) === this.api.normalize(unit))) return [];
      return [this.api.updateHabit(current.id, name, value, unit)];
    });
    this.saving = true;
    from(requests).pipe(
      concatMap((request) => request),
      toArray(),
      timeout({ first: 20000 }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: (saved) => {
        this.habits = this.habits.map((habit) => saved.find((row) => row.id === habit.id) ?? habit);
        this.successMessage = 'Tus cambios se guardaron. La medición de tu huella no se modificó.';
        this.saved = true;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'No se pudieron guardar todos los cambios. Revisa tus datos e inténtalo de nuevo.');
        this.cdr.markForCheck();
      },
    });
  }

  private restore(habits: HabitRecord[]): void {
    const find = (category: string, name: string) => habits.find((habit) => this.api.normalize(habit.categoriaNombre) === this.api.normalize(category)
      && this.api.normalize(habit.nombre) === this.api.normalize(name));
    const medio = find('Transporte', 'medio');
    const km = find('Transporte', 'kmSemana');
    const dias = find('Transporte', 'diasSemana');
    const vivienda = find('Energía', 'vivienda');
    const personas = find('Energía', 'personas');
    const fuente = find('Energía', 'fuente');
    const tipo = find('Alimentación', 'tipo');
    const plasticos = find('Residuos', 'plasticos');
    const reciclas = find('Residuos', 'reciclas');
    this.form.patchValue({
      medio: medio?.unidad ?? 'Bicicleta', kmSemana: km?.valor == null ? null : this.appearance.toDisplay(Number(km.valor), km.unidad || 'km/semana'), diasSemana: Number(dias?.valor ?? 5),
      vivienda: vivienda?.unidad ?? 'Casa', personas: personas?.valor ?? null, fuente: fuente?.unidad ?? 'Electricidad',
      tipo: tipo?.unidad ?? 'Mixta', plasticos: plasticos?.unidad ?? 'Medio', reciclas: Number(reciclas?.valor ?? 1) === 1,
    });
  }

  private messageFrom(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.mensaje ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
  }
}
