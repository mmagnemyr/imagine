import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { YouTubeService, VideoItem } from '../../youtube/youtube.service';
import { parseDurationSeconds } from '../../utils/date-helpers';

interface FormatStats {
  count: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgViews: number;
  avgLikes: number;
}

@Component({
  selector: 'app-format-comparison',
  imports: [DecimalPipe],
  templateUrl: './format-comparison.html',
  styleUrl: './format-comparison.scss',
})
export class FormatComparison implements OnInit {
  private readonly ytService = inject(YouTubeService);

  private readonly allVideos = signal<VideoItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');

  protected readonly shorts = computed(() =>
    this.allVideos().filter(v => this.isShort(v)),
  );

  protected readonly regular = computed(() =>
    this.allVideos().filter(v => !this.isShort(v)),
  );

  protected readonly shortsStats = computed(() =>
    this.calcStats(this.shorts()),
  );

  protected readonly regularStats = computed(() =>
    this.calcStats(this.regular()),
  );

  async ngOnInit() {
    this.isLoading.set(true);
    this.error.set('');

    try {
      const videos = await this.ytService.getVideos(50);
      this.allVideos.set(videos);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load videos';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private isShort(video: VideoItem): boolean {
    if (video.title.toLowerCase().includes('#shorts')) return true;
    return parseDurationSeconds(video.duration) < 60;
  }

  private calcStats(videos: VideoItem[]): FormatStats {
    const count = videos.length;
    const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
    const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
    const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
    return {
      count,
      totalViews,
      totalLikes,
      totalComments,
      avgViews: count ? Math.round(totalViews / count) : 0,
      avgLikes: count ? Math.round(totalLikes / count) : 0,
    };
  }
}
