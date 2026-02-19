import { Injectable, signal, OnDestroy } from '@angular/core';

export interface ExchangeRate {
  rate: number;
  date: string;
}

const REFRESH_MS = 4 * 60 * 60 * 1000; // 4 hours

@Injectable({ providedIn: 'root' })
export class ExchangeRateService implements OnDestroy {
  readonly usdSek = signal<ExchangeRate | null>(null);
  private intervalId?: ReturnType<typeof setInterval>;

  startPolling(): void {
    this.fetch();
    this.intervalId = setInterval(() => this.fetch(), REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async fetch(): Promise<void> {
    try {
      const res = await fetch(
        'https://api.frankfurter.dev/v1/latest?from=USD&to=SEK',
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        date: string;
        rates: { SEK: number };
      };

      this.usdSek.set({ rate: data.rates.SEK, date: data.date });
    } catch {
      // Silently ignore network errors; keep last known rate
    }
  }
}
