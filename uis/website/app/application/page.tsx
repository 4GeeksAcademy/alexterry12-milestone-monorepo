import type { Metadata } from "next";
import { ApplicationForm } from "@/components/ApplicationForm";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Request Information — TrackFlow",
  description:
    "Request a logistics quote from TrackFlow. Tell us about your e-commerce warehousing, last-mile delivery, and reverse logistics needs across the US and Spain.",
};

export default function ApplicationPage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-paper py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4">
            <p className="mb-3 text-center font-mono text-sm tracking-wide text-amber uppercase">
              REQUEST INFORMATION
            </p>
            <h1 className="text-center font-display text-3xl text-navy sm:text-4xl">
              Tell us about your logistics needs
            </h1>
            <p className="mt-2 mb-10 text-center text-slate">
              Fill out the form below and our commercial team will contact you
              within 24-48 hours.
            </p>
            <ApplicationForm />
          </div>
        </section>
      </main>
    </>
  );
}
