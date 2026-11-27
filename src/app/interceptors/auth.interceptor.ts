import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthTokenService } from '../services/auth-token.service';
import { LanguageService } from '../services/language.service';

const publicAuthPaths = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/recuperar-contrasena',
  '/auth/restablecer-contrasena',
]);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = environment.apiUrl;
  const isApiRequest = apiUrl
    ? request.url === apiUrl || request.url.startsWith(`${apiUrl}/`)
    : request.url.startsWith('/') && !request.url.startsWith('//');
  if (!isApiRequest) return next(request);

  const apiPath = (apiUrl ? request.url.slice(apiUrl.length) : request.url).split('?')[0];
  const activeLanguage = inject(LanguageService).active;
  const languageHeader = activeLanguage === 'en' ? 'en-US' : activeLanguage === 'pt-BR' ? 'pt-BR, es;q=0.8' : 'es-419';
  const headers: Record<string, string> = { 'Accept-Language': languageHeader };
  if (!publicAuthPaths.has(apiPath)) {
    const token = inject(AuthTokenService).getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return next(request.clone({ setHeaders: headers }));
};
