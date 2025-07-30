import type { StoryItem } from "../types/story";

export default function Timeline(props: {
  item: StoryItem;
  setPlayhead: (ms: number) => void;
  playhead: number;
}) {
  const width = 300;

  return (
    <div class="w-full bg-gray-800 p-2 text-white text-sm">
      <div class="relative h-4 bg-gray-700" style={`width:${width}px`}>
        <div
          class="absolute top-0 left-0 h-4 bg-blue-500"
          style={`width:${(props.playhead / props.item.duration) * width}px`}
        />
      </div>
    </div>
  );
}
