import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { finalize, timeout } from 'rxjs';
import { RankingComunitario, RankingParticipante } from '../../models/ranking.model';
import { RankingService } from '../../services/ranking.service';

@Component({
  selector: 'app-ranking',
  standalone: false,
  templateUrl: './ranking.html',
  styleUrl: './ranking.css',
})
export class Ranking implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private requestInProgress = false;

  ranking: RankingComunitario | null = null;
  loading = true;
  error = '';
  updatedAt: Date | null = null;

  constructor(private readonly api: RankingService) {}

  ngOnInit(): void {
    this.loadRanking();
    this.pollHandle = setInterval(() => this.loadRanking(true), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollHandle !== null) clearInterval(this.pollHandle);
  }

  @HostListener('window:focus') onWindowFocus(): void { this.loadRanking(true); }

  loadRanking(silent = false): void {
    if (this.requestInProgress) return;
    this.requestInProgress = true;
    if (!silent) {
      this.loading = true;
      this.error = '';
    }
    this.api.getRanking().pipe(timeout({ first: 15000 }), finalize(() => {
      this.requestInProgress = false;
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: (ranking) => {
        this.ranking = ranking;
        this.updatedAt = new Date();
        this.error = '';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        this.error = this.api.errorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  get participants(): RankingParticipante[] { return this.ranking?.participantes ?? []; }

  get podium(): Array<{ participant: RankingParticipante; place: string }> {
    const places: Array<{ position: number; place: string }> = [
      { position: 2, place: 'second' }, { position: 1, place: 'first' }, { position: 3, place: 'third' },
    ];
    return places.flatMap(({ position, place }) => {
      const participant = this.participants.find((item) => item.posicion === position);
      return participant ? [{ participant, place }] : [];
    });
  }

  get ownParticipant(): RankingParticipante | null {
    const position = this.ranking?.miPosicion;
    return position ? this.participants.find((item) => item.posicion === position) ?? null : null;
  }

  get positionMessage(): string {
    if (!this.ownParticipant) return 'Tu perfil no aparece entre los participantes visibles del ranking.';
    if (this.ownParticipant.ecoPuntos === 0) return 'Completa retos para comenzar a sumar EcoPuntos.';
    if (this.ownParticipant.posicion === 1) return '¡Vas en primer lugar! Sigue así.';
    return '¡Sigue así, puedes subir más posiciones!';
  }

  formatPoints(points: number): string { return new Intl.NumberFormat('es-PE').format(points); }

  get lastUpdatedLabel(): string {
    if (!this.updatedAt) return '';
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(this.updatedAt);
  }
}
