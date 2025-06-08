import {
  configure,
  TextWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
} from "jsr:@zip-js/zip-js@^2.7.62";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

// Configure to disable workers to prevent timer leaks in tests
configure({
  useWebWorkers: false,
});

export interface TakoUnpackResult {
  manifest: string;
  server?: string;
  client?: string;
  index?: string;
  assets?: Record<string, string>;
}

/**
 * Unpack a `.takopack` archive and return its core files as strings.
 *
 * @param input - Path to the .takopack file or its binary contents
 * @throws if manifest.json is missing or invalid
 */
export async function unpackTakoPack(
  input: string | Uint8Array | ArrayBuffer,
): Promise<TakoUnpackResult> {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = await Deno.readFile(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }

  const reader = new ZipReader(new Uint8ArrayReader(bytes));
  const entries = await reader.getEntries();
  const files: Record<string, string> = {};
  const assets: Record<string, string> = {};

  for (const entry of entries) {
    if (!entry.directory && entry.filename.startsWith("takos/")) {
      if (entry.filename.startsWith("takos/assets/")) {
        const data = await entry.getData!(new Uint8ArrayWriter());
        assets[entry.filename.slice("takos/assets/".length)] = encodeBase64(
          data,
        );
      } else {
        const content = await entry.getData!(new TextWriter());
        files[entry.filename] = content;
      }
    }
  }

  await reader.close();

  const manifest = files["takos/manifest.json"];
  if (!manifest) {
    throw new Error("manifest.json not found in package");
  }
  try {
    JSON.parse(manifest);
  } catch {
    throw new Error("manifest.json is not valid JSON");
  }

  return {
    manifest,
    server: files["takos/server.js"],
    client: files["takos/client.js"],
    index: files["takos/index.html"],
    assets,
  };
}
