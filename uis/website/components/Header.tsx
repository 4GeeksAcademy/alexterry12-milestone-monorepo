import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#coverage", label: "Coverage" },
  { href: "/#contact", label: "Contact" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2 px-4 py-4 sm:px-6">
        <Link href="/" className="text-2xl font-bold text-navy">
          TrackFlow
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex list-none items-center gap-4 text-sm font-medium text-gray-700 sm:gap-6 sm:text-base">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-blue-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
