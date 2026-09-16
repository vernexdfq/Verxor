/**
 * Rental entry for Verxor AppShell.
 * UI is the exact Vernex copy under src/components/rental/.
 */
import { RentNumberApp } from "./components/rental/calls-screen";

type RentalPageProps = { onBack: () => void };

export function RentalPage(_props: RentalPageProps) {
  return <RentNumberApp />;
}
