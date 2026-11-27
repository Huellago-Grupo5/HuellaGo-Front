import { Injector, runInInjectionContext } from '@angular/core';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokenService } from '../services/auth-token.service';
import { LanguageService } from '../services/language.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  async function interceptedRequest(url: string, token: string | null, language: string) {
    const injector = Injector.create({ providers: [
      { provide: AuthTokenService, useValue: { getToken: () => token } },
      { provide: LanguageService, useValue: { active: language } },
    ] });
    let forwarded: HttpRequest<unknown> | undefined;
    await firstValueFrom(runInInjectionContext(injector, () => authInterceptor(
      new HttpRequest('GET', url),
      (request) => { forwarded = request; return of(new HttpResponse({ status: 200 })); },
    )));
    injector.destroy();
    return forwarded;
  }

  it('sends the JWT and selected language only to protected API requests', async () => {
    const request = await interceptedRequest(`${environment.apiUrl}/dashboard`, 'jwt-test', 'en');
    expect(request?.headers.get('Authorization')).toBe('Bearer jwt-test');
    expect(request?.headers.get('Accept-Language')).toBe('en-US');
  });

  it('localizes public authentication requests without attaching the JWT', async () => {
    const request = await interceptedRequest(`${environment.apiUrl}/auth/login`, 'jwt-test', 'pt-BR');
    expect(request?.headers.get('Authorization')).toBeNull();
    expect(request?.headers.get('Accept-Language')).toBe('pt-BR, es;q=0.8');
  });

  it('does not attach API headers to static translation files', async () => {
    const request = await interceptedRequest('assets/i18n/en.json', 'jwt-test', 'en');
    expect(request?.headers.get('Authorization')).toBeNull();
    expect(request?.headers.get('Accept-Language')).toBeNull();
  });
});
