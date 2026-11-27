import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Onboarding } from '../../components/onboarding/onboarding';

const routes: Routes = [{ path: '', component: Onboarding }];

@NgModule({
  declarations: [Onboarding],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslocoModule, RouterModule.forChild(routes)],
})
export class OnboardingModule {}
