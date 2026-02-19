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
    loadComponent: () => import('./layout/layout').then(m => m.Layout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'video/:id',
        loadComponent: () =>
          import('./video-detail/video-detail').then(m => m.VideoDetail),
      },
      {
        path: 'reports/revenue',
        loadComponent: () =>
          import('./reports/revenue/revenue-report').then(
            m => m.RevenueReport,
          ),
      },
      {
        path: 'reports/growth',
        loadComponent: () =>
          import('./reports/growth/growth-report').then(m => m.GrowthReport),
      },
      {
        path: 'reports/top',
        loadComponent: () =>
          import('./reports/top/top-performers').then(m => m.TopPerformers),
      },
      {
        path: 'reports/format',
        loadComponent: () =>
          import('./reports/format/format-comparison').then(
            m => m.FormatComparison,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
