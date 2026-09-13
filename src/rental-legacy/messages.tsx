import { createFileRoute } from "@tanstack/react-router";
import { PenSquare, Search, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rental/messages")({
  head: () => ({ meta: [{ title: "Messages — Verxor" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="min-h-[100dvh] bg-white pb-20">
      <header className="sticky top-0 z-40 bg-white"><div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4"><div className="w-9" /><h1 className="text-[17px] font-semibold text-slate-900">Messages</h1><button type="button" className="flex h-9 w-9 items-center justify-center rounded-full active:bg-slate-100" aria-label="New message"><PenSquare size={20} className="text-[#2563EB]" strokeWidth={2} /></button></div></header>
      <div className="mx-auto max-w-lg px-4 pt-2"><div className="relative mb-3"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" placeholder="Search" className="h-10 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-[14px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" /></div><div className="flex flex-col items-center px-6 py-20 text-center"><MessageSquare className="h-12 w-12 text-slate-300" strokeWidth={1.25} /><p className="mt-4 text-sm font-semibold text-slate-900">No messages yet</p><p className="mt-1 text-[13px] text-slate-500">SMS from your rented numbers will show up here.</p></div></div>
    </div>
  );
}
