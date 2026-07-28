import { Contact } from "@/components/Contact";
import { Coverage } from "@/components/Coverage";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { WhyTrackFlow } from "@/components/WhyTrackFlow";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <Coverage />
        <WhyTrackFlow />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
