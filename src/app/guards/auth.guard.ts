import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenService } from '../services/auth-token.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const tokenStorage = inject(AuthTokenService);
  const router = inject(Router);

  if (tokenStorage.hasUsableToken()) return true;

  tokenStorage.clearSession();
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
