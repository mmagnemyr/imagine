import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export interface ChannelStats {
  id: string;
  title: string;
  thumbnail: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

export interface AnalyticsRow {
  [key: string]: string | number;
}

export interface AnalyticsReport {
  columns: string[];
  rows: AnalyticsRow[];
}

const YT_DATA_BASE = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2';

@Injectable({ providedIn: 'root' })
export class YouTubeService {
  private readonly authService = inject(AuthService);

  async getChannel(): Promise<ChannelStats> {
    const data = await this.dataApi('/channels', {
      part: 'snippet,statistics',
      mine: 'true',
    });

    const ch = data.items?.[0];
    if (!ch) throw new Error('No YouTube channel found for this account.');

    return {
      id: ch.id,
      title: ch.snippet.title,
      thumbnail: ch.snippet.thumbnails?.default?.url ?? '',
      subscriberCount: Number(ch.statistics.subscriberCount),
      viewCount: Number(ch.statistics.viewCount),
      videoCount: Number(ch.statistics.videoCount),
    };
  }

  async getVideos(maxResults = 50): Promise<VideoItem[]> {
    // Step 1: Get uploads playlist ID
    const channelData = await this.dataApi('/channels', {
      part: 'contentDetails',
      mine: 'true',
    });
    const uploadsPlaylistId =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) throw new Error('No uploads playlist found.');

    // Step 2: Get playlist items
    const playlistData = await this.dataApi('/playlistItems', {
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: String(maxResults),
    });
    const videoIds = playlistData.items
      ?.map((item: any) => item.contentDetails.videoId)
      .join(',');
    if (!videoIds) return [];

    // Step 3: Get video details
    const videosData = await this.dataApi('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
    });

    return (videosData.items ?? []).map((v: any) => ({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails?.medium?.url ?? '',
      publishedAt: v.snippet.publishedAt,
      viewCount: Number(v.statistics.viewCount ?? 0),
      likeCount: Number(v.statistics.likeCount ?? 0),
      commentCount: Number(v.statistics.commentCount ?? 0),
      duration: v.contentDetails.duration,
    }));
  }

  async getVideoAnalytics(
    videoId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnalyticsReport> {
    return this.analyticsQuery({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics:
        'views,estimatedMinutesWatched,averageViewDuration,likes,subscribersGained,estimatedRevenue',
      dimensions: 'day',
      filters: `video==${videoId}`,
      sort: 'day',
    });
  }

  async getRevenueReport(
    startDate: string,
    endDate: string,
  ): Promise<AnalyticsReport> {
    return this.analyticsQuery({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics:
        'views,estimatedRevenue,estimatedAdRevenue,grossRevenue,cpm,monetizedPlaybacks',
      dimensions: 'day',
      sort: 'day',
    });
  }

  async getOverviewReport(
    startDate: string,
    endDate: string,
  ): Promise<AnalyticsReport> {
    return this.analyticsQuery({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics:
        'views,estimatedMinutesWatched,averageViewDuration,likes,subscribersGained,subscribersLost',
      dimensions: 'day',
      sort: 'day',
    });
  }

  async getTopVideos(
    startDate: string,
    endDate: string,
    maxResults = 20,
  ): Promise<AnalyticsReport> {
    return this.analyticsQuery({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,likes,estimatedRevenue',
      dimensions: 'video',
      sort: '-views',
      maxResults: String(maxResults),
    });
  }

  private async analyticsQuery(
    params: Record<string, string>,
  ): Promise<AnalyticsReport> {
    const data = await this.fetchWithAuth(YT_ANALYTICS_BASE + '/reports', params);

    const columns =
      data.columnHeaders?.map((h: any) => h.name as string) ?? [];
    const rows: AnalyticsRow[] = (data.rows ?? []).map((row: any[]) => {
      const obj: AnalyticsRow = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return { columns, rows };
  }

  private async dataApi(
    path: string,
    params: Record<string, string>,
  ): Promise<any> {
    return this.fetchWithAuth(YT_DATA_BASE + path, params);
  }

  private async fetchWithAuth(
    baseUrl: string,
    params: Record<string, string>,
  ): Promise<any> {
    let token = this.authService.googleAccessToken();

    if (!token) {
      token = await this.authService.refreshGoogleToken();
    }

    let response = await this.doFetch(baseUrl, params, token);

    // Token expired — refresh and retry once
    if (response.status === 401) {
      token = await this.authService.refreshGoogleToken();
      response = await this.doFetch(baseUrl, params, token);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error?.error?.message ?? `YouTube API error: ${response.status}`,
      );
    }

    return response.json();
  }

  private doFetch(
    baseUrl: string,
    params: Record<string, string>,
    token: string,
  ): Promise<Response> {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
