import { createFileRoute } from "@tanstack/react-router";
import { RentNumberApp } from "@/components/rental/calls-screen";

export const Route = createFileRoute("/_authenticated/rental/calls")({
  head: () => ({
    meta: [
      { title: "Calls — Verxor" },
      { name: "description", content: "Call from your rented lines. USA via SignalWire, worldwide via DIDWW." },
      { property: "og:title", content: "Verxor — Calls & Rentals" },
    ],
  }),
  component: RentNumberApp,
});
