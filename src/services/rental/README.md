# Verxor Rental Line provider layer

The Rental Line product is provider-agnostic by design.

## Boundary

`Rental UI → RentalProvider / RentalProviderRegistry → Provider Adapter → upstream provider`

The UI consumes only normalized Verxor data. It must not import an upstream SDK, provider credential, or provider-specific response shape.

## Provider contract

Each adapter implements:

- `listCountries()` — supported countries and availability
- `listNumbers(countryId)` — available numbers, number type and capabilities
- `listPlans(number)` — supported rental durations and prices
- `createRental(request)` — creates a rental and returns a normalized order

A normalized number contains its provider ID, number ID, country, phone number, VoIP/non-VoIP classification, Voice/SMS capabilities, availability, currency and prices.

## Production rule

Do not place provider API keys in the browser. Provider adapters and `createRental` should run behind the Verxor server/API boundary. The current Vite client can consume this contract while the backend/provider adapters are added later.

No provider is selected or hard-coded in this layer. Actual inventory will come from whichever adapters Verxor enables.
