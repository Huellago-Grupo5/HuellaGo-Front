import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InstitutionLink { id: number; nombre: string; tipo: 'EMPRESA' | 'UNIVERSIDAD'; rol: string; grupo: string | null; }
export interface InstitutionCreate { tipo: 'EMPRESA' | 'UNIVERSIDAD'; nombre: string; pais: string; identificadorFiscal: string; correoContacto: string; }
export interface InstitutionalCampaignDraft { nombre: string; objetivo: string; fechaInicio: string; fechaFin: string; metaCantidad: number; unidadMedida: string; }
export interface InstitutionalDashboard { institucion?: { id: number; nombre: string }; resumen?: { totalCampanas: number; activas: number; finalizadas: number; usuariosParticipantesUnicos: number; progresoGeneralPonderado: number | null }; huellaPromedio?: { miembrosConsiderados: number; promedioKgCo2eSemanal: number | null; unidad: string; estado: string }; }
export interface InstitutionalRanking { participantes: { posicion: number; nombreVisible: string; ecoPuntos: number; nivel: number }[]; miPosicion: number | null; mensaje: string | null; }
export interface InstitutionalCampaign { id: number; nombre: string; objetivo: string; fechaInicio: string; fechaFin: string; estado: string; publicada: boolean; }
export interface InstitutionalGroup { id: number; institucionId: number; tipo: 'EQUIPO' | 'FACULTAD'; nombre: string; }
export interface InstitutionalInvite { codigo: string; institucionId: number; venceEl: string; }

@Injectable({ providedIn: 'root' })
export class InstitutionsService {
  private readonly base = `${environment.apiUrl}/instituciones`;
  constructor(private readonly http: HttpClient) {}
  mine(): Observable<InstitutionLink[]> { return this.http.get<InstitutionLink[]>(`${this.base}/me`); }
  create(dto: InstitutionCreate): Observable<InstitutionLink> { return this.http.post<InstitutionLink>(this.base, dto); }
  dashboard(id: number): Observable<InstitutionalDashboard> { return this.http.get<InstitutionalDashboard>(`${this.base}/${id}/dashboard`); }
  ranking(id: number): Observable<InstitutionalRanking> { return this.http.get<InstitutionalRanking>(`${this.base}/${id}/ranking`); }
  campaigns(id: number): Observable<InstitutionalCampaign[]> { return this.http.get<InstitutionalCampaign[]>(`${this.base}/${id}/campanas`); }
  createCampaign(id: number, dto: InstitutionalCampaignDraft): Observable<unknown> { return this.http.post(`${this.base}/${id}/campanas`, dto); }
  report(id: number): Observable<unknown> { return this.http.get(`${this.base}/${id}/reportes/desempeno-ambiental`); }
  groups(id: number): Observable<InstitutionalGroup[]> { return this.http.get<InstitutionalGroup[]>(`${this.base}/${id}/grupos`); }
  createGroup(id: number, dto: Pick<InstitutionalGroup, 'tipo' | 'nombre'>): Observable<InstitutionalGroup> { return this.http.post<InstitutionalGroup>(`${this.base}/${id}/grupos`, dto); }
  createInvite(id: number): Observable<InstitutionalInvite> { return this.http.post<InstitutionalInvite>(`${this.base}/${id}/invitaciones`, {}); }
  redeemInvite(codigo: string): Observable<{ usuarioId: number; institucionId: number; grupoId: number | null }> { return this.http.post<{ usuarioId: number; institucionId: number; grupoId: number | null }>(`${this.base}/afiliaciones`, { codigo }); }
}
