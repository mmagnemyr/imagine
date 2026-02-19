import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YouTubeService, AnalyticsRow } from '../../youtube/youtube.service';
import { today, daysAgo } from '../../utils/date-helpers';

@Component({
  selector: 'app-growth-report',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './growth-report.html',
  styleUrl: './growth-report.scss',
})
export class GrowthReport implements OnInit {
  private readonly ytService = inject(YouTubeService);

  protected readonly rows = signal<AnalyticsRow[]>([]);
  protected readonly totalViews = signal(0);
  protected readonly totalWatchMinutes = signal(0);
  protected readonly totalSubsGained = signal(0);
  protected readonly totalSubsLost = signal(0);
  protected readonly netSubscribers = signal(0);
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
      const report = await this.ytService.getOverviewReport(
        this.startDate,
        this.endDate,
      );
      this.rows.set(report.rows);

      this.totalViews.set(
        report.rows.reduce(
          (sum, r) => sum + (Number(r['views']) || 0),
          0,
        ),
      );
      this.totalWatchMinutes.set(
        report.rows.reduce(
          (sum, r) => sum + (Number(r['estimatedMinutesWatched']) || 0),
          0,
        ),
      );

      const gained = report.rows.reduce(
        (sum, r) => sum + (Number(r['subscribersGained']) || 0),
        0,
      );
      const lost = report.rows.reduce(
        (sum, r) => sum + (Number(r['subscribersLost']) || 0),
        0,
      );
      this.totalSubsGained.set(gained);
      this.totalSubsLost.set(lost);
      this.netSubscribers.set(gained - lost);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load growth data';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  onDateChange() {
    this.loadData();
  }
}
