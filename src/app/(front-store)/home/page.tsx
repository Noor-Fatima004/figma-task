import HeroSection from "./HeroSection";
import CuratedCollection from "./Curatedcollection";
import ReduxProvider from "@/store/Provider";

export default function HomePage() {
  return (
    <ReduxProvider>
      <HeroSection />
      <CuratedCollection />
    </ReduxProvider>
  );
}