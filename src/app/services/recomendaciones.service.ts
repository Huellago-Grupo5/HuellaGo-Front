import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiErrorResponse } from '../models/api-error-response.model';
import { ConversionRecomendacion, GeneracionRecomendaciones, Recomendacion, RecomendacionCompletada } from '../models/recomendacion.model';

@Injectable({ providedIn: 'root' })
export class RecomendacionesService {
  private readonly baseUrl = `${environment.apiUrl}/usuarios/me/recomendaciones`;

  constructor(private readonly http: HttpClient) {}

  pendientes(): Observable<Recomendacion[]> {
    return this.asArray<Recomendacion>(this.baseUrl, 'las recomendaciones pendientes');
  }

  historial(): Observable<RecomendacionCompletada[]> {
    return this.asArray<RecomendacionCompletada>(`${this.baseUrl}/historial`, 'el historial de recomendaciones');
  }

  generar(): Observable<GeneracionRecomendaciones> {
    return this.http.post<GeneracionRecomendaciones>(`${this.baseUrl}/generar`, null);
  }

  completar(id: number): Observable<RecomendacionCompletada> {
    return this.http.put<RecomendacionCompletada>(`${this.baseUrl}/${id}/completar`, null);
  }

  convertirEnReto(id: number): Observable<ConversionRecomendacion> {
    return this.http.post<ConversionRecomendacion>(`${this.baseUrl}/${id}/convertir-en-reto`, null);
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
