import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, Observable, of, switchMap, tap, throwError, timeout, TimeoutError } from 'rxjs';
import { ApiErrorResponse } from '../../models/api-error-response.model';
import { CarbonFootprint, EnvironmentalObjective, FootprintEquivalences, HabitRecord } from '../../models/onboarding.model';
import { AuthTokenService } from '../../services/auth-token.service';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-onboarding',
  standalone: false,
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tokenStorage = inject(AuthTokenService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly stepKey = `huellago.onboarding.step.${this.tokenStorage.getUserId() ?? 'guest'}`;

  readonly transportForm = this.fb.nonNullable.group({
    medio: ['Bicicleta', Validators.required],
    kmSemana: [null as number | null, [Validators.required, Validators.min(0.01)]],
    diasSemana: [5, [Validators.required, Validators.min(1), Validators.max(7)]],
  });
  readonly energyForm = this.fb.nonNullable.group({
    vivienda: ['Casa', Validators.required],
    personas: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100)]],
    fuente: ['Electricidad', Validators.required],
  });
  readonly foodWasteForm = this.fb.nonNullable.group({
    tipo: ['Mixta', Validators.required],
    plasticos: ['Medio', Validators.required],
    reciclas: [true, Validators.required],
  });

  objectives: EnvironmentalObjective[] = [];
  selectedObjectiveIds = new Set<number>();
  habits: HabitRecord[] = [];
  currentStep = 0;
  loading = true;
  saving = false;
  errorMessage = '';
  loadError = false;
  result: CarbonFootprint | null = null;
  equivalences: FootprintEquivalences | null = null;

  constructor(private readonly api: OnboardingService, private readonly router: Router) {}

  ngOnInit(): void {
    this.loadProgress();
  }

  retryLoad(): void {
    this.loadProgress();
  }

  private loadProgress(): void {
    this.loading = true;
    this.loadError = false;
    this.errorMessage = '';
    forkJoin({
      state: this.api.getInitialState(),
      objectives: this.api.getObjectives(),
      selected: this.api.getSelectedObjectives(),
    })
      .pipe(timeout({ first: 20000 }), finalize(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: ({ state, objectives, selected }) => {
          if (state.complete) {
            void this.router.navigate(['/dashboard']);
            return;
          }
          this.objectives = objectives;
          this.selectedObjectiveIds = new Set(selected.map((objective) => objective.id));
          this.habits = state.habits;
          this.restoreForms(state.habits);
          const savedStep = Number(localStorage.getItem(this.stepKey));
          this.currentStep = Number.isInteger(savedStep) && savedStep >= 0 && savedStep <= 3 ? savedStep : 0;
          this.resumeAtIncompleteStep();
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.loadError = true;
          this.errorMessage = this.getErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  toggleObjective(id: number): void {
    if (this.selectedObjectiveIds.has(id)) this.selectedObjectiveIds.delete(id);
    else this.selectedObjectiveIds.add(id);
  }

  objectiveImage(name: string): string {
    const normalized = this.api.normalize(name);
    if (normalized.includes('transporte')) return 'assets/images/bike.png';
    if (normalized.includes('energia')) return 'assets/images/energia.png';
    if (normalized.includes('alimentacion')) return 'assets/images/consumo.png';
    return 'assets/images/reciclaje.png';
  }

  previous(): void {
    if (this.currentStep > 0 && !this.saving) this.currentStep--;
  }

  next(): void {
    this.errorMessage = '';
    if (this.saving || this.loading) return;
    if (this.currentStep === 0) this.saveObjectiveSelection();
    else if (this.currentStep === 1) this.saveTransport();
    else if (this.currentStep === 2) this.saveEnergy();
    else if (this.currentStep === 3) this.calculateFootprint();
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private saveObjectiveSelection(): void {
    if (this.selectedObjectiveIds.size === 0) {
      this.errorMessage = 'Selecciona al menos un objetivo ambiental.';
      return;
    }
    this.runSave(this.api.saveObjectives([...this.selectedObjectiveIds]), () => this.advance(1));
  }

  private saveTransport(): void {
    if (this.transportForm.invalid) {
      this.transportForm.markAllAsTouched();
      this.errorMessage = 'Revisa los kilómetros (deben ser mayores que cero) y los días por semana.';
      return;
    }
    const usuarioId = this.tokenStorage.getUserId();
    if (!usuarioId) return this.sessionError();
    const values = this.transportForm.getRawValue();
    this.runSave(
      this.saveCategory('Transporte', [
        { nombre: 'medio', valor: 0, unidad: values.medio },
        { nombre: 'kmSemana', valor: Number(values.kmSemana), unidad: 'km/semana' },
        { nombre: 'diasSemana', valor: values.diasSemana, unidad: 'dias/semana' },
      ], () => this.api.saveTransport({ usuarioId, ...values, kmSemana: Number(values.kmSemana) })),
      () => this.advance(2),
    );
  }

  private saveEnergy(): void {
    if (this.energyForm.invalid) {
      this.energyForm.markAllAsTouched();
      this.errorMessage = 'Revisa el tipo de vivienda, la cantidad de personas y la fuente de energía.';
      return;
    }
    const usuarioId = this.tokenStorage.getUserId();
    if (!usuarioId) return this.sessionError();
    const values = this.energyForm.getRawValue();
    this.runSave(
      this.saveCategory('Energía', [
        { nombre: 'vivienda', valor: 0, unidad: values.vivienda },
        { nombre: 'personas', valor: Number(values.personas), unidad: 'personas' },
        { nombre: 'fuente', valor: 0, unidad: values.fuente },
      ], () => this.api.saveEnergy({ usuarioId, ...values, personas: Number(values.personas) })),
      () => this.advance(3),
    );
  }

  private calculateFootprint(): void {
    if (this.foodWasteForm.invalid) {
      this.foodWasteForm.markAllAsTouched();
      this.errorMessage = 'Completa los datos de alimentación y residuos.';
      return;
    }
    const usuarioId = this.tokenStorage.getUserId();
    if (!usuarioId) return this.sessionError();
    const values = this.foodWasteForm.getRawValue();
    this.saving = true;
    this.saveFoodWaste(usuarioId, values)
      .pipe(
        switchMap(() => this.api.calculate()),
        switchMap((result) => forkJoin({ result: of(result), equivalents: this.api.getEquivalences().pipe(catchError(() => of(null))) })),
        tap(({ result, equivalents }) => {
          this.result = result;
          this.equivalences = equivalents;
          localStorage.removeItem(this.stepKey);
          this.currentStep = 4;
          this.changeDetector.markForCheck();
        }),
        finalize(() => {
          this.saving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({ error: (error: unknown) => {
        this.errorMessage = this.getErrorMessage(error);
        this.changeDetector.markForCheck();
      } });
  }

  private saveCategory(
    category: string,
    records: Array<{ nombre: string; valor: number; unidad: string }>,
    create: () => ReturnType<OnboardingService['saveTransport']>,
  ): Observable<unknown> {
    const existing = this.habits.filter((habit) => this.api.normalize(habit.categoriaNombre) === this.api.normalize(category));
    if (existing.length === 0) {
      return create().pipe(
        switchMap(() => this.api.getInitialState()),
        tap((state) => (this.habits = state.habits)),
      );
    }

    const matchesByRecord = records.map((record) => existing.filter((habit) => this.api.normalize(habit.nombre) === this.api.normalize(record.nombre)));
    if (matchesByRecord.some((matches) => matches.length !== 1)) {
      const missing = records[matchesByRecord.findIndex((matches) => matches.length !== 1)].nombre;
      return throwError(() => new Error(`El backend ya tiene datos incompletos de ${category} y no permite completar el campo ${missing} con el endpoint disponible.`));
    }
    const changes: Observable<HabitRecord>[] = records.map((record, index) => {
      const matches = matchesByRecord[index];
      const current = matches[0];
      if (current.valor !== null && Number(current.valor) === record.valor && this.api.normalize(current.unidad) === this.api.normalize(record.unidad)) return of(current);
      return this.api.updateHabit(current.id, record.nombre, record.valor, record.unidad);
    });
    return forkJoin(changes).pipe(
      tap((updated) => {
        this.habits = this.habits.map((habit) => updated.find((item) => item.id === habit.id) ?? habit);
      }),
    );
  }

  private saveFoodWaste(usuarioId: number, values: { tipo: string; plasticos: string; reciclas: boolean }): Observable<unknown> {
    const hasFood = this.habits.some((habit) => this.api.normalize(habit.categoriaNombre) === 'alimentacion');
    const hasWaste = this.habits.some((habit) => this.api.normalize(habit.categoriaNombre) === 'residuos');
    if (!hasFood && !hasWaste) {
      return this.api.saveFoodWaste({ usuarioId, ...values }).pipe(
        switchMap(() => this.api.getInitialState()),
        tap((state) => (this.habits = state.habits)),
      );
    }
    if (!hasFood || !hasWaste) {
      return throwError(() => new Error('El backend tiene datos parciales de alimentación o residuos. Su API no permite crear únicamente la categoría faltante; no repetimos el registro para evitar duplicados.'));
    }
    return forkJoin([
      this.updateExistingCategory('Alimentación', [{ nombre: 'tipo', valor: 0, unidad: values.tipo }]),
      this.updateExistingCategory('Residuos', [
        { nombre: 'plasticos', valor: 0, unidad: values.plasticos },
        { nombre: 'reciclas', valor: values.reciclas ? 1 : 0, unidad: 'boolean' },
      ]),
    ]).pipe(tap((updatedGroups) => {
      const updated = updatedGroups.flat();
      this.habits = this.habits.map((habit) => updated.find((item) => item.id === habit.id) ?? habit);
    }));
  }

  private updateExistingCategory(
    category: string,
    records: Array<{ nombre: string; valor: number; unidad: string }>,
  ): Observable<HabitRecord[]> {
    const existing = this.habits.filter((habit) => this.api.normalize(habit.categoriaNombre) === this.api.normalize(category));
    const matchesByRecord = records.map((record) => existing.filter((habit) => this.api.normalize(habit.nombre) === this.api.normalize(record.nombre)));
    if (matchesByRecord.some((matches) => matches.length !== 1)) {
      const missing = records[matchesByRecord.findIndex((matches) => matches.length !== 1)].nombre;
      return throwError(() => new Error(`El backend ya tiene datos incompletos de ${category} y no permite completar el campo ${missing} con el endpoint disponible.`));
    }
    const changes: Observable<HabitRecord>[] = records.map((record, index) => {
      const matches = matchesByRecord[index];
      const current = matches[0];
      if (current.valor !== null && Number(current.valor) === record.valor && this.api.normalize(current.unidad) === this.api.normalize(record.unidad)) return of(current);
      return this.api.updateHabit(current.id, record.nombre, record.valor, record.unidad);
    });
    return forkJoin(changes);
  }

  private runSave<T>(request: Observable<T>, done: () => void): void {
    this.saving = true;
    request.pipe(finalize(() => {
      this.saving = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: () => {
        done();
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.errorMessage = this.getErrorMessage(error);
        this.changeDetector.markForCheck();
      },
    });
  }

  private advance(step: number): void {
    this.currentStep = step;
    localStorage.setItem(this.stepKey, String(step));
  }

  private restoreForms(habits: HabitRecord[]): void {
    const find = (category: string, name: string) => habits.find((habit) =>
      this.api.normalize(habit.categoriaNombre) === this.api.normalize(category)
      && this.api.normalize(habit.nombre) === this.api.normalize(name));
    const medio = find('Transporte', 'medio');
    const km = find('Transporte', 'kmSemana');
    const dias = find('Transporte', 'diasSemana');
    if (medio || km || dias) this.transportForm.patchValue({
      medio: medio?.unidad ?? 'Bicicleta',
      kmSemana: km?.valor ?? null,
      diasSemana: Number(dias?.valor ?? 5),
    });
    const vivienda = find('Energía', 'vivienda');
    const personas = find('Energía', 'personas');
    const fuente = find('Energía', 'fuente');
    if (vivienda || personas || fuente) this.energyForm.patchValue({
      vivienda: vivienda?.unidad ?? 'Casa',
      personas: personas?.valor ?? null,
      fuente: fuente?.unidad ?? 'Electricidad',
    });
    const tipo = find('Alimentación', 'tipo');
    const plasticos = find('Residuos', 'plasticos');
    const reciclas = find('Residuos', 'reciclas');
    if (tipo || plasticos || reciclas) this.foodWasteForm.patchValue({
      tipo: tipo?.unidad ?? 'Mixta',
      plasticos: plasticos?.unidad ?? 'Medio',
      reciclas: Number(reciclas?.valor ?? 1) === 1,
    });
  }

  private resumeAtIncompleteStep(): void {
    const hasCategory = (category: string) => this.habits.some((habit) => this.api.normalize(habit.categoriaNombre) === this.api.normalize(category));
    if (this.selectedObjectiveIds.size === 0) this.currentStep = 0;
    else if (!hasCategory('Transporte')) this.currentStep = 1;
    else if (!hasCategory('Energía')) this.currentStep = 2;
    else if (!hasCategory('Alimentación') || !hasCategory('Residuos')) this.currentStep = 3;
    else this.currentStep = 3;
  }

  private sessionError(): void {
    this.errorMessage = 'La sesión no contiene un usuario válido. Vuelve a iniciar sesión.';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) return 'El backend tardó demasiado en responder. Comprueba la conexión e inténtalo de nuevo.';
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) return error.message;
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con HuellaGo. Comprueba que el backend esté disponible.';
      const body = error.error as ApiErrorResponse | null;
      if (body?.mensaje) return body.errores?.length ? `${body.mensaje}: ${body.errores.join(', ')}` : body.mensaje;
      if (error.status === 409) return 'Estos datos ya estaban guardados. Recargamos el estado y puedes continuar.';
    }
    return 'No se pudo guardar el paso. Revisa los datos e inténtalo de nuevo.';
  }
}
