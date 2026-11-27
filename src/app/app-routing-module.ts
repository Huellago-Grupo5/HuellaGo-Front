import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Register } from './components/auth/register/register';
import { ResetPassword } from './components/auth/reset-password/reset-password';
import { Home } from './components/home/home';
import { authGuard } from './guards/auth.guard';
import { onboardingFlowGuard } from './guards/onboarding-flow.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home },
  { path: 'login', component: Login },
  { path: 'registro', component: Register },
  { path: 'restablecer-contrasena', component: ResetPassword },
  { path: 'onboarding', canActivate: [authGuard, onboardingFlowGuard], data: { flow: 'onboarding' }, loadChildren: () => import('./modules/onboarding/onboarding.module').then(m => m.OnboardingModule) },
  { path: '', canActivate: [authGuard], loadChildren: () => import('./modules/customer/customer.module').then(m => m.CustomerModule) },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
