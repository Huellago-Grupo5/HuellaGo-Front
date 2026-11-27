import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RetoColectivo, RetoParticipacion } from '../../models/reto.model';
import { AppearanceService } from '../../services/appearance.service';

@Component({
  selector: 'app-collective-challenges',
  standalone: false,
  templateUrl: './collective-challenges.html',
  styleUrl: './collective-challenges.css',
})
export class CollectiveChallenges {
  private readonly appearance = inject(AppearanceService);
  @Input() retos: RetoColectivo[] = [];
  @Input() participaciones: RetoParticipacion[] = [];
  @Input() busy = false;
  @Input() errorMessage = '';
  @Output() join = new EventEmitter<RetoColectivo>();
  @Output() open = new EventEmitter<{ reto: RetoColectivo; participation: RetoParticipacion | null }>();

  get participantCount(): number { return this.retos.reduce((total, reto) => total + (Number(reto.participantes) || 0), 0); }
  progress(value: number | null | undefined): number { return Math.max(0, Math.min(100, Number(value) || 0)); }
  quantity(value: number | null | undefined, unit: string): number { return this.appearance.toDisplay(Number(value) || 0, unit); }
  unit(value: string): string { return this.appearance.displayUnit(value); }
  participationFor(reto: RetoColectivo): RetoParticipacion | null {
    return this.participaciones.find((item) => item.retoId === reto.retoId) ?? null;
  }
}
