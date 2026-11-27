export interface UserProfile {
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

export interface UserNotification {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
}

export interface NotificationPreference {
  usuarioId: number;
  notificacionesActivas: boolean;
  fechaActualizacion: string;
}

export interface PrivacyPreference {
  usuarioId: number;
  visibilidadComunidad: boolean;
  fechaActualizacion: string;
}

export interface VisualPreferences { tema: 'claro' | 'oscuro'; unidades: 'metric' | 'imperial'; }

export interface ChangePasswordRequest {
  contrasenaActual: string;
  contrasenaNueva: string;
}
