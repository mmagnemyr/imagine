import { Injectable, signal } from '@angular/core';

export interface ExchangeRate {
  rate: number;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  readonly usdSek = signal<ExchangeRate | null>(null);

  async fetch(): Promise<void> {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?from=USD&to=SEK',
    );
    if (!res.ok) return;

    const data = (await res.json()) as {
      date: string;
      rates: { SEK: number };
    };

    this.usdSek.set({ rate: data.rates.SEK, date: data.date });
  }
}
