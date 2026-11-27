import { Injectable } from '@angular/core';
import { VisualPreferences } from '../models/profile-notification.model';

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  private value: VisualPreferences = { tema: 'claro', unidades: 'metric' };
  get preferences(): VisualPreferences { return this.value; }

  apply(preferences: VisualPreferences): void {
    this.value = { ...preferences };
    if (typeof document !== 'undefined') document.documentElement.dataset['theme'] = preferences.tema;
  }

  toDisplay(value: number, unit: string): number {
    if (this.value.unidades !== 'imperial') return value;
    if (/^kg\b/i.test(unit)) return value * 2.2046226218;
    if (/^km\b/i.test(unit)) return value * 0.6213711922;
    return value;
  }

  toStorage(value: number, unit: string): number {
    if (this.value.unidades !== 'imperial') return value;
    if (/^kg\b/i.test(unit)) return value / 2.2046226218;
    if (/^km\b/i.test(unit)) return value / 0.6213711922;
    return value;
  }

  displayUnit(unit: string): string {
    if (this.value.unidades !== 'imperial') return unit;
    if (/^kg\b/i.test(unit)) return unit.replace(/^kg/i, 'lb');
    if (/^km\b/i.test(unit)) return unit.replace(/^km/i, 'mi');
    return unit;
  }

  format(value: number | null | undefined, unit: string): string {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const amount = this.toDisplay(Number(value), unit);
    const suffix = this.displayUnit(unit);
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)} ${suffix}`;
  }
}
