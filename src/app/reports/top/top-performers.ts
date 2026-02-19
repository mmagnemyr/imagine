import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  YouTubeService,
  VideoItem,
  AnalyticsRow,
} from '../../youtube/youtube.service';
import { today, daysAgo } from '../../utils/date-helpers';

interface RankedVideo {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  watchMinutes: number;
  likes: number;
  revenue: number;
}

type SortField = 'views' | 'revenue' | 'likes' | 'watchMinutes';

@Component({
  selector: 'app-top-performers',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './top-performers.html',
  styleUrl: './top-performers.scss',
})
export class TopPerformers implements OnInit {
  private readonly ytService = inject(YouTubeService);

  private readonly allVideos = signal<RankedVideo[]>([]);
  protected readonly sortField = signal<SortField>('views');
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');

  protected startDate = daysAgo(28);
  protected endDate = today();

  protected readonly sortedVideos = computed(() => {
    const field = this.sortField();
    return [...this.allVideos()].sort((a, b) => b[field] - a[field]);
  });

  protected readonly sortOptions: { label: string; value: SortField }[] = [
    { label: 'Views', value: 'views' },
    { label: 'Revenue', value: 'revenue' },
    { label: 'Likes', value: 'likes' },
    { label: 'Watch Time', value: 'watchMinutes' },
  ];

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    this.error.set('');

    try {
      const [videos, topReport] = await Promise.all([
        this.ytService.getVideos(50),
        this.ytService.getTopVideos(this.startDate, this.endDate, 50),
      ]);

      const videoMap = new Map<string, VideoItem>();
      for (const v of videos) {
        videoMap.set(v.id, v);
      }

      const ranked: RankedVideo[] = topReport.rows
        .map(row => {
          const id = String(row['video']);
          const meta = videoMap.get(id);
          return {
            id,
            title: meta?.title ?? id,
            thumbnail: meta?.thumbnail ?? '',
            views: Number(row['views']) || 0,
            watchMinutes: Number(row['estimatedMinutesWatched']) || 0,
            likes: Number(row['likes']) || 0,
            revenue: Number(row['estimatedRevenue']) || 0,
          };
        });

      this.allVideos.set(ranked);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load top videos';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  onDateChange() {
    this.loadData();
  }

  setSort(field: SortField) {
    this.sortField.set(field);
  }
}
