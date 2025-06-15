import { createSignal } from "solid-js";
import LoginForm from "./components/LoginForm.tsx";
import DomainSection from "./components/DomainSection.tsx";
import PackageSection from "./components/PackageSection.tsx";
import MarketplaceHeader from "./components/MarketplaceHeader.tsx";

export default function App() {
  const [authed, setAuthed] = createSignal(false);

  return (
    <div class="min-h-screen bg-gray-50">
      <MarketplaceHeader />
      <div class="p-6 max-w-5xl mx-auto">
        {authed()
          ? (
            <div class="space-y-8">
              <PackageSection />
              <DomainSection />
            </div>
          )
          : <LoginForm onAuthed={() => setAuthed(true)} />}
      </div>
    </div>
  );
}
