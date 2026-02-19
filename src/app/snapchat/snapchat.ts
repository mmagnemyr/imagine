import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  SnapchatService,
  SnapReport,
  SavedSnapReport,
  SpotlightReport,
  SavedStoryReport,
} from './snapchat.service';

@Component({
  selector: 'app-snapchat',
  imports: [DecimalPipe],
  templateUrl: './snapchat.html',
  styleUrl: './snapchat.scss',
})
export class Snapchat implements OnInit {
  private readonly snapService = inject(SnapchatService);

  protected readonly savedReports = signal<SavedSnapReport[]>([]);
  protected readonly error = signal('');
  protected readonly isLoading = signal(true);
  protected readonly isDragging = signal(false);

  async ngOnInit() {
    await this.loadSaved();
  }

  private async loadSaved() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const reports = await this.snapService.loadReports();
      this.savedReports.set(reports);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load saved reports';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files);
    }
  }

  private async processFiles(files: FileList) {
    this.error.set('');

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.json')) {
        this.error.set(`"${file.name}" is not a JSON file.`);
        continue;
      }

      try {
        const text = await file.text();
        const report = this.snapService.parseJson(text);
        const docId = await this.snapService.saveReport(report);
        this.savedReports.update(list => [{ docId, report }, ...list]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to parse file';
        this.error.set(`${file.name}: ${message}`);
      }
    }
  }

  async removeReport(docId: string) {
    this.error.set('');
    try {
      await this.snapService.deleteReport(docId);
      this.savedReports.update(list => list.filter(r => r.docId !== docId));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete report';
      this.error.set(message);
    }
  }

  asSpotlight(report: SnapReport): SpotlightReport {
    return report as SpotlightReport;
  }

  asSavedStory(report: SnapReport): SavedStoryReport {
    return report as SavedStoryReport;
  }
}
