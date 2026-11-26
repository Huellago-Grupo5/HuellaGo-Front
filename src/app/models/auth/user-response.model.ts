export interface UserResponse {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  ecoPuntos: number | null;
  nivel: number | null;
  notificacionesActivas: boolean | null;
  visibilidadComunidad: boolean | null;
  fechaCreacion: string | null;
  fechaActualizacion: string | null;
}
