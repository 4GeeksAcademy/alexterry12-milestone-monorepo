import Link from "next/link";

const contacts = [
  {
    label: "EMAIL",
    href: "mailto:comercial@trackflow.com",
    value: "comercial@trackflow.com",
  },
  {
    label: "LOS ANGELES",
    href: "tel:+12135550147",
    value: "+1 213 555 0147",
  },
  {
    label: "ZARAGOZA",
    href: "tel:+34976123456",
    value: "+34 976 123 456",
  },
] as const;

export function Contact() {
  return (
    <section
      id="contact"
      aria-label="Contact"
      className="bg-paper py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="mb-3 text-center font-mono text-sm tracking-wide text-amber uppercase">
          CONTACT
        </p>
        <h2 className="mb-12 text-center font-display text-3xl text-navy sm:text-4xl">
          Let&apos;s talk logistics
        </h2>

        <div className="mb-12 flex flex-col justify-center gap-12 text-center sm:flex-row">
          {contacts.map((contact) => (
            <div key={contact.label}>
              <p className="font-mono text-xs text-amber uppercase">
                {contact.label}
              </p>
              <p className="mt-1 font-body text-lg text-navy">
                <a
                  href={contact.href}
                  className="transition-colors hover:text-amber"
                >
                  {contact.value}
                </a>
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/application"
            className="inline-block rounded-lg bg-amber px-8 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            Request information
          </Link>
        </div>
      </div>
    </section>
  );
}
