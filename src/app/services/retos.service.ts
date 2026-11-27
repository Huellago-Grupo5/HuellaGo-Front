import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiErrorResponse } from '../models/api-error-response.model';
import { AvanceReto, Reto, RetoColectivo, RetoParticipacion } from '../models/reto.model';

@Injectable({ providedIn: 'root' })
export class RetosService {
  private readonly apiUrl = environment.apiUrl;
  constructor(private readonly http: HttpClient) {}

  listAvailable(classification?: string): Observable<Reto[]> {
    const url = classification
      ? `${this.apiUrl}/retos?clasificacion=${encodeURIComponent(classification)}`
      : `${this.apiUrl}/retos`;
    return this.asArray<Reto>(url, 'retos disponibles');
  }

  listActive(): Observable<RetoParticipacion[]> {
    return this.asArray<RetoParticipacion>(`${this.apiUrl}/retos-activos`, 'tus retos activos');
  }

  listCompleted(): Observable<RetoParticipacion[]> {
    return this.asArray<RetoParticipacion>(`${this.apiUrl}/retos/completados`, 'tus retos completados');
  }

  accept(retoId: number): Observable<RetoParticipacion> {
    return this.http.post<RetoParticipacion>(`${this.apiUrl}/retos/${retoId}/aceptar`, null);
  }

  recordProgress(participationId: number, quantity: number, idempotencyKey: string): Observable<RetoParticipacion> {
    return this.http.post<RetoParticipacion>(`${this.apiUrl}/retos-activos/${participationId}/avances`, {
      cantidad: quantity,
      claveSolicitud: idempotencyKey,
    });
  }

  listProgress(participationId: number): Observable<AvanceReto[]> {
    return this.asArray<AvanceReto>(`${this.apiUrl}/retos-activos/${participationId}/avances`, 'el historial de avances');
  }

  complete(participationId: number): Observable<RetoParticipacion> {
    return this.http.put<RetoParticipacion>(`${this.apiUrl}/retos-activos/${participationId}/completar`, null);
  }

  listCollective(): Observable<RetoColectivo[]> {
    return this.asArray<RetoColectivo>(`${this.apiUrl}/retos/colectivos`, 'retos colectivos');
  }

  joinCollective(retoId: number): Observable<RetoParticipacion> {
    return this.http.post<RetoParticipacion>(`${this.apiUrl}/retos/colectivos/${retoId}/unirse`, null);
  }

  recordCollectiveProgress(participationId: number, quantity: number, idempotencyKey: string): Observable<RetoParticipacion> {
    return this.http.post<RetoParticipacion>(`${this.apiUrl}/retos/colectivos/participaciones/${participationId}/avances`, {
      cantidad: quantity,
      claveSolicitud: idempotencyKey,
    });
  }

  listCollectiveProgress(participationId: number): Observable<AvanceReto[]> {
    return this.asArray<AvanceReto>(`${this.apiUrl}/retos/colectivos/participaciones/${participationId}/avances`, 'el historial de avances colectivos');
  }

  errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.mensaje ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
  }

  private asArray<T>(url: string, label: string): Observable<T[]> {
    return this.http.get<unknown>(url).pipe(map((body) => {
      if (!Array.isArray(body)) throw new Error(`La respuesta de ${label} no tiene el formato esperado.`);
      return body as T[];
    }));
  }
}
