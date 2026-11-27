import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { DashboardSummary } from '../../models/onboarding.model';
import { AvanceReto, Reto, RetoColectivo, RetoParticipacion } from '../../models/reto.model';
import { OnboardingService } from '../../services/onboarding.service';
import { RetosService } from '../../services/retos.service';
import { AuthTokenService } from '../../services/auth-token.service';

type RetosTab = 'disponible' | 'activo' | 'completado' | 'colectivos';

interface CompletedInSession {
  reto: Reto;
  participacion: RetoParticipacion;
}

@Component({
  selector: 'app-challenges',
  standalone: false,
  templateUrl: './challenges.html',
  styleUrl: './challenges.css',
})
export class Challenges implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly tokenStorage = inject(AuthTokenService);
  private readonly inMemoryProgressKeys = new Map<string, string>();
  tab: RetosTab = 'disponible';
  retos: Reto[] = [];
  participaciones: RetoParticipacion[] = [];
  colectivos: RetoColectivo[] = [];
  completedRetos: CompletedInSession[] = [];
  advances: AvanceReto[] = [];
  summary: DashboardSummary | null = null;
  loading = true;
  availableError = '';
  activeError = '';
  collectiveError = '';
  notice = '';
  errorMessage = '';
  search = '';
  easyFirst = true;
  busy = false;
  selectedReto: Reto | null = null;
  selectedCollective: RetoColectivo | null = null;
  selectedParticipation: RetoParticipacion | null = null;

  constructor(private readonly api: RetosService, private readonly onboarding: OnboardingService) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.availableError = '';
    this.activeError = '';
    this.collectiveError = '';
    const available$ = this.api.listAvailable().pipe(timeout({ first: 20000 }), catchError((error: unknown) => {
      this.availableError = this.api.errorMessage(error, 'No se pudieron cargar los retos disponibles.');
      return of([] as Reto[]);
    }));
    const active$ = this.api.listActive().pipe(timeout({ first: 20000 }), catchError((error: unknown) => {
      this.activeError = this.api.errorMessage(error, 'No se pudieron cargar tus retos activos.');
      return of([] as RetoParticipacion[]);
    }));
    const collective$ = this.api.listCollective().pipe(timeout({ first: 20000 }), catchError((error: unknown) => {
      this.collectiveError = this.api.errorMessage(error, 'No se pudieron cargar los retos colectivos.');
      return of([] as RetoColectivo[]);
    }));
    const completed$ = this.api.listCompleted().pipe(timeout({ first: 20000 }), catchError((error: unknown) => {
      this.errorMessage = this.api.errorMessage(error, 'No se pudieron cargar tus retos completados.');
      return of([] as RetoParticipacion[]);
    }));
    const summary$ = this.onboarding.getDashboard().pipe(timeout({ first: 20000 }), catchError(() => of(null)));
    forkJoin({ retos: available$, participaciones: active$, colectivos: collective$, completed: completed$, summary: summary$ }).pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe(({ retos, participaciones, colectivos, completed, summary }) => {
      this.retos = retos;
      this.participaciones = participaciones;
      this.colectivos = colectivos;
      this.summary = summary;
      this.completedRetos = completed.flatMap((participacion) => participacion.reto
        ? [{ reto: participacion.reto, participacion }]
        : []);
      this.cdr.markForCheck();
    });
  }

  setTab(tab: RetosTab): void {
    this.tab = tab;
    if (tab === 'colectivos') this.search = '';
    this.notice = '';
    this.errorMessage = '';
    this.closeDetails();
  }

  toggleSort(): void { this.easyFirst = !this.easyFirst; }

  get availableRetos(): Reto[] {
    const activeIds = new Set(this.participaciones.map((item) => item.retoId));
    const completedIds = new Set(this.completedRetos.map((item) => item.reto.id));
    return this.sortRetos(this.retos.filter((reto) => !activeIds.has(reto.id) && !completedIds.has(reto.id)
      && this.matchesSearch(reto.titulo, reto.descripcion)));
  }

  get activeIndividuals(): Array<{ reto: Reto; participacion: RetoParticipacion }> {
    const items = this.participaciones.flatMap((participacion) => {
      const reto = participacion.reto ?? this.retos.find((item) => item.id === participacion.retoId);
      return reto && participacion.estado.toLowerCase() === 'activo' && this.matchesSearch(reto.titulo, reto.descripcion)
        ? [{ reto, participacion }] : [];
    });
    return items.sort((a, b) => this.compareDifficulty(a.reto, b.reto));
  }

  get activeCollectives(): Array<{ reto: RetoColectivo; participacion: RetoParticipacion }> {
    return this.participaciones.flatMap((participacion) => {
      const reto = this.colectivos.find((item) => item.retoId === participacion.retoId);
      return reto && participacion.estado.toLowerCase() === 'activo' && this.matchesSearch(reto.titulo, '')
        ? [{ reto, participacion }] : [];
    });
  }

  get unlinkedActiveCount(): number {
    const visibleIds = new Set([...this.activeIndividuals.map((item) => item.participacion.id), ...this.activeCollectives.map((item) => item.participacion.id)]);
    return this.participaciones.filter((participacion) => participacion.estado.toLowerCase() === 'activo' && !visibleIds.has(participacion.id)).length;
  }

  get visibleCollectives(): RetoColectivo[] {
    return this.sortCollectives(this.colectivos.filter((reto) => this.matchesSearch(reto.titulo, '')));
  }

  difficultyClass(value: string | null): string {
    const difficulty = (value ?? '').toLocaleLowerCase('es');
    if (difficulty.includes('facil') || difficulty.includes('fácil')) return 'easy';
    if (difficulty.includes('medio') || difficulty.includes('moderado')) return 'medium';
    if (difficulty.includes('dificil') || difficulty.includes('difícil')) return 'hard';
    return 'unknown';
  }

  difficultyLabel(value: string | null): string { return value?.trim() || 'Sin clasificar'; }

  retoImage(reto: Reto): string {
    const text = `${reto.titulo} ${reto.categoriaNombre ?? ''}`.toLocaleLowerCase('es');
    if (/bicic|transporte|movilidad|auto|bus/.test(text)) return 'assets/images/usarbicicleta.png';
    if (/plastic|residuo|recicl|basura/.test(text)) return 'assets/images/menosplastico.png';
    if (/ducha|agua|energia/.test(text)) return 'assets/images/ducha.png';
    if (/aliment|comida|local/.test(text)) return 'assets/images/alimentacion.png';
    if (/arbol|árbol|planta|naturaleza/.test(text)) return 'assets/images/plantar.png';
    if (/papel|oficina/.test(text)) return 'assets/images/oficina.png';
    return 'assets/images/hojascarlos.png';
  }

  retoDuration(reto: Reto): string {
    if (!reto.fechaInicio || !reto.fechaFin) return 'Periodo según disponibilidad';
    const start = new Date(`${reto.fechaInicio}T00:00:00`);
    const end = new Date(`${reto.fechaFin}T00:00:00`);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return days > 0 ? `${days} ${days === 1 ? 'día' : 'días'}` : 'Fechas no disponibles';
  }

  progressPercent(value: number | null | undefined): number {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  openReto(reto: Reto, participation: RetoParticipacion | null = null): void {
    this.selectedReto = reto;
    this.selectedCollective = null;
    this.selectedParticipation = participation;
    this.errorMessage = '';
    this.loadAdvances(participation, false);
  }

  openCollective(reto: RetoColectivo, participation: RetoParticipacion | null = null): void {
    this.selectedCollective = reto;
    this.selectedReto = null;
    this.selectedParticipation = participation;
    this.errorMessage = '';
    this.loadAdvances(participation, true);
  }

  closeDetails(): void {
    this.selectedReto = null;
    this.selectedCollective = null;
    this.selectedParticipation = null;
    this.advances = [];
  }

  acceptReto(reto: Reto): void {
    this.runAction(this.api.accept(reto.id), 'No se pudo aceptar el reto.', (participation) => {
      this.notice = `Te uniste a “${reto.titulo}”.`;
      this.closeDetails();
      this.loadData();
    });
  }

  joinCollective(reto: RetoColectivo): void {
    this.runAction(this.api.joinCollective(reto.retoId), 'No se pudo unir al reto colectivo.', (participation) => {
      this.notice = `Te uniste al reto colectivo “${reto.titulo}”.`;
      this.closeDetails();
      this.loadData();
    });
  }

  updateProgress(requestData: { participation: RetoParticipacion; quantity: number; collective: boolean }): void {
    const { participation, quantity, collective } = requestData;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.errorMessage = 'Ingresa una cantidad mayor que cero.';
      return;
    }
    // Reuse the same idempotency key if the response was lost and the user retries,
    // including after a page refresh. Remove it only after a confirmed success.
    const requestFingerprint = `${this.tokenStorage.getUserId() ?? 'unknown'}:${collective ? 'collective' : 'individual'}:${participation.id}:${quantity}`;
    const storageKey = `huellago.pending-progress.${requestFingerprint}`;
    const requestKey = this.getProgressRequestKey(storageKey);
    const request = collective
      ? this.api.recordCollectiveProgress(participation.id, quantity, requestKey)
      : this.api.recordProgress(participation.id, quantity, requestKey);
    this.runAction(request, 'No se pudo actualizar el progreso.', (updated) => {
      this.removeProgressRequestKey(storageKey);
      this.selectedParticipation = updated;
      this.replaceParticipation(updated);
      this.notice = 'Tu progreso se guardó.';
      this.loadAdvances(updated, collective);
    });
  }

  private getProgressRequestKey(storageKey: string): string {
    const inMemory = this.inMemoryProgressKeys.get(storageKey);
    if (inMemory) return inMemory;
    try {
      const existing = sessionStorage.getItem(storageKey);
      if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) {
        this.inMemoryProgressKeys.set(storageKey, existing);
        return existing;
      }
    } catch {
      // Continue with an in-memory key when storage is unavailable.
    }
    const created = crypto.randomUUID();
    this.inMemoryProgressKeys.set(storageKey, created);
    try { sessionStorage.setItem(storageKey, created); } catch { /* Storage can be disabled by the browser. */ }
    return created;
  }

  private removeProgressRequestKey(storageKey: string): void {
    this.inMemoryProgressKeys.delete(storageKey);
    try { sessionStorage.removeItem(storageKey); } catch { /* No persistent entry to clear. */ }
  }

  completeReto(): void {
    if (!this.selectedReto || !this.selectedParticipation || this.progressPercent(this.selectedParticipation.progreso) < 100) return;
    const reto = this.selectedReto;
    this.runAction(this.api.complete(this.selectedParticipation.id), 'No se pudo completar el reto.', (participation) => {
      this.participaciones = this.participaciones.filter((item) => item.id !== participation.id);
      this.closeDetails();
      const points = reto.puntosRecompensa ?? 0;
      this.notice = points > 0 ? `¡Reto completado! Ganaste ${points} EcoPuntos.` : '¡Reto completado!';
      this.onboarding.getDashboard().subscribe({ next: (summary) => { this.summary = summary; this.cdr.markForCheck(); } });
      this.loadData();
    });
  }

  private runAction<T extends RetoParticipacion>(request: import('rxjs').Observable<T>, fallback: string, success: (value: T) => void): void {
    this.busy = true;
    this.errorMessage = '';
    this.notice = '';
    request.pipe(timeout({ first: 20000 }), finalize(() => {
      this.busy = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: success,
      error: (error: unknown) => {
        this.errorMessage = this.api.errorMessage(error, fallback);
        this.cdr.markForCheck();
      },
    });
  }

  private replaceParticipation(updated: RetoParticipacion): void {
    this.participaciones = this.participaciones.map((item) => item.id === updated.id ? updated : item);
  }

  private loadAdvances(participation: RetoParticipacion | null, collective: boolean): void {
    this.advances = [];
    if (!participation) return;
    const request = collective
      ? this.api.listCollectiveProgress(participation.id)
      : this.api.listProgress(participation.id);
    request.pipe(timeout({ first: 20000 })).subscribe({
      next: (advances) => { this.advances = advances; this.cdr.markForCheck(); },
      error: () => { this.errorMessage = 'No se pudo cargar el historial de avances.'; this.cdr.markForCheck(); },
    });
  }

  private matchesSearch(title: string, description: string): boolean {
    const term = this.search.trim().toLocaleLowerCase('es');
    return !term || `${title} ${description}`.toLocaleLowerCase('es').includes(term);
  }

  private sortRetos(values: Reto[]): Reto[] {
    return [...values].sort((a, b) => this.compareDifficulty(a, b));
  }

  private compareDifficulty(a: Reto, b: Reto): number {
    const order: Record<string, number> = { facil: 1, fácil: 1, medio: 2, moderado: 2, dificil: 3, difícil: 3 };
    const difference = (order[(a.dificultad ?? '').toLocaleLowerCase('es')] ?? 4)
      - (order[(b.dificultad ?? '').toLocaleLowerCase('es')] ?? 4);
    return this.easyFirst ? difference : -difference;
  }

  private sortCollectives(values: RetoColectivo[]): RetoColectivo[] {
    return [...values].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  }
}
