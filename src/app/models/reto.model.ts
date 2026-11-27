export interface Reto {
  id: number;
  titulo: string;
  descripcion: string;
  puntosRecompensa: number | null;
  dificultad: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  activo: boolean;
  categoriaId: number | null;
  categoriaNombre: string | null;
  clasificacion?: string | null;
  metaCantidad: number;
  unidadMedida: string;
}

export interface RetoParticipacion {
  id: number;
  usuarioId: number;
  retoId: number;
  estado: string;
  progreso: number;
  cantidadAcumulada: number;
  fechaAceptacion: string | null;
  fechaCompletado: string | null;
  reto?: Reto;
  insigniasDesbloqueadas?: Array<{ id: number; nombre: string }>;
}

export interface RetoColectivo {
  retoId: number;
  titulo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  participantes: number;
  progresoColectivo: number;
  estado: string;
  fechaCierre: string | null;
  metaCantidad: number;
  unidadMedida: string;
}

export interface AvanceReto {
  id: number;
  cantidad: number;
  registradoEn: string;
}
