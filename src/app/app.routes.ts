import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'welcome',
    loadComponent: () => import('./landing/landing').then(m => m.Landing),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home').then(m => m.Home),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
