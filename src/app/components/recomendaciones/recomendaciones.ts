import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { ConversionRecomendacion, GeneracionRecomendaciones, Recomendacion, RecomendacionCompletada } from '../../models/recomendacion.model';
import { RecomendacionesService } from '../../services/recomendaciones.service';

type TabRecomendaciones = 'pendientes' | 'historial';
type RetryAction = 'generation' | 'load' | null;

@Component({
  selector: 'app-recomendaciones',
  standalone: false,
  templateUrl: './recomendaciones.html',
  styleUrl: './recomendaciones.css',
})
export class Recomendaciones implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  tab: TabRecomendaciones = 'pendientes';
  recomendaciones: Recomendacion[] = [];
  historialItems: RecomendacionCompletada[] = [];
  loading = true;
  refreshing = false;
  actionId: number | null = null;
  error = '';
  retryAction: RetryAction = null;
  notice = '';
  search = '';
  categoryFilter = '';
  selected: Recomendacion | null = null;
  generationDetails: GeneracionRecomendaciones | null = null;

  constructor(private readonly api: RecomendacionesService, private readonly router: Router) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.retryAction = null;
    forkJoin({
      pending: this.api.pendientes().pipe(timeout({ first: 20000 }), catchError((error: unknown) => {
        this.error = this.api.errorMessage(error, 'No se pudieron cargar las recomendaciones.');
        this.retryAction = 'load';
        return of(null);
      })),
      history: this.api.historial().pipe(timeout({ first: 20000 }), catchError((error: unknown) => {
        this.error = this.error ? `${this.error} Tampoco se pudo cargar el historial.` : this.api.errorMessage(error, 'No se pudo cargar el historial.');
        this.retryAction = 'load';
        return of(null);
      })),
    }).pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe(({ pending, history }) => {
      if (pending) this.recomendaciones = pending;
      if (history) this.historialItems = history;
      this.cdr.markForCheck();
    });
  }

  get categories(): string[] {
    return [...new Set(this.recomendaciones.map((item) => item.categoria).filter(Boolean))];
  }

  get visibleRecommendations(): Recomendacion[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.recomendaciones.filter((item) =>
      (!this.categoryFilter || this.categoryKey(item.categoria) === this.categoryKey(this.categoryFilter))
      && (!query || [item.titulo, item.descripcion, item.motivo, item.categoria].some((value) => value?.toLocaleLowerCase('es').includes(query)))
    );
  }

  get visibleHistory(): RecomendacionCompletada[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.historialItems.filter((item) => !query || `${item.titulo} ${item.descripcion}`.toLocaleLowerCase('es').includes(query));
  }

  get priorityRecommendation(): Recomendacion | null {
    return this.recomendaciones.find((item) => item.prioridad?.toUpperCase() === 'ALTA') ?? null;
  }

  setTab(tab: TabRecomendaciones): void { this.tab = tab; this.notice = ''; this.error = ''; this.selected = null; }

  refreshRecommendations(): void {
    if (this.refreshing) return;
    this.refreshing = true;
    this.error = '';
    this.retryAction = null;
    this.notice = '';
    this.generationDetails = null;
    this.api.generar().pipe(timeout({ first: 90000 }), finalize(() => {
      this.refreshing = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: (result: GeneracionRecomendaciones) => {
        this.generationDetails = result;
        this.notice = result.mensaje || 'Se revisaron tus recomendaciones con tus datos actuales.';
        this.loadData();
      },
      error: (error: unknown) => {
        this.error = this.generationError(error);
        this.retryAction = 'generation';
        this.cdr.markForCheck();
      },
    });
  }

  retry(): void {
    if (this.retryAction === 'generation') this.refreshRecommendations();
    else if (this.retryAction === 'load') this.loadData();
  }

  complete(item: Recomendacion): void {
    const id = item.usuarioRecomendacionId;
    if (this.actionId !== null) return;
    this.runAction(id, this.api.completar(id), 'La recomendación se marcó como realizada.', 'No se pudo completar la recomendación.', () => this.loadData());
  }

  convertToChallenge(item: Recomendacion): void {
    const id = item.usuarioRecomendacionId;
    if (this.actionId !== null) return;
    this.actionId = id;
    this.error = '';
    this.notice = '';
    this.api.convertirEnReto(id).pipe(timeout({ first: 20000 }), finalize(() => {
      this.actionId = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: (result: ConversionRecomendacion) => {
        this.notice = result.mensaje || 'El reto se creó correctamente.';
        this.selected = null;
        this.loadData();
        this.router.navigate(['/retos']);
      },
      error: (error: unknown) => {
        this.error = this.api.errorMessage(error, 'No se pudo convertir la recomendación en reto.');
        this.retryAction = null;
        this.cdr.markForCheck();
      },
    });
  }

  openDetails(item: Recomendacion): void { this.selected = item; }
  closeDetails(): void { this.selected = null; }

  formatDate(value: string | null): string {
    if (!value) return 'Fecha no disponible';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(date);
  }

  categoryClass(category: string): string { return `category-${this.categoryKey(category)}`; }

  private categoryKey(category: string): string {
    return category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private generationError(error: unknown): string {
    const state = error instanceof HttpErrorResponse
      ? (error.error as { estado?: string } | null)?.estado
      : undefined;
    const advice = 'Tus recomendaciones guardadas no se eliminaron. Puedes reintentar cuando el servicio esté disponible.';
    switch (state) {
      case 'OLLAMA_NO_DISPONIBLE':
        return `Ollama no responde en localhost:11434. Comprueba que el servicio esté iniciado y tenga disponible el modelo qwen3:4b-instruct. ${advice}`;
      case 'OLLAMA_TIEMPO_AGOTADO':
        return `Ollama tardó demasiado en responder. No se guardó ninguna respuesta incompleta. ${advice}`;
      case 'OLLAMA_ERROR_HTTP':
        return `Ollama devolvió un error HTTP y la generación se detuvo sin guardar sugerencias nuevas. ${advice}`;
      case 'OLLAMA_RESPUESTA_INVALIDA':
        return `Ollama respondió, pero su contenido no pasó las validaciones y no se guardó. ${advice}`;
      case 'PERSISTENCIA_NO_DISPONIBLE':
        return `No se pudo guardar el resultado por un problema temporal de persistencia. No se reemplazaron las recomendaciones anteriores. ${advice}`;
      default:
        return this.api.errorMessage(error, `No se pudieron actualizar las recomendaciones. ${advice}`);
    }
  }

  private runAction<T>(id: number, request: import('rxjs').Observable<T>, success: string, fallback: string, after: () => void): void {
    this.actionId = id;
    this.error = '';
    this.notice = '';
    request.pipe(timeout({ first: 20000 }), finalize(() => {
      this.actionId = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => { this.notice = success; this.selected = null; after(); this.cdr.markForCheck(); },
      error: (error: unknown) => { this.error = this.api.errorMessage(error, fallback); this.retryAction = null; this.cdr.markForCheck(); },
    });
  }
}
