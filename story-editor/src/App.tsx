import { createSignal } from "solid-js";
import Stage from "./components/Stage";
import Sidebar from "./components/Sidebar";
import Inspector from "./components/Inspector";
import Timeline from "./components/Timeline";
import type { Layer, Story } from "./types/story";
import { I } from "./lib/mat2d";

const initialStory: Story = {
  id: "demo",
  storyParts: [
    {
      id: "item1",
      duration: 5000,
      layers: [
        {
          id: "img1",
          layerType: "image",
          media: "https://via.placeholder.com/300x500",
          transform: I.slice() as typeof I,
        },
        {
          id: "txt1",
          layerType: "text",
          text: "こんにちは",
          transform: [1, 0, 0, 1, 0.2, 0.2],
          fontSize: 0.05,
          color: "#fff",
        },
      ],
    },
  ],
};

export default function App() {
  const [story, setStory] = createSignal<Story>(initialStory);
  const [selectedId, setSelectedId] = createSignal<string | undefined>();
  const [playhead, setPlayhead] = createSignal(0);

  const currentItem = () => story().storyParts[0];

  const addImage = (url: string) => {
    const l: Layer = {
      id: `img${Date.now()}`,
      layerType: "image",
      media: url,
      transform: [1, 0, 0, 1, 0.1, 0.1],
    };
    currentItem().layers.push(l);
    setStory({ ...story() });
  };

  const updateLayer = (layer: Layer) => {
    const item = currentItem();
    const idx = item.layers.findIndex((l) => l.id === layer.id);
    if (idx >= 0) item.layers[idx] = layer;
    setStory({ ...story() });
  };

  return (
    <div class="flex h-screen">
      <Sidebar addImage={addImage} />
      <Stage
        width={360}
        height={640}
        layers={currentItem().layers}
        selectLayer={setSelectedId}
        selected={selectedId()}
      />
      <Inspector
        layer={currentItem().layers.find((l) => l.id === selectedId())}
        update={updateLayer}
      />
      <div class="absolute bottom-0 left-0 right-0">
        <Timeline
          item={currentItem()}
          playhead={playhead()}
          setPlayhead={setPlayhead}
        />
      </div>
    </div>
  );
}
