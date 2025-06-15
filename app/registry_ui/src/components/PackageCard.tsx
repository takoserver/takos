import { JSX } from "solid-js";

interface Props {
  identifier: string;
  version: string;
  description?: string;
}

export default function PackageCard(props: Props): JSX.Element {
  return (
    <div class="border rounded-lg p-4 bg-white shadow hover:shadow-md transition">
      <div class="text-lg font-semibold mb-1">{props.identifier}</div>
      <div class="text-sm text-gray-500 mb-2">v{props.version}</div>
      {props.description && (
        <p class="text-gray-700 text-sm mb-2">{props.description}</p>
      )}
      <button
        class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        disabled
      >
        Install
      </button>
    </div>
  );
}
