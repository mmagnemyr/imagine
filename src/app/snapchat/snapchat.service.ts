import { Injectable } from '@angular/core';

export interface SpotlightRow {
  id: string;
  startTime: string;
  endTime: string;
  views: number;
  uniques: number;
  shares: number;
  favorites: number;
  subsGained: number;
  paidViews: number;
}

export interface SpotlightReport {
  type: 'spotlight';
  summary: SpotlightRow;
  items: SpotlightRow[];
}

export interface SavedStoryRow {
  id: string;
  startTime: string;
  endTime: string;
  views: number;
  uniques: number;
  avgViewTimeSec: number;
  paidViews: number;
}

export interface SavedStoryReport {
  type: 'savedStory';
  summary: SavedStoryRow;
  items: SavedStoryRow[];
}

export type SnapReport = SpotlightReport | SavedStoryReport;

@Injectable({ providedIn: 'root' })
export class SnapchatService {
  parseJson(raw: string): SnapReport {
    const data = JSON.parse(raw) as Record<string, string>[];
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid file: expected a non-empty JSON array.');
    }

    const first = data[0];

    if ('Spotlight Combined Views' in first) {
      return this.parseSpotlight(data);
    }
    if ('Saved Story Snap Combined Views' in first) {
      return this.parseSavedStories(data);
    }

    throw new Error(
      'Unrecognized format. Expected a Spotlight or Saved Stories export.',
    );
  }

  private parseSpotlight(data: Record<string, string>[]): SpotlightReport {
    const rows: SpotlightRow[] = data.map(r => ({
      id: r['Spotlight Id'] || '',
      startTime: r['Start Time'] || '',
      endTime: r['End Time'] || '',
      views: Number(r['Spotlight Combined Views']) || 0,
      uniques: Number(r['Spotlight Combined Uniques']) || 0,
      shares: Number(r['Spotlight Shares']) || 0,
      favorites: Number(r['Spotlight Favorites']) || 0,
      subsGained: Number(r['Spotlight Subscribers Gained']) || 0,
      paidViews: Number(r['Spotlight Paid Views']) || 0,
    }));

    const summaryRow = rows.find(r => r.id === '');
    const items = rows
      .filter(r => r.id !== '')
      .sort((a, b) => b.views - a.views);

    const summary: SpotlightRow = summaryRow ?? {
      id: '',
      startTime: '',
      endTime: '',
      views: items.reduce((s, r) => s + r.views, 0),
      uniques: items.reduce((s, r) => s + r.uniques, 0),
      shares: items.reduce((s, r) => s + r.shares, 0),
      favorites: items.reduce((s, r) => s + r.favorites, 0),
      subsGained: items.reduce((s, r) => s + r.subsGained, 0),
      paidViews: items.reduce((s, r) => s + r.paidViews, 0),
    };

    return { type: 'spotlight', summary, items };
  }

  private parseSavedStories(
    data: Record<string, string>[],
  ): SavedStoryReport {
    const rows: SavedStoryRow[] = data.map(r => ({
      id: r['Highlight Id'] || '',
      startTime: r['Start Time'] || '',
      endTime: r['End Time'] || '',
      views: Number(r['Saved Story Snap Combined Views']) || 0,
      uniques: Number(r['Saved Story Snap Combined Uniques']) || 0,
      avgViewTimeSec: Number(r['Highlight Avg View Time Seconds']) || 0,
      paidViews: Number(r['Saved Story Snap Paid Views']) || 0,
    }));

    const summaryRow = rows.find(r => r.id === '');
    const items = rows
      .filter(r => r.id !== '')
      .sort((a, b) => b.views - a.views);

    const summary: SavedStoryRow = summaryRow ?? {
      id: '',
      startTime: '',
      endTime: '',
      views: items.reduce((s, r) => s + r.views, 0),
      uniques: items.reduce((s, r) => s + r.uniques, 0),
      avgViewTimeSec: 0,
      paidViews: items.reduce((s, r) => s + r.paidViews, 0),
    };

    return { type: 'savedStory', summary, items };
  }
}
