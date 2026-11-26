import { Injectable } from '@angular/core';
import { TokenResponse } from '../models/auth/token-response.model';

const TOKEN_KEY = 'huellago.auth.token';
const USER_ID_KEY = 'huellago.auth.userId';
const EMAIL_KEY = 'huellago.auth.email';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  getToken(): string | null {
    return this.read(TOKEN_KEY);
  }

  getUserId(): number | null {
    const storedId = this.read(USER_ID_KEY);
    if (!storedId) return null;

    const userId = Number(storedId);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  }

  getEmail(): string | null {
    return this.read(EMAIL_KEY);
  }

  saveSession(response: TokenResponse): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_ID_KEY, String(response.id));
    localStorage.setItem(EMAIL_KEY, response.correo);
  }

  hasUsableToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = token.split('.')[1];
      if (!payload) return false;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const claims = JSON.parse(atob(padded)) as { exp?: number };
      return typeof claims.exp === 'number' && claims.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  clearSession(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }

  private read(key: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }
}
