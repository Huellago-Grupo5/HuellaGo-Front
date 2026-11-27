export interface Recomendacion {
  usuarioRecomendacionId: number;
  recomendacionId: number;
  categoria: string;
  titulo: string;
  descripcion: string;
  motivo: string | null;
  prioridad: string | null;
  /** Huella semanal actual de la categoría; no es ahorro potencial. */
  co2Categoria: number | null;
  estado: string;
  fechaGeneracion: string | null;
  impactoEsperado?: string | null;
  explicacionImpacto?: string | null;
  justificacionPrioridad?: string | null;
  /** Reducción hipotética; solo se incluye al consultar un escenario. */
  impactoPotencialKgCo2eSemanal?: number | null;
  supuestosImpacto?: string | null;
  metodologiaImpacto?: string | null;
  limitacionesImpacto?: string | null;
  accionId?: string | null;
  versionAccion?: string | null;
}

export interface RecomendacionCompletada {
  usuarioRecomendacionId: number;
  recomendacionId: number;
  titulo: string;
  descripcion: string;
  estado: string;
  fechaGeneracion: string | null;
  fechaCompletado: string | null;
}

export interface GeneracionRecomendaciones {
  usuarioId: number;
  metodo: string;
  estado: string;
  mensaje: string;
  basePriorizacion: string | null;
  huellaId: number | null;
  fechaCalculoHuella: string | null;
  unidad: string | null;
  periodo: string | null;
  datosFaltantes: string[];
  advertencias: string[];
  recomendaciones: Recomendacion[];
}

export interface ConversionRecomendacion {
  mensaje: string;
  usuarioRecomendacionId: number;
  retoId: number;
  participacionId: number;
  estado: string;
  fechaAceptacion: string | null;
}
