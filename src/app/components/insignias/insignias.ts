import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { Insignia, LogrosResumen } from '../../models/logros.model';
import { RetoParticipacion } from '../../models/reto.model';
import { InsigniasService } from '../../services/insignias.service';
import { RetosService } from '../../services/retos.service';

type PanelInsignias = 'insignias' | 'logros';

@Component({
  selector: 'app-insignias',
  standalone: false,
  templateUrl: './insignias.html',
  styleUrl: './insignias.css',
})
export class Insignias implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private requestInProgress = false;

  panel: PanelInsignias = 'insignias';
  logros: LogrosResumen | null = null;
  completedChallenges: RetoParticipacion[] = [];
  completedChallengesAvailable = false;
  loading = true;
  error = '';
  progressWarning = '';

  constructor(private readonly api: InsigniasService, private readonly retos: RetosService) {}

  ngOnInit(): void { this.loadData(); }

  @HostListener('window:focus') onWindowFocus(): void { this.loadData(true); }

  loadData(silent = false): void {
    if (this.requestInProgress) return;
    this.requestInProgress = true;
    if (!silent) {
      this.loading = true;
      this.error = '';
    }
    this.progressWarning = '';

    forkJoin({
      logros: this.api.getLogros().pipe(timeout({ first: 15000 }), catchError((error: unknown) => {
        this.error = this.api.errorMessage(error);
        return of(null);
      })),
      completados: this.retos.listCompleted().pipe(timeout({ first: 15000 }), catchError((error: unknown) => {
        this.progressWarning = this.retos.errorMessage(error, 'No se pudo consultar el progreso de retos.');
        return of(null);
      })),
    }).pipe(finalize(() => {
      this.requestInProgress = false;
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe(({ logros, completados }) => {
      if (logros) {
        this.logros = logros;
        this.error = '';
      }
      if (completados) {
        this.completedChallenges = completados;
        this.completedChallengesAvailable = true;
      } else {
        this.completedChallengesAvailable = false;
      }
      this.cdr.markForCheck();
    });
  }

  get badges(): Insignia[] { return this.logros?.insignias ?? []; }
  get earnedBadges(): Insignia[] { return this.badges.filter((badge) => badge.desbloqueada); }
  get pendingBadges(): Insignia[] { return this.badges.filter((badge) => !badge.desbloqueada); }

  get nextLevelTotal(): number {
    if (!this.logros) return 0;
    return this.logros.ecoPuntos + this.logros.puntosParaSiguienteNivel;
  }

  get levelProgress(): number {
    return Math.max(0, Math.min(100, this.logros?.progresoPorcentaje ?? 0));
  }

  progressFor(badge: Insignia): { current: number; target: number; unit: string } | null {
    if (badge.desbloqueada) return null;
    if (badge.puntosRequeridos !== null && badge.puntosRequeridos > 0 && this.logros) {
      return {
        current: Math.min(this.logros.ecoPuntos, badge.puntosRequeridos),
        target: badge.puntosRequeridos,
        unit: 'EcoPuntos',
      };
    }
    const category = this.requiredChallengeCategory(badge);
    if (!category || !this.completedChallengesAvailable) return null;
    const current = this.completedChallenges.filter((participation) =>
      participation.reto?.clasificacion?.toUpperCase() !== 'COLECTIVO'
      && this.normalize(participation.reto?.categoriaNombre ?? '') === category
    ).length;
    return { current: Math.min(current, 1), target: 1, unit: 'reto individual' };
  }

  progressPercent(badge: Insignia): number {
    const progress = this.progressFor(badge);
    if (!progress || progress.target <= 0) return 0;
    return Math.max(0, Math.min(100, (progress.current / progress.target) * 100));
  }

  iconFor(badge: Insignia): string {
    const name = this.normalize(badge.nombre);
    if (name.includes('transporte')) return '🚲';
    if (name.includes('energia')) return '⚡';
    if (name.includes('primer paso')) return '🌱';
    if (name.includes('aprendiz')) return '🌿';
    if (name.includes('guardian')) return '🛡️';
    if (name.includes('heroe')) return '🌍';
    if (name.includes('maestro')) return '🏆';
    return '🏅';
  }

  setPanel(panel: PanelInsignias): void { this.panel = panel; }

  formatDate(value: string | null): string {
    if (!value) return 'Fecha no disponible';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible'
      : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  requiredChallengeCategory(badge: Insignia): string | null {
    const name = this.normalize(badge.nombre);
    if (name === 'reto de transporte completado') return 'transporte';
    if (name === 'reto de energia completado') return 'energia';
    return null;
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }
}
