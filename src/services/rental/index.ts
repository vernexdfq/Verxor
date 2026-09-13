export * from './types';
export * from './provider';

import type { RentalCountry, RentalNumber, RentalPlan, RentalProvider } from './types';

/**
 * Combines inventory from every configured upstream provider.
 * Duplicate phone numbers are removed by provider + number id.
 */
export class RentalProviderRegistry {
  private readonly providers: RentalProvider[];

  constructor(providers: RentalProvider[] = []) {
    this.providers = providers;
  }

  get all(): readonly RentalProvider[] {
    return this.providers;
  }

  async listCountries(): Promise<RentalCountry[]> {
    const results = await Promise.all(this.providers.map((provider) => provider.listCountries()));
    const byId = new Map<string, RentalCountry>();

    for (const countries of results) {
      for (const country of countries) {
        const key = country.iso2.toUpperCase();
        if (!byId.has(key) || country.available === 'available') byId.set(key, country);
      }
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async listNumbers(countryId: string): Promise<RentalNumber[]> {
    const results = await Promise.all(this.providers.map((provider) => provider.listNumbers(countryId)));
    return results.flat().filter((number) => number.availability === 'available');
  }

  async listPlans(number: RentalNumber): Promise<RentalPlan[]> {
    const provider = this.providers.find((item) => item.id === number.providerId);
    if (!provider) return [];
    return provider.listPlans(number);
  }
}
