import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Loader2 className="h-8 w-8 text-[#c9a84c] animate-spin" />
    </div>
  );
}
