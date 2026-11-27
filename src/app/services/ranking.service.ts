import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiErrorResponse } from '../models/api-error-response.model';
import { RankingComunitario } from '../models/ranking.model';

@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly url = `${environment.apiUrl}/comunidad/ranking`;

  constructor(private readonly http: HttpClient) {}

  getRanking(): Observable<RankingComunitario> {
    return this.http.get<unknown>(this.url).pipe(map((body) => {
      if (!body || typeof body !== 'object' || !Array.isArray((body as RankingComunitario).participantes)) {
        throw new Error('La respuesta del ranking no tiene el formato esperado.');
      }
      return body as RankingComunitario;
    }));
  }

  errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.mensaje ?? 'No se pudo consultar el ranking. Intenta nuevamente.';
    }
    return error instanceof Error ? error.message : 'No se pudo consultar el ranking. Intenta nuevamente.';
  }
}
