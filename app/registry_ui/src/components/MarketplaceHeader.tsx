import { JSX } from "solid-js";

export default function MarketplaceHeader(): JSX.Element {
  return (
    <header class="bg-purple-600 text-white py-4 mb-6 shadow">
      <div class="max-w-5xl mx-auto px-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Takopack Marketplace</h1>
      </div>
    </header>
  );
}
