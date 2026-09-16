/**
 * Rental page — cleared.
 * Full rental UI removed intentionally. Rebuild later against Vernex / product spec.
 */
import type { ReactNode } from 'react';

type RentalPageProps = { onBack: () => void };

export function RentalPage({ onBack }: RentalPageProps): ReactNode {
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <button type="button" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Rent a Line</h1>
      <p style={{ color: '#64748B', margin: 0 }}>
        Rental workspace cleared. New implementation will be built here.
      </p>
    </div>
  );
}
