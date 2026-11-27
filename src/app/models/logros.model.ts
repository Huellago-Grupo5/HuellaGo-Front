export interface LogrosResumen {
  usuarioId: number;
  ecoPuntos: number;
  nivel: number;
  puntosEnNivel: number;
  puntosParaSiguienteNivel: number;
  progresoPorcentaje: number;
  insignias: Insignia[];
}

export interface Insignia {
  id: number;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  puntosRequeridos: number | null;
  fechaObtencion: string | null;
  desbloqueada: boolean;
}
