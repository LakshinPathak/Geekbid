"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";

const HIDE_NAVBAR_ROUTES = ["/", "/login"];
const HIDE_NAVBAR_PREFIXES = ["/admin"];

export function ConditionalNavbar() {
 const pathname = usePathname();
 if (HIDE_NAVBAR_ROUTES.includes(pathname)) return null;
 if (HIDE_NAVBAR_PREFIXES.some(p => pathname.startsWith(p))) return null;
 return <Navbar />;
}
