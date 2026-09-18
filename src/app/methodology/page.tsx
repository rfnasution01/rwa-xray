import Link from "next/link";

const assumptions = [
  "Volume participation is a scenario, not guaranteed executable liquidity.",
  "The model does not estimate order-book depth, slippage, fees, or redemption constraints.",
  "Missing data lowers Evidence Coverage and is never silently treated as zero.",
  "Market Capacity Health is not an investment rating or a buy/sell recommendation.",
];

export const metadata = {
  title: "Methodology",
  description:
    "How RWA X-Ray calculates transparent market-capacity scenarios.",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <article className="mx-auto max-w-3xl">
        <Link
          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          href="/"
        >
          ← Back to RWA X-Ray
        </Link>
        <p className="mt-12 text-sm font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
          Transparent by design
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Methodology
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
          The core scenario estimates how many days of observed volume capacity
          a position represents under an explicit participation rate and stress
          haircut.
        </p>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">Core formulas</h2>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">
            {`effective volume = volume 24h × (1 - stress haircut)
daily capacity   = effective volume × participation rate
exit days        = position value / daily capacity`}
          </pre>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Interpretation limits</h2>
          <ul className="mt-4 space-y-3 text-slate-700 dark:text-slate-300">
            {assumptions.map((assumption) => (
              <li key={assumption} className="flex gap-3">
                <span aria-hidden="true">—</span>
                {assumption}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
