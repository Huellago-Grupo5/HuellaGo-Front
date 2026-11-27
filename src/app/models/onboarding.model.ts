export interface HabitRecord {
  id: number;
  usuarioId: number;
  categoriaId: number;
  nombre: string;
  valor: number | null;
  unidad: string | null;
  categoriaNombre: string | null;
}

export interface EnvironmentalObjective {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface CarbonFootprint {
  usuarioId: number;
  co2Total: number;
  co2Transporte: number;
  co2Energia: number;
  co2Alimentacion: number;
  co2Residuos: number;
  fechaCalculo: string;
  unidad: string;
  periodo: string;
  nivelImpacto: string;
  referenciaImpacto: string;
  metodologia: string;
}

export interface FootprintEquivalences {
  arboles: number;
  bicicletaKm: number;
  reciclajeKg: number;
  advertencia: string;
}

export interface DashboardSummary {
  usuarioId: number;
  ecoPuntos: number | null;
  nivel: number | null;
  cantidadHabitos: number;
  huellaCarbonoActual: number | null;
  retosActivos: number;
  recomendacionesPendientes: number;
  habitosPorCategoria: Record<string, number>;
  categoriaConMasHabitos: string | null;
  retosCompletados: number;
  recomendacionesCompletadas: number;
}

export interface InitialState {
  complete: boolean;
  habits: HabitRecord[];
  history: CarbonFootprint[];
}

export interface FootprintActivity {
  categoria: string;
  co2: number | null;
}

export interface FootprintBreakdown {
  usuarioId: number;
  co2Total: number | null;
  actividades: FootprintActivity[];
}

export interface DailyFootprint extends CarbonFootprint {}
