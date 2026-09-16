import { Link, useRouterState } from "@tanstack/react-router";
import { Phone, MessageSquare, Hash, Wallet, Settings } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type Tab = {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const tabs: Tab[] = [
  { to: "/rental/calls", label: "Calls", icon: Phone },
  { to: "/rental/messages", label: "Messages", icon: MessageSquare },
  { to: "/rental/numbers", label: "Numbers", icon: Hash },
  { to: "/rental/credit", label: "Credit", icon: Wallet },
  { to: "/profile", label: "Settings", icon: Settings },
];

export function RentalBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Rental"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.28)] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 w-full max-w-md items-stretch justify-around px-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/profile"
              ? pathname.startsWith("/profile")
              : pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors ${
                active ? "bg-blue-50 text-[#2563EB]" : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
