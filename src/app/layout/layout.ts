import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Revenue', path: '/reports/revenue' },
    { label: 'Growth', path: '/reports/growth' },
    { label: 'Top Performers', path: '/reports/top' },
    { label: 'Shorts vs Videos', path: '/reports/format' },
    { label: 'Snapchat', path: '/snapchat' },
  ];

  async onLogout() {
    await this.authService.logout();
    this.router.navigate(['/welcome']);
  }
}
