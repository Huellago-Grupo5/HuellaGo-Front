import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChangePasswordRequest,
  NotificationPreference,
  PrivacyPreference,
  UserNotification,
  UserProfile,
  VisualPreferences,
} from '../models/profile-notification.model';

@Injectable({ providedIn: 'root' })
export class ProfileNotificationService {
  private readonly apiUrl = environment.apiUrl;
  constructor(private readonly http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/usuarios/perfil`);
  }

  updateProfile(profile: Pick<UserProfile, 'nombres' | 'apellidos' | 'correo'>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/usuarios/perfil`, profile);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/usuarios/perfil/contrasena`, request);
  }

  getNotifications(): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>(`${this.apiUrl}/usuarios/me/notificaciones`);
  }

  markNotificationRead(id: number): Observable<UserNotification> {
    return this.http.put<UserNotification>(`${this.apiUrl}/usuarios/me/notificaciones/${id}/leer`, {});
  }

  markAllNotificationsRead(): Observable<{ actualizadas: number }> {
    return this.http.put<{ actualizadas: number }>(`${this.apiUrl}/usuarios/me/notificaciones/leer-todas`, {});
  }

  getNotificationPreference(): Observable<NotificationPreference> {
    return this.http.get<NotificationPreference>(`${this.apiUrl}/usuarios/me/preferencias/notificaciones`);
  }

  updateNotificationPreference(enabled: boolean): Observable<NotificationPreference> {
    return this.http.put<NotificationPreference>(`${this.apiUrl}/usuarios/me/preferencias/notificaciones`, {
      notificacionesActivas: enabled,
    });
  }

  updatePrivacyPreference(enabled: boolean): Observable<PrivacyPreference> {
    return this.http.put<PrivacyPreference>(`${this.apiUrl}/usuarios/me/preferencias/privacidad`, {
      visibilidadComunidad: enabled,
    });
  }

  getVisualPreferences(): Observable<VisualPreferences> {
    return this.http.get<VisualPreferences>(`${this.apiUrl}/usuarios/me/preferencias/visualizacion`);
  }

  updateVisualPreferences(preferences: VisualPreferences): Observable<VisualPreferences> {
    return this.http.put<VisualPreferences>(`${this.apiUrl}/usuarios/me/preferencias/visualizacion`, preferences);
  }
}
