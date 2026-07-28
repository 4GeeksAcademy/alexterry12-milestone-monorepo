const regions = [
  {
    code: "US",
    title: "United States",
    items: [
      "Warehouse in Los Angeles",
      "National coverage",
      "Carriers: UPS, FedEx, DHL",
    ],
  },
  {
    code: "ES",
    title: "Spain",
    items: [
      "Warehouse in Zaragoza",
      "Peninsular and island coverage",
      "Carriers: MRW, SEUR, DHL",
    ],
  },
] as const;

export function Coverage() {
  return (
    <section
      id="coverage"
      aria-label="Coverage"
      className="bg-paper py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="mb-3 text-center font-mono text-sm tracking-wide text-amber uppercase">
          COVERAGE
        </p>
        <h2 className="mb-12 text-center font-display text-3xl text-navy sm:text-4xl">
          Where we operate
        </h2>

        <div className="mx-auto mb-16 max-w-3xl">
          <div className="relative flex items-center justify-between">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-amber" />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-xs text-slate">
              5,800 MI
            </span>
            <span className="relative rounded-full border border-bordergray bg-white px-3 py-1 font-mono text-xs text-navy">
              LAX
            </span>
            <span className="relative rounded-full border border-bordergray bg-white px-3 py-1 font-mono text-xs text-navy">
              ZAZ
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {regions.map((region) => (
            <div
              key={region.code}
              className="rounded-lg border border-bordergray bg-white p-6"
            >
              <p className="mb-2 font-mono text-sm text-amber">{region.code}</p>
              <h3 className="mb-4 font-display text-xl text-navy">
                {region.title}
              </h3>
              <ul className="list-none space-y-2">
                {region.items.map((item) => (
                  <li
                    key={item}
                    className="relative pl-5 before:absolute before:top-2 before:left-0 before:h-2 before:w-2 before:bg-amber before:content-['']"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
