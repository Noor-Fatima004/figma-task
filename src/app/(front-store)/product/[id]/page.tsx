import ReduxProvider from "@/store/Provider";
import ProductDetail from "./ProductDetail";

// Server page: sirf Provider lagata hai, baqi sab client component me hai
export default function ProductPage() {
  return (
    <ReduxProvider>
      <ProductDetail />
    </ReduxProvider>
  );
}