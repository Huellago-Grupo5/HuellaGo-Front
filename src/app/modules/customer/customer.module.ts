import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Dashboard } from '../../components/dashboard/dashboard';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';
import { PendingSection } from '../../components/dashboard/pending-section';
import { Footprint } from '../../components/footprint/footprint';
import { Habits } from '../../components/habits/habits';
import { Challenges } from '../../components/challenges/challenges';
import { ChallengeDetail } from '../../components/challenges/challenge-detail';
import { CollectiveChallenges } from '../../components/challenges/collective-challenges';
import { Recomendaciones } from '../../components/recomendaciones/recomendaciones';
import { Ranking } from '../../components/ranking/ranking';
import { Insignias } from '../../components/insignias/insignias';
import { Profile } from '../../components/profile/profile';
import { onboardingFlowGuard } from '../../guards/onboarding-flow.guard';
import { Institutions } from '../../components/institutions/institutions';

const protectedPage = { canActivate: [onboardingFlowGuard], data: { flow: 'dashboard' } };
const routes: Routes = [{ path: '', component: DashboardShell, children: [
  { path: 'dashboard', component: Dashboard, ...protectedPage },
  { path: 'mi-huella', component: Footprint, ...protectedPage },
  { path: 'actualizar-habitos', component: Habits, ...protectedPage },
  { path: 'retos', component: Challenges, ...protectedPage },
  { path: 'recomendaciones', component: Recomendaciones, ...protectedPage },
  { path: 'ranking', component: Ranking, ...protectedPage },
  { path: 'insignias', component: Insignias, ...protectedPage },
  { path: 'perfil', component: Profile, ...protectedPage },
  { path: 'instituciones', component: Institutions, ...protectedPage },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
]}];

@NgModule({
  declarations: [Dashboard, DashboardShell, PendingSection, Footprint, Habits, Challenges,
    ChallengeDetail, CollectiveChallenges, Recomendaciones, Ranking, Insignias, Profile, Institutions],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslocoModule, RouterModule.forChild(routes)],
})
export class CustomerModule {}
