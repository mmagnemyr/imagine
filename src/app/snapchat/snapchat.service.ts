import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

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

export interface SavedSnapReport {
  docId: string;
  report: SnapReport;
}

@Injectable({ providedIn: 'root' })
export class SnapchatService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

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

  async saveReport(report: SnapReport): Promise<string> {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) throw new Error('Not authenticated');

    const ref = collection(this.firestore, 'snapReports');
    const docRef = await addDoc(ref, {
      report,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  watchReports(): Observable<SavedSnapReport[]> {
    const ref = collection(this.firestore, 'snapReports');
    const q = query(ref, orderBy('createdAt', 'desc'));

    return new Observable<SavedSnapReport[]>(subscriber => {
      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const reports = snapshot.docs.map(d => ({
            docId: d.id,
            report: d.data()['report'] as SnapReport,
          }));
          subscriber.next(reports);
        },
        error => subscriber.error(error),
      );
      return unsubscribe;
    });
  }

  async deleteReport(docId: string): Promise<void> {
    const ref = doc(this.firestore, 'snapReports', docId);
    await deleteDoc(ref);
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
