import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-pending-section',
  standalone: false,
  template: `<main class="pending-page"><section class="pending-card"><span class="pending-mark" aria-hidden="true">🌱</span><p class="eyebrow">{{ 'pending.eyebrow' | transloco }}</p><h1>{{ title }}</h1><p>{{ 'pending.description' | transloco }}</p><a routerLink="/dashboard">{{ 'pending.home' | transloco }}</a></section></main>`,
  styles: [`.pending-page{min-height:calc(100vh - 72px);display:grid;place-items:center;padding:28px}.pending-card{max-width:560px;padding:40px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;text-align:center;box-shadow:0 1px 3px #0000000f}.pending-mark{font-size:36px}.eyebrow{margin:15px 0 7px;color:#16a34a;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.pending-card h1{margin:0;color:#1b3a2f;font-size:1.7rem}.pending-card p:not(.eyebrow){color:#6b7280;line-height:1.6}.pending-card a{display:inline-block;margin-top:10px;padding:11px 16px;border-radius:8px;background:#22c55e;color:#fff;font-weight:600;text-decoration:none}@media(max-width:520px){.pending-card{padding:28px 20px}}`],
})
export class PendingSection {
  get title(): string { return String(this.route.snapshot.data['title'] ?? 'Sección'); }
  constructor(private readonly route: ActivatedRoute) {}
}
