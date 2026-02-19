import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';

@Component({
  selector: 'app-layout',
  imports: [DecimalPipe, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly exchangeRate = inject(ExchangeRateService);
  private readonly router = inject(Router);

  protected readonly navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Revenue', path: '/reports/revenue' },
    { label: 'Growth', path: '/reports/growth' },
    { label: 'Top Performers', path: '/reports/top' },
    { label: 'Shorts vs Videos', path: '/reports/format' },
    { label: 'Snapchat', path: '/snapchat' },
  ];

  ngOnInit() {
    this.exchangeRate.fetch();
  }

  async onLogout() {
    await this.authService.logout();
    this.router.navigate(['/welcome']);
  }
}
