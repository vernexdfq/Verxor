import { User } from "lucide-react";

export type SubTab = "history" | "contacts" | "keypad";
export type OutboundLine = { id: string; label: string; number: string; flag: string; type: "rented" | "sim" };

export const KEYS = [
  { digit: "1", letters: "" }, { digit: "2", letters: "ABC" }, { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" }, { digit: "5", letters: "JKL" }, { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" }, { digit: "8", letters: "TUV" }, { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" }, { digit: "0", letters: "+" }, { digit: "#", letters: "" },
] as const;

export function flagOf(code: string) {
  const c = code.toUpperCase();
  if (c.length !== 2) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

export function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return value;
  }
}

export function Avatar({ name, inactive }: { name?: string; inactive?: boolean }) {
  if (name) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[15px] font-semibold text-emerald-800">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${inactive ? "bg-pink-100" : "bg-indigo-50"}`}>
      <User size={20} className={inactive ? "text-pink-400" : "text-indigo-300"} strokeWidth={1.5} />
    </div>
  );
}
