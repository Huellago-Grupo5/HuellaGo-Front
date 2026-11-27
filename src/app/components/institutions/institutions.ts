import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { InstitutionCreate, InstitutionalCampaignDraft, InstitutionalCampaign, InstitutionalDashboard, InstitutionalGroup, InstitutionalInvite, InstitutionLink, InstitutionalRanking, InstitutionsService } from '../../services/institutions.service';
import { TranslocoService } from '@jsverse/transloco';

@Component({ selector: 'app-institutions', standalone: false, templateUrl: './institutions.html', styleUrl: './institutions.css' })
export class Institutions implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  links: InstitutionLink[] = [];
  selectedId: number | null = null;
  dashboard: InstitutionalDashboard | null = null;
  ranking: InstitutionalRanking | null = null;
  campaigns: InstitutionalCampaign[] = [];
  groups: InstitutionalGroup[] = [];
  invitation: InstitutionalInvite | null = null;
  invitationCode = '';
  report: unknown = null;
  loading = false;
  saving = false;
  error = '';
  message = '';
  draft: InstitutionCreate = { tipo: 'UNIVERSIDAD', nombre: '', pais: '', identificadorFiscal: '', correoContacto: '' };
  campaign: InstitutionalCampaignDraft = { nombre: '', objetivo: '', fechaInicio: '', fechaFin: '', metaCantidad: 1, unidadMedida: 'acciones' };
  group: Pick<InstitutionalGroup, 'tipo' | 'nombre'> = { tipo: 'EQUIPO', nombre: '' };
  constructor(private readonly api: InstitutionsService, private readonly i18n: TranslocoService) {}
  ngOnInit(): void { this.load(); }
  get selected(): InstitutionLink | undefined { return this.links.find(x => x.id === this.selectedId); }
  get isAdmin(): boolean { return this.selected?.rol === 'ADMIN_INSTITUCIONAL'; }
  load(): void {
    this.loading = true; this.error = '';
    this.api.mine().pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: links => { this.links = links; this.selectedId = this.selectedId && links.some(x => x.id === this.selectedId) ? this.selectedId : links.find(x => x.rol === 'ADMIN_INSTITUCIONAL')?.id ?? links[0]?.id ?? null; if (this.isAdmin) this.loadAdminData(); this.cdr.markForCheck(); },
      error: () => { this.error = this.i18n.translate('institutions.loadError'); this.cdr.markForCheck(); },
    });
  }
  select(id: number): void { this.selectedId = id; this.dashboard = this.ranking = null; this.campaigns = []; if (this.isAdmin) this.loadAdminData(); }
  create(): void {
    if (this.saving) return;
    if (!this.draft.nombre.trim() || !/^[a-z]{2}$/i.test(this.draft.pais) || !/^[a-z0-9][a-z0-9.-]{4,29}$/i.test(this.draft.identificadorFiscal) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.draft.correoContacto)) { this.error = this.i18n.translate('institutions.createValidation'); return; }
    this.saving = true; this.error = ''; this.message = '';
    this.api.create({ ...this.draft, nombre: this.draft.nombre.trim(), pais: this.draft.pais.toUpperCase(), identificadorFiscal: this.draft.identificadorFiscal.trim().toUpperCase(), correoContacto: this.draft.correoContacto.trim() }).pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); })).subscribe({
      next: created => { this.message = this.i18n.translate('institutions.created'); this.links = [...this.links, created]; this.selectedId = created.id; this.loadAdminData(); this.cdr.markForCheck(); },
      error: e => { this.error = e?.error?.mensaje ?? this.i18n.translate('institutions.createError'); this.cdr.markForCheck(); },
    });
  }
  private loadAdminData(): void {
    if (!this.selectedId || !this.isAdmin) return;
    const id = this.selectedId;
    forkJoin({ dashboard: this.api.dashboard(id), ranking: this.api.ranking(id), campaigns: this.api.campaigns(id), groups: this.api.groups(id) }).subscribe({
      next: data => { if (id !== this.selectedId) return; this.dashboard = data.dashboard; this.ranking = data.ranking; this.campaigns = data.campaigns; this.groups = data.groups; this.cdr.markForCheck(); },
      error: e => { this.error = e?.error?.mensaje ?? this.i18n.translate('institutions.loadError'); this.cdr.markForCheck(); },
    });
  }
  createCampaign(): void {
    if (!this.selectedId || !this.isAdmin || this.saving) return;
    if (!this.campaign.nombre.trim() || !this.campaign.objetivo.trim() || !this.campaign.fechaInicio || !this.campaign.fechaFin || this.campaign.fechaFin < this.campaign.fechaInicio || this.campaign.metaCantidad <= 0 || !this.campaign.unidadMedida.trim()) {
      this.error = this.i18n.translate('institutions.campaignValidation'); return;
    }
    this.saving = true; this.error = '';
    this.api.createCampaign(this.selectedId, { ...this.campaign, nombre: this.campaign.nombre.trim(), objetivo: this.campaign.objetivo.trim(), unidadMedida: this.campaign.unidadMedida.trim() })
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({ next: () => { this.message = this.i18n.translate('institutions.campaignCreated'); this.loadAdminData(); }, error: e => { this.error = e?.error?.mensaje ?? this.i18n.translate('institutions.campaignError'); this.cdr.markForCheck(); } });
  }
  loadReport(): void {
    if (!this.selectedId || !this.isAdmin) return;
    this.api.report(this.selectedId).subscribe({ next: value => { this.report = value; this.cdr.markForCheck(); }, error: e => { this.error = e?.error?.mensaje ?? this.i18n.translate('institutions.reportError'); this.cdr.markForCheck(); } });
  }
  createGroup(): void {
    if (!this.selectedId || !this.isAdmin || this.saving || !this.group.nombre.trim()) return;
    this.saving = true; this.error = '';
    this.api.createGroup(this.selectedId, { ...this.group, nombre: this.group.nombre.trim() })
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({ next: () => { this.message = this.i18n.translate('institutions.groupCreated'); this.group = { tipo: 'EQUIPO', nombre: '' }; this.loadAdminData(); }, error: e => { this.error = e?.error?.mensaje ?? this.i18n.translate('institutions.groupError'); this.cdr.markForCheck(); } });
  }
  createInvite(): void {
    if (!this.selectedId || !this.isAdmin) return;
    this.api.createInvite(this.selectedId).subscribe({ next: invitation => { this.invitation = invitation; this.message = this.i18n.translate('institutions.inviteCreated'); this.cdr.markForCheck(); }, error: e => { this.error = e?.error?.mensaje ?? this.i18n.translate('institutions.inviteError'); this.cdr.markForCheck(); } });
  }
  redeemInvite(): void {
    const code = this.invitationCode.trim();
    if (!code) return;
    this.saving = true; this.error = '';
    this.api.redeemInvite(code).pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({ next: () => { this.invitationCode = ''; this.message = this.i18n.translate('institutions.joined'); this.load(); }, error: e => { this.error = e?.error?.mensaje ?? this.i18n.translate('institutions.inviteError'); this.cdr.markForCheck(); } });
  }
}
