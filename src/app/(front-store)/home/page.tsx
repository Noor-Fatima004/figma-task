import HeroSection from "./HeroSection";
import CuratedCollection from "./Curatedcollection";
import StoreHero from "./StoreHero";
import ReduxProvider from "@/store/Provider";
import ShopByCategory from "./ShopByCategory";
import NewArrivals from "./NewArrivals";
import CraftsmanshipBanner from "./CraftsmanshipBanner";
import SignatureEdit from "./SignatureEdit";



export default function HomePage() {
  return (
    <ReduxProvider>
      <HeroSection />
      <CuratedCollection />
      <StoreHero />
      <ShopByCategory/>
      <NewArrivals/>
      <CraftsmanshipBanner/>
      <SignatureEdit/>
    </ReduxProvider>
    
  );
}