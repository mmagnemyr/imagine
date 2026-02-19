import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YouTubeService, AnalyticsRow } from '../../youtube/youtube.service';
import { today, daysAgo } from '../../utils/date-helpers';

@Component({
  selector: 'app-revenue-report',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './revenue-report.html',
  styleUrl: './revenue-report.scss',
})
export class RevenueReport implements OnInit {
  private readonly ytService = inject(YouTubeService);

  protected readonly rows = signal<AnalyticsRow[]>([]);
  protected readonly totalRevenue = signal(0);
  protected readonly totalAdRevenue = signal(0);
  protected readonly avgCpm = signal(0);
  protected readonly totalMonetizedPlaybacks = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');

  protected startDate = daysAgo(28);
  protected endDate = today();

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    this.error.set('');

    try {
      const report = await this.ytService.getRevenueReport(
        this.startDate,
        this.endDate,
      );
      this.rows.set(report.rows);

      this.totalRevenue.set(
        report.rows.reduce(
          (sum, r) => sum + (Number(r['estimatedRevenue']) || 0),
          0,
        ),
      );
      this.totalAdRevenue.set(
        report.rows.reduce(
          (sum, r) => sum + (Number(r['estimatedAdRevenue']) || 0),
          0,
        ),
      );
      this.totalMonetizedPlaybacks.set(
        report.rows.reduce(
          (sum, r) => sum + (Number(r['monetizedPlaybacks']) || 0),
          0,
        ),
      );

      const cpmValues = report.rows
        .map(r => Number(r['cpm']) || 0)
        .filter(v => v > 0);
      this.avgCpm.set(
        cpmValues.length
          ? cpmValues.reduce((a, b) => a + b, 0) / cpmValues.length
          : 0,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load revenue data';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  onDateChange() {
    this.loadData();
  }
}
