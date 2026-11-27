import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CarbonFootprint,
  DashboardSummary,
  EnvironmentalObjective,
  FootprintBreakdown,
  FootprintEquivalences,
  HabitRecord,
  InitialState,
} from '../models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly apiUrl = environment.apiUrl;
  constructor(private readonly http: HttpClient) {}

  getInitialState(): Observable<InitialState> {
    return forkJoin({
      habits: this.getArray<HabitRecord>('/habitos', 'hábitos'),
      history: this.getArray<CarbonFootprint>('/huella-carbono/historial', 'historial de huellas'),
    }).pipe(
      map(({ habits, history }) => ({
        // Una huella persistida confirma que la bienvenida ya se completó.
        // Los cambios posteriores de hábitos se administran desde sus secciones, no reabren el onboarding.
        complete: history.length > 0,
        habits,
        history,
      })),
    );
  }

  hasRequiredHabits(habits: HabitRecord[]): boolean {
    const specifications: Record<string, Record<string, (habit: HabitRecord) => boolean>> = {
      transporte: {
        medio: (h) => h.valor !== null && Number(h.valor) === 0 && ['bicicleta', 'caminando', 'bus', 'auto', 'moto'].includes(this.normalize(h.unidad)),
        kmSemana: (h) => h.valor !== null && Number(h.valor) > 0 && this.normalize(h.unidad) === 'km/semana',
        diasSemana: (h) => h.valor !== null && Number.isInteger(Number(h.valor)) && Number(h.valor) >= 1 && Number(h.valor) <= 7 && this.normalize(h.unidad) === 'dias/semana',
      },
      energia: {
        vivienda: (h) => h.valor !== null && Number(h.valor) === 0 && ['casa', 'departamento'].includes(this.normalize(h.unidad)),
        personas: (h) => h.valor !== null && Number.isInteger(Number(h.valor)) && Number(h.valor) > 0 && this.normalize(h.unidad) === 'personas',
        fuente: (h) => h.valor !== null && Number(h.valor) === 0 && ['electricidad', 'gas', 'solar'].includes(this.normalize(h.unidad)),
      },
      alimentacion: {
        tipo: (h) => h.valor !== null && Number(h.valor) === 0 && ['vegana', 'vegetariana', 'mixta'].includes(this.normalize(h.unidad)),
      },
      residuos: {
        plasticos: (h) => h.valor !== null && Number(h.valor) === 0 && ['bajo', 'medio', 'alto'].includes(this.normalize(h.unidad)),
        reciclas: (h) => h.valor !== null && [0, 1].includes(Number(h.valor)) && this.normalize(h.unidad) === 'boolean',
      },
    };
    const requiredValid = Object.entries(specifications).every(([category, fields]) => Object.entries(fields).every(([field, valid]) => {
      const matches = habits.filter((habit) => this.normalize(habit.categoriaNombre) === category && this.normalize(habit.nombre) === this.normalize(field));
      return matches.length === 1 && valid(matches[0]);
    }));
    if (!requiredValid) return false;
    const dailyUse = habits.filter((habit) => this.normalize(habit.categoriaNombre) === 'energia' && this.normalize(habit.nombre) === 'consumokwhdiario');
    if (dailyUse.length === 0) return true;
    const source = habits.find((habit) => this.normalize(habit.categoriaNombre) === 'energia' && this.normalize(habit.nombre) === 'fuente');
    return dailyUse.length === 1 && dailyUse[0].valor !== null && Number(dailyUse[0].valor) >= 0 && this.normalize(dailyUse[0].unidad) === 'kwh/dia'
      && this.normalize(source?.unidad ?? '') === 'electricidad';
  }

  getObjectives(): Observable<EnvironmentalObjective[]> {
    return this.getArray<EnvironmentalObjective>('/objetivos-ambientales', 'catálogo de objetivos');
  }

  getSelectedObjectives(): Observable<EnvironmentalObjective[]> {
    return this.getArray<EnvironmentalObjective>('/usuarios/me/objetivos', 'objetivos seleccionados');
  }

  saveObjectives(objetivoIds: number[]): Observable<EnvironmentalObjective[]> {
    return this.http.put<EnvironmentalObjective[]>(`${this.apiUrl}/usuarios/me/objetivos`, { objetivoIds });
  }

  saveTransport(data: { usuarioId: number; medio: string; kmSemana: number; diasSemana: number }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/habitos/transporte`, data);
  }

  saveEnergy(data: { usuarioId: number; vivienda: string; personas: number; fuente: string }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/habitos/energia`, data);
  }

  saveFoodWaste(data: { usuarioId: number; tipo: string; plasticos: string; reciclas: boolean }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/habitos/alimentacion-residuos`, data);
  }

  updateHabit(id: number, nombre: string, valor: number, unidad: string): Observable<HabitRecord> {
    return this.http.put<HabitRecord>(`${this.apiUrl}/habitos/${id}`, { nombre, valor, unidad });
  }

  calculate(): Observable<CarbonFootprint> {
    return this.http.post<CarbonFootprint>(`${this.apiUrl}/huella-carbono/calcular`, null);
  }

  getEquivalences(): Observable<FootprintEquivalences> {
    return this.http.get<FootprintEquivalences>(`${this.apiUrl}/huella-carbono/equivalencias`);
  }

  getDashboard(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard`);
  }

  getFootprintHistory(): Observable<CarbonFootprint[]> {
    return this.getArray<CarbonFootprint>('/huella-carbono/historial', 'historial de huellas');
  }

  getHabits(): Observable<HabitRecord[]> {
    return this.getArray<HabitRecord>('/habitos', 'hábitos');
  }

  getDailyFootprint(): Observable<CarbonFootprint> {
    return this.http.get<CarbonFootprint>(`${this.apiUrl}/huella-carbono/diario`);
  }

  getFootprintBreakdown(userId: number): Observable<FootprintBreakdown> {
    return this.http.get<FootprintBreakdown>(`${this.apiUrl}/huella-carbono/desglose/${userId}`);
  }

  recalculateFootprint(): Observable<CarbonFootprint> {
    return this.http.post<CarbonFootprint>(`${this.apiUrl}/huella-carbono/recalcular`, null);
  }

  downloadEnvironmentalReport(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/huella-carbono/reporte`, { responseType: 'blob' });
  }

  normalize(value: string | null | undefined): string {
    if (typeof value !== 'string') return '';
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private getArray<T>(path: string, label: string): Observable<T[]> {
    return this.http.get<unknown>(`${this.apiUrl}${path}`).pipe(
      map((body) => {
        if (!Array.isArray(body)) {
          throw new Error(`La respuesta de ${label} llegó, pero no tiene el formato esperado (se esperaba una lista JSON).`);
        }
        return body as T[];
      }),
    );
  }
}
