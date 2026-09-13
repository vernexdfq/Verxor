import type { RentalNumber, RentalPlan, RentalProvider } from './types';

/**
 * Single entry point for the Rental Line UI.
 *
 * Provider credentials and API calls belong behind this boundary. The UI must
 * never know which upstream provider supplied a number.
 */
let activeProvider: RentalProvider | null = null;

export function configureRentalProvider(provider: RentalProvider) {
  activeProvider = provider;
}

export function getRentalProvider(): RentalProvider {
  if (!activeProvider) {
    throw new Error('Rental provider is not configured');
  }
  return activeProvider;
}

export async function getRentalNumbers(countryId: string): Promise<RentalNumber[]> {
  return getRentalProvider().listNumbers(countryId);
}

export async function getRentalPlans(number: RentalNumber): Promise<RentalPlan[]> {
  return getRentalProvider().listPlans(number);
}
