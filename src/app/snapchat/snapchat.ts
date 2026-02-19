import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  SnapchatService,
  SnapReport,
  SpotlightReport,
  SavedStoryReport,
} from './snapchat.service';

@Component({
  selector: 'app-snapchat',
  imports: [DecimalPipe],
  templateUrl: './snapchat.html',
  styleUrl: './snapchat.scss',
})
export class Snapchat {
  private readonly snapService = inject(SnapchatService);

  protected readonly reports = signal<SnapReport[]>([]);
  protected readonly error = signal('');
  protected readonly isDragging = signal(false);

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
        this.reports.update(list => [...list, report]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to parse file';
        this.error.set(`${file.name}: ${message}`);
      }
    }
  }

  removeReport(index: number) {
    this.reports.update(list => list.filter((_, i) => i !== index));
  }

  asSpotlight(report: SnapReport): SpotlightReport {
    return report as SpotlightReport;
  }

  asSavedStory(report: SnapReport): SavedStoryReport {
    return report as SavedStoryReport;
  }
}
