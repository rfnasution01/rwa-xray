import { TechnicalTerm, type GlossaryTerm } from "@/components/technical-term";

export function SmallMetric({
  term,
  value,
  align = "left",
}: {
  term: GlossaryTerm;
  value: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="border border-[#153f41] bg-[#061719] p-3">
      <dt className="font-mono text-[9px] text-[#739799]">
        <TechnicalTerm term={term} align={align} />
      </dt>
      <dd className="mt-2 text-sm font-medium text-[#cfdfdd] tabular-nums">
        {value}
      </dd>
    </div>
  );
}
