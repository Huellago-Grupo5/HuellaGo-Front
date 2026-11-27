export interface RankingComunitario {
  participantes: RankingParticipante[];
  miPosicion: number | null;
  mensaje: string | null;
}

export interface RankingParticipante {
  posicion: number;
  nombreVisible: string;
  ecoPuntos: number;
  nivel: number;
}
