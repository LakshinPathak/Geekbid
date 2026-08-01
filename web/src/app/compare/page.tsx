import ReferencePageShell from "@/components/ReferencePageShell";
import Comparison from "@/components/landing/Comparison";

export default function ComparePage() {
  return (
    <ReferencePageShell>
      <div className="pb-16 sm:pb-20">
        <Comparison />
      </div>
    </ReferencePageShell>
  );
}
