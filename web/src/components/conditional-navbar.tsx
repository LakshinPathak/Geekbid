"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/navbar";

const HIDE_NAVBAR_ROUTES = ["/", "/login"];

export function ConditionalNavbar() {
  const pathname = usePathname();
  if (HIDE_NAVBAR_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}
