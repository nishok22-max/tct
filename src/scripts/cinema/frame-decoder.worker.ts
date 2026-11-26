/// <reference lib="webworker" />
// Decodes image-sequence frames off the main thread.
//  • Every frame is fetched once and kept as a small compressed Blob (≈25 KB each).
//  • Decoding into an ImageBitmap happens only for the frames the page asks for (the ones near the
//    current scroll position), so the main thread never decodes and memory stays bounded.
//  • The page can replace the wish-list at any time; stale requests are simply dropped.
export type ToDecoder =
  | { t: 'prefetch'; urls: string[] }
  | { t: 'want'; items: { i: number; url: string }[] };
export type FromDecoder = { t: 'frame'; i: number; bitmap: ImageBitmap } | { t: 'miss'; i: number };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const blobs = new Map<string, Promise<Blob | null>>();
let queue: { i: number; url: string }[] = [];
let busy = 0;
const MAX_PARALLEL = 2;

const blobFor = (url: string) => {
  let p = blobs.get(url);
  if (!p) {
    p = fetch(url, { cache: 'force-cache' }).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    blobs.set(url, p);
  }
  return p;
};

async function pump() {
  while (busy < MAX_PARALLEL && queue.length) {
    const job = queue.shift()!;
    busy++;
    (async () => {
      try {
        const blob = await blobFor(job.url);
        if (!blob) { scope.postMessage({ t: 'miss', i: job.i } satisfies FromDecoder); return; }
        const bitmap = await createImageBitmap(blob);
        scope.postMessage({ t: 'frame', i: job.i, bitmap } satisfies FromDecoder, [bitmap]);
      } catch {
        scope.postMessage({ t: 'miss', i: job.i } satisfies FromDecoder);
      } finally {
        busy--;
        void pump();
      }
    })();
  }
}

scope.onmessage = (e: MessageEvent<ToDecoder>) => {
  const m = e.data;
  if (m.t === 'prefetch') {
    // Download in the given (coarse-to-fine) order, a few at a time, without decoding.
    const urls = [...m.urls];
    const next = async () => {
      const u = urls.shift();
      if (!u) return;
      await blobFor(u);
      void next();
    };
    for (let k = 0; k < 3; k++) void next();
  } else if (m.t === 'want') {
    queue = m.items; // replace: only what is near the current position matters
    void pump();
  }
};
