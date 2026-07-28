const reasons = [
  {
    number: "01",
    title: "Binational operation",
    description:
      "The only operator with own infrastructure in the United States and Spain",
  },
  {
    number: "02",
    title: "+130 professionals",
    description: "dedicated to your logistics",
  },
  {
    number: "03",
    title: "Own technology",
    description: "Total visibility of your inventory in real time",
  },
  {
    number: "04",
    title: "E-commerce specialization",
    description: "Fashion, electronics, and cosmetics brands, specifically",
  },
] as const;

export function WhyTrackFlow() {
  return (
    <section
      id="why"
      aria-label="Why TrackFlow"
      className="bg-navy py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="mb-3 text-center font-mono text-sm tracking-wide text-amber uppercase">
          WHY TRACKFLOW
        </p>
        <h2 className="mb-12 text-center font-display text-3xl text-white sm:text-4xl">
          Built for binational e-commerce
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {reasons.map((reason, index) => (
            <div
              key={reason.number}
              className={`border-t border-white/10 p-8 ${
                index % 2 === 1 ? "sm:border-l" : ""
              }`}
            >
              <p className="font-mono text-sm text-amber">{reason.number}</p>
              <h3 className="mt-2 font-display text-xl text-white">
                {reason.title}
              </h3>
              <p className="mt-2 text-white/70">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
