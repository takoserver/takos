export interface BearcapInfo {
  url: string;
  token: string;
}

export function parseBearcap(uri: string): BearcapInfo | null {
  if (!uri.startsWith("bear:")) return null;
  const query = uri.slice(5).replace(/^\/+/, "");
  const params = new URLSearchParams(
    query.startsWith("?") ? query.slice(1) : query,
  );
  const url = params.get("u");
  const token = params.get("t") ?? "";
  if (!url) return null;
  return { url: decodeURIComponent(url), token };
}

export async function fetchBearcap(uri: string): Promise<Uint8Array | null> {
  const info = parseBearcap(uri);
  if (!info) return null;
  try {
    const res = await fetch(info.url, {
      headers: info.token ? { Authorization: `Bearer ${info.token}` } : {},
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
