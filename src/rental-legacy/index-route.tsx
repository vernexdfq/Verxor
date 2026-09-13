import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/rental/")({ beforeLoad: () => { throw redirect({ to: "/rental/calls" }); } });
