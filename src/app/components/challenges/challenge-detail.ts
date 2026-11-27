import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { AvanceReto, Reto, RetoColectivo, RetoParticipacion } from '../../models/reto.model';
import { AppearanceService } from '../../services/appearance.service';

@Component({
  selector: 'app-challenge-detail',
  standalone: false,
  templateUrl: './challenge-detail.html',
  styleUrl: './challenge-detail.css',
})
export class ChallengeDetail implements OnChanges {
  private readonly appearance = inject(AppearanceService);
  @Input() reto: Reto | null = null;
  @Input() colectivo: RetoColectivo | null = null;
  @Input() participation: RetoParticipacion | null = null;
  @Input() busy = false;
  @Input() advances: AvanceReto[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() accept = new EventEmitter<Reto>();
  @Output() join = new EventEmitter<RetoColectivo>();
  @Output() saveProgress = new EventEmitter<{ participation: RetoParticipacion; quantity: number; collective: boolean }>();
  @Output() complete = new EventEmitter<void>();

  quantityDraft = 1;

  ngOnChanges(): void { this.quantityDraft = 1; }

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

  progressPercent(value: number | null | undefined): number { return Math.max(0, Math.min(100, Number(value) || 0)); }

  quantity(value: number | null | undefined): number { return this.appearance.toDisplay(Math.max(0, Number(value) || 0), this.reto?.unidadMedida ?? this.colectivo?.unidadMedida ?? ''); }

  target(reto: Reto | RetoColectivo): number { return this.appearance.toDisplay(Number(reto.metaCantidad) || 0, reto.unidadMedida || ''); }

  unit(reto: Reto | RetoColectivo): string { return this.appearance.displayUnit(reto.unidadMedida || 'unidad(es)'); }

  save(): void {
    if (!this.participation || !Number.isFinite(this.quantityDraft) || this.quantityDraft <= 0) return;
    const baseUnit = this.participation.reto?.unidadMedida ?? this.colectivo?.unidadMedida ?? '';
    this.saveProgress.emit({ participation: this.participation, quantity: this.appearance.toStorage(this.quantityDraft, baseUnit), collective: !!this.colectivo });
  }
}
