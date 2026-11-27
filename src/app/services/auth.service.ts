import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest } from '../models/auth/login-request.model';
import { PasswordRecoveryRequest } from '../models/auth/password-recovery-request.model';
import { PasswordRecoveryResponse } from '../models/auth/password-recovery-response.model';
import { RegistrationRequest } from '../models/auth/registration-request.model';
import { TokenResponse } from '../models/auth/token-response.model';
import { UserResponse } from '../models/auth/user-response.model';
import { AuthTokenService } from './auth-token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: AuthTokenService,
  ) {}

  login(request: LoginRequest): Observable<TokenResponse> {
    this.tokenStorage.clearSession();
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap((response) => this.tokenStorage.saveSession(response)),
    );
  }

  register(request: RegistrationRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/auth/register`, request);
  }

  requestPasswordRecovery(request: PasswordRecoveryRequest): Observable<PasswordRecoveryResponse> {
    return this.http.post<PasswordRecoveryResponse>(
      `${this.apiUrl}/auth/recuperar-contrasena`,
      request,
    );
  }

  logout(): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/auth/logout`, null);
  }

  resetPassword(token: string, nuevaContrasena: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/restablecer-contrasena`, { token, nuevaContrasena });
  }
}
