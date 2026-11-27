import { Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type HuellaGoLanguage = 'es' | 'en' | 'pt-BR';

const LANGUAGE_STORAGE_KEY = 'huellago.language';
const VALID_LANGUAGES: HuellaGoLanguage[] = ['es', 'en', 'pt-BR'];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  constructor(private readonly transloco: TranslocoService) {
    const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lang = VALID_LANGUAGES.includes(stored as HuellaGoLanguage) ? stored as HuellaGoLanguage : 'es';
    this.transloco.setActiveLang(lang);
  }

  get active(): HuellaGoLanguage {
    const lang = this.transloco.getActiveLang();
    return VALID_LANGUAGES.includes(lang as HuellaGoLanguage) ? lang as HuellaGoLanguage : 'es';
  }

  get label(): string {
    return this.active === 'en' ? 'English' : this.active === 'pt-BR' ? 'Português' : 'Español';
  }

  setLanguage(lang: HuellaGoLanguage): void {
    if (!VALID_LANGUAGES.includes(lang)) return;
    this.transloco.setActiveLang(lang);
    if (typeof localStorage !== 'undefined') localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }
}
