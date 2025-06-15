import { PackageInfo } from "./PackageCard.tsx";

export default function ListPackageItem(props: {
  package: PackageInfo;
  onInstall?: (pkg: PackageInfo) => void;
  onViewDetails?: (pkg: PackageInfo) => void;
}) {
  return (
    <div class="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
      <div class="flex-1 min-w-0">
        <h3 class="text-gray-100 font-medium truncate">{props.package.name}</h3>
        <p class="text-xs text-gray-400 truncate">{props.package.identifier}</p>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-xs text-gray-400">v{props.package.version}</span>
        <button
          type="button"
          onClick={() => props.onViewDetails?.(props.package)}
          class="text-xs text-gray-300 hover:text-white"
        >
          詳細
        </button>
        <button
          type="button"
          onClick={() => props.onInstall?.(props.package)}
          class="text-xs text-purple-400 hover:text-purple-300"
        >
          インストール
        </button>
      </div>
    </div>
  );
}
