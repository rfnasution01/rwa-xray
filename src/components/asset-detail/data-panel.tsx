import { Database } from "lucide-react";

import { TechnicalTerm, type GlossaryTerm } from "@/components/technical-term";

export function DataPanel({
  title,
  term,
  count,
  children,
}: {
  title: string;
  term?: GlossaryTerm;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden border border-[#1a5557] bg-[#041214]">
      <div className="flex items-center justify-between border-b border-[#153b3d] px-5 py-4">
        <h3 className="font-semibold">
          {term ? <TechnicalTerm term={term}>{title}</TechnicalTerm> : title}
        </h3>
        <span className="data-badge">{count} records</span>
      </div>
      {children}
    </article>
  );
}

export function EmptyDataPanel({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-[#678b8d]">
      <Database
        className="mx-auto mb-3 size-5 text-[#56dcd6]"
        aria-hidden="true"
      />
      {text}
    </div>
  );
}
