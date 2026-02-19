import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  YouTubeService,
  VideoItem,
  AnalyticsRow,
} from '../youtube/youtube.service';

@Component({
  selector: 'app-video-detail',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './video-detail.html',
  styleUrl: './video-detail.scss',
})
export class VideoDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ytService = inject(YouTubeService);

  protected readonly video = signal<VideoItem | null>(null);
  protected readonly analyticsRows = signal<AnalyticsRow[]>([]);
  protected readonly totalRevenue = signal(0);
  protected readonly totalWatchMinutes = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');

  async ngOnInit() {
    const videoId = this.route.snapshot.paramMap.get('id');
    if (!videoId) return;

    this.isLoading.set(true);
    this.error.set('');

    try {
      // Get video metadata
      const videos = await this.ytService.getVideos(50);
      const found = videos.find(v => v.id === videoId);
      this.video.set(found ?? null);

      // Get analytics for last 90 days
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);

      const analytics = await this.ytService.getVideoAnalytics(
        videoId,
        startDate,
        endDate,
      );
      this.analyticsRows.set(analytics.rows);

      this.totalRevenue.set(
        analytics.rows.reduce(
          (sum, r) => sum + (Number(r['estimatedRevenue']) || 0),
          0,
        ),
      );
      this.totalWatchMinutes.set(
        analytics.rows.reduce(
          (sum, r) => sum + (Number(r['estimatedMinutesWatched']) || 0),
          0,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load video data';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
