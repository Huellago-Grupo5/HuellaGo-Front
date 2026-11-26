import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthTokenService } from '../services/auth-token.service';

const publicAuthPaths = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/recuperar-contrasena',
  '/auth/restablecer-contrasena',
]);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiUrl)) return next(request);

  const apiPath = request.url.slice(environment.apiUrl.length).split('?')[0];
  if (publicAuthPaths.has(apiPath)) return next(request);

  const token = inject(AuthTokenService).getToken();
  if (!token) return next(request);

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
