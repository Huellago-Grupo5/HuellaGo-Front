import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Login } from './components/auth/login/login';
import { Register } from './components/auth/register/register';
import { ResetPassword } from './components/auth/reset-password/reset-password';
import { authInterceptor } from './interceptors/auth.interceptor';
import { Home } from './components/home/home';
import { TranslocoRootModule } from './i18n/transloco-root.module';

@NgModule({
  declarations: [
    App,
    Login,
    Register,
    ResetPassword,
    Home,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoRootModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App]
})
export class AppModule { }
