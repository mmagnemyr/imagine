import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  YouTubeService,
  ChannelStats,
  VideoItem,
  AnalyticsRow,
} from '../youtube/youtube.service';
import { today, daysAgo } from '../utils/date-helpers';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly ytService = inject(YouTubeService);

  protected readonly channel = signal<ChannelStats | null>(null);
  protected readonly videos = signal<VideoItem[]>([]);
  protected readonly revenueRows = signal<AnalyticsRow[]>([]);
  protected readonly totalRevenue = signal(0);
  protected readonly totalViews = signal(0);
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
      const [channelData, videosData, revenueData] = await Promise.all([
        this.ytService.getChannel(),
        this.ytService.getVideos(),
        this.ytService.getRevenueReport(this.startDate, this.endDate),
      ]);

      this.channel.set(channelData);
      this.videos.set(videosData);
      this.revenueRows.set(revenueData.rows);

      this.totalRevenue.set(
        revenueData.rows.reduce(
          (sum, r) => sum + (Number(r['estimatedRevenue']) || 0),
          0,
        ),
      );
      this.totalViews.set(
        revenueData.rows.reduce(
          (sum, r) => sum + (Number(r['views']) || 0),
          0,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load YouTube data';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  onDateChange() {
    this.loadData();
  }
}
