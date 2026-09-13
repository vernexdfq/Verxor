export type RentalNumberType = 'VoIP' | 'Non-VoIP' | 'Unknown';

export type RentalCapability = 'voice' | 'sms';

export type RentalAvailability = 'available' | 'unavailable' | 'unknown';

export interface RentalCountry {
  id: string;
  name: string;
  iso2: string;
  dialCode: string;
  flag?: string;
  available: RentalAvailability;
}

export interface RentalNumber {
  id: string;
  providerId: string;
  countryId: string;
  phoneNumber: string;
  type: RentalNumberType;
  capabilities: RentalCapability[];
  availability: RentalAvailability;
  currency: string;
  prices: Record<string, number>;
}

export interface RentalPlan {
  id: string;
  label: string;
  durationDays: number;
  currency: string;
  price: number;
}

export interface RentalOrderRequest {
  providerId: string;
  numberId: string;
  planId: string;
}

export interface RentalOrder {
  id: string;
  providerId: string;
  numberId: string;
  phoneNumber: string;
  planId: string;
  status: 'pending' | 'active' | 'expired' | 'failed';
  startedAt?: string;
  expiresAt?: string;
}

export interface RentalProvider {
  readonly id: string;
  readonly name: string;
  listCountries(): Promise<RentalCountry[]>;
  listNumbers(countryId: string): Promise<RentalNumber[]>;
  listPlans(number: RentalNumber): Promise<RentalPlan[]>;
  createRental(request: RentalOrderRequest): Promise<RentalOrder>;
}
