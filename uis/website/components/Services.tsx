const services = [
  {
    code: "WH-01",
    title: "Warehouse Management",
    items: [
      "Storage, picking and packing",
      "Real-time inventory",
      "We operate warehouses in Los Angeles and Zaragoza",
    ],
  },
  {
    code: "LM-02",
    title: "Last-Mile Deliveries",
    items: [
      "Certified carrier network in both countries",
      "Unified shipment tracking",
      "Incident and returns management",
    ],
  },
  {
    code: "RL-03",
    title: "Reverse Logistics",
    items: [
      "Complete returns management",
      "Inspection and reconditioning",
      "Integration with your sales platform",
    ],
  },
] as const;

export function Services() {
  return (
    <section
      id="services"
      aria-label="Our services"
      className="bg-white py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="mb-3 text-center font-mono text-sm tracking-wide text-amber uppercase">
          OUR SERVICES
        </p>
        <h2 className="mb-12 text-center font-display text-3xl text-navy sm:text-4xl">
          What we handle for you
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.code}
              className="rounded-lg border border-bordergray bg-paper p-6"
            >
              <p className="mb-2 font-mono text-sm text-amber">{service.code}</p>
              <h3 className="mb-4 font-display text-xl text-navy">
                {service.title}
              </h3>
              <ul className="list-none space-y-2">
                {service.items.map((item) => (
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
