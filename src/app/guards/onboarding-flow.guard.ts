import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { OnboardingService } from '../services/onboarding.service';

export const onboardingFlowGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const onboarding = inject(OnboardingService);
  const destination = route.data['flow'] as 'onboarding' | 'dashboard';

  return onboarding.getInitialState().pipe(
    map((state) => {
      if (destination === 'dashboard' && !state.complete) return router.createUrlTree(['/onboarding']);
      if (destination === 'onboarding' && state.complete) return router.createUrlTree(['/dashboard']);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/login'], { queryParams: { revisarSesion: '1' } }))),
  );
};
