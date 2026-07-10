"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Unhandled Page Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="glass-panel w-full max-w-sm mx-4 overflow-hidden animate-scale-in">
        <div className="h-0.5 w-full bg-[#4b3f8f]" />
        <div className="p-8 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-[rgba(75,63,143,0.12)] border border-[rgba(75,63,143,0.22)] flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-[#4b3f8f]" />
          </div>
          <h2 className="font-heading text-xl text-[#3d3a45]">Something went wrong</h2>
          <p className="text-sm text-[#6f6a7d] mt-1.5">
            An unexpected error occurred while loading this page. You can try again, or head back home.
          </p>
          <div className="flex gap-3 mt-6 w-full">
            <button
              onClick={() => reset()}
              className="btn-primary flex-1 py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/"
              className="glass-input flex-1 py-3 rounded-full text-sm font-semibold flex items-center justify-center text-[#3d3a45]"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
