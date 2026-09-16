import { X, Check, Search, Loader2 } from "lucide-react";
import { naira } from "@/lib/pricing";
import type { RentalCountry } from "@/lib/functions/rentals.functions";

type OutboundLine = { id: string; label: string; number: string; flag: string; type: "rented" | "sim" };

type Props = {
  showFromSheet: boolean;
  setShowFromSheet: (v: boolean) => void;
  showCountrySheet: boolean;
  setShowCountrySheet: (v: boolean) => void;
  countrySearch: string;
  setCountrySearch: (v: string) => void;
  browseMode: boolean;
  setBrowseMode: (v: boolean) => void;
  outboundLines: OutboundLine[];
  fromLine: OutboundLine;
  setFromLineId: (id: string) => void;
  dialCountry: { code: string; name: string; dial: string; flag: string };
  setDialCountry: (c: { code: string; name: string; dial: string; flag: string }) => void;
  setDial: (v: string | ((d: string) => string)) => void;
  filteredCountries: Array<{ code: string; name: string; dial: string; flag: string; raw?: RentalCountry }>;
  countriesLoading: boolean;
  setCatalogCountry: (c: RentalCountry | null) => void;
};

export function CallsSheets(props: Props) {
  const {
    showFromSheet, setShowFromSheet,
    showCountrySheet, setShowCountrySheet,
    countrySearch, setCountrySearch,
    browseMode, setBrowseMode,
    outboundLines, fromLine, setFromLineId,
    dialCountry, setDialCountry, setDial,
    filteredCountries, countriesLoading, setCatalogCountry,
  } = props;

  return (
    <>
      {showFromSheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/45" onClick={() => setShowFromSheet(false)} />
          <div className="relative rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
              <h2 className="text-[16px] font-semibold text-slate-900">Call from</h2>
              <button type="button" onClick={() => setShowFromSheet(false)} className="p-1 text-slate-400">
                <X size={20} />
              </button>
            </div>
            <ul>
              {outboundLines.map((line) => (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFromLineId(line.id);
                      setShowFromSheet(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
                  >
                    {line.type === "sim" ? (
                      <span className="flex w-6 justify-center">
                        <span className="inline-block h-3.5 w-2.5 rounded-sm bg-emerald-500" />
                      </span>
                    ) : (
                      <span className="w-6 text-center text-xl leading-none">{line.flag}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-slate-900">{line.label}</p>
                      <p className="text-[13px] text-slate-500">{line.number}</p>
                    </div>
                    {fromLine.id === line.id && <Check size={18} className="shrink-0 text-[#2563EB]" />}
                  </button>
                </li>
              ))}
            </ul>
            <div className="h-3" />
          </div>
        </div>
      )}

      {showCountrySheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => {
              setShowCountrySheet(false);
              setCountrySearch("");
              setBrowseMode(false);
            }}
          />
          <div className="relative flex max-h-[75vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <h2 className="text-[16px] font-semibold text-slate-900">
                {browseMode ? "Rent a number" : "Select country"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCountrySheet(false);
                  setCountrySearch("");
                  setBrowseMode(false);
                }}
                className="p-1 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="shrink-0 px-4 py-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country"
                  className="h-10 w-full rounded-xl bg-slate-100 pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  autoFocus
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {countriesLoading ? (
                <li className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
                </li>
              ) : filteredCountries.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-slate-500">No countries match</li>
              ) : (
                filteredCountries.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setDialCountry({
                          code: c.code,
                          name: c.name,
                          dial: c.dial || "+1",
                          flag: c.flag,
                        });
                        setShowCountrySheet(false);
                        setCountrySearch("");
                        setDial("");
                        if (browseMode && c.raw) setCatalogCountry(c.raw);
                        setBrowseMode(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
                    >
                      <span className="text-2xl leading-none">{c.flag}</span>
                      <div className="flex-1">
                        <p className="text-[15px] font-medium text-slate-900">{c.name}</p>
                        {browseMode && c.raw && (
                          <p className="text-[12px] text-slate-500">
                            from {naira(Math.round(c.raw.from_price_ngn || 0))}
                          </p>
                        )}
                      </div>
                      <span className="text-[14px] text-slate-500">{c.dial}</span>
                      {dialCountry.code === c.code && !browseMode && (
                        <Check size={18} className="shrink-0 text-[#2563EB]" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
