import Link from "next/link";

export function Hero() {
  return (
    <section
      id="hero"
      aria-label="Hero"
      className="bg-gradient-to-b from-gray-50 to-white py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h1 className="mb-6 font-display text-4xl font-bold text-navy sm:text-5xl">
          Logistics that scales with your e&#8209;commerce
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 sm:text-xl">
          Warehouse management, last-mile deliveries, and reverse logistics in
          the United States and Spain. Over 15 years helping fashion,
          electronics, and cosmetics brands grow without worrying about
          operations.
        </p>
        <Link
          href="/application"
          className="inline-block rounded-lg bg-amber px-8 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Request information
        </Link>
      </div>
    </section>
  );
}
