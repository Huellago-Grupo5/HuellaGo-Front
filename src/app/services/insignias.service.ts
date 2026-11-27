import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiErrorResponse } from '../models/api-error-response.model';
import { LogrosResumen } from '../models/logros.model';

@Injectable({ providedIn: 'root' })
export class InsigniasService {
  private readonly url = `${environment.apiUrl}/usuarios/me/logros`;

  constructor(private readonly http: HttpClient) {}

  getLogros(): Observable<LogrosResumen> {
    return this.http.get<unknown>(this.url).pipe(map((body) => {
      if (!body || typeof body !== 'object') throw new Error('La respuesta de logros no tiene el formato esperado.');
      const response = body as Partial<LogrosResumen>;
      if (!Array.isArray(response.insignias) || typeof response.ecoPuntos !== 'number'
          || typeof response.nivel !== 'number') {
        throw new Error('La respuesta de logros no incluye los datos esperados.');
      }
      return response as LogrosResumen;
    }));
  }

  errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.mensaje ?? 'No se pudieron cargar tus insignias. Intenta nuevamente.';
    }
    return error instanceof Error ? error.message : 'No se pudieron cargar tus insignias. Intenta nuevamente.';
  }
}
