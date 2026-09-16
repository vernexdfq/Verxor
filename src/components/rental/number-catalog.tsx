import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { naira } from "@/lib/pricing";
import {
  listRentalNumbers,
  createRental,
  type RentalCountry,
  type RentalNumber,
} from "@/lib/functions/rentals.functions";

const PLANS = ["1 Week", "1 Month", "1 Year"] as const;
const PLAN_MULT: Record<string, number> = { "1 Week": 0.35, "1 Month": 1, "1 Year": 10 };

function flagOf(code: string) {
  const c = code.toUpperCase();
  if (c.length !== 2) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

export function NumberCatalog({ country, onBack, userId }: { country: RentalCountry; onBack: () => void; userId: string }) {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("1 Month");
  const [picked, setPicked] = useState<RentalNumber | null>(null);
  const listFn = useServerFn(listRentalNumbers);
  const rentFn = useServerFn(createRental);
  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ["rental-numbers", country.country_code],
    queryFn: () => listFn({ data: { countryCode: country.country_code } }),
  });
  const rent = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error("Pick a number");
      const result = await rentFn({ data: { rentalNumberId: picked.id, plan } });
      if (result && typeof result === "object" && "ok" in result && result.ok === false) {
        throw new Error((result as { error?: string }).error || "Rental failed");
      }
      return result;
    },
    onSuccess: (result) => {
      const phone =
        result && typeof result === "object" && "phoneNumber" in result
          ? String((result as { phoneNumber?: string }).phoneNumber || "")
          : "";
      toast.success(phone ? `Number rented: ${phone}` : "Number rented");
      queryClient.invalidateQueries({ queryKey: ["my-rentals", userId] });
      queryClient.invalidateQueries({ queryKey: ["account", userId] });
      setPicked(null);
      onBack();
    },
    onError: (e: Error) => toast.error(e.message || "Rental failed"),
  });
  const price = picked ? Math.ceil(Number(picked.monthly_price_ngn || 0) * PLAN_MULT[plan]) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white text-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} className="text-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {flagOf(country.country_code)} {country.country_name}
          </p>
          <p className="text-[11px] text-slate-500">
            {country.dial_code} · from {naira(Math.round(country.from_price_ngn || 0))}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
          </div>
        ) : numbers.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No numbers available right now.</p>
        ) : (
          <ul className="space-y-2">
            {numbers.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setPicked(n)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-3.5 text-left ${
                    picked?.id === n.id ? "border-[#2563EB]/40 bg-blue-50" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="font-mono text-[15px] font-semibold tabular-nums">{n.phone_number}</p>
                    {(n.region_name || n.area_code) && (
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {[n.region_name, n.area_code].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#2563EB]">
                    {naira(Math.round(Number(n.monthly_price_ngn || 0)))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {picked && (
        <div className="border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="font-mono text-lg font-bold tabular-nums">{picked.phone_number}</p>
          <div className="mt-3 flex gap-2">
            {PLANS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  plan === p ? "bg-[#2563EB] text-white" : "border border-slate-200 text-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#2563EB]">{naira(price)}</p>
          <button
            type="button"
            disabled={rent.isPending}
            onClick={() => rent.mutate()}
            className="mt-3 w-full rounded-2xl bg-[#2563EB] py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {rent.isPending ? "Processing…" : "Rent this number"}
          </button>
        </div>
      )}
    </div>
  );
}
