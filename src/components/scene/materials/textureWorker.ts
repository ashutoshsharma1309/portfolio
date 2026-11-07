// Web Worker: runs the procedural texture generators off the main thread and
// transfers the RGBA8 buffers back (zero-copy).
import { generateTextureData, type TextureKind } from "./textureGen";

export interface TextureJob {
  readonly id: number;
  readonly kind: TextureKind;
  readonly size: number;
  readonly seed: number;
}

export interface TextureJobResult {
  readonly id: number;
  readonly ms: number;
  readonly albedo: Uint8Array;
  readonly normal: Uint8Array;
  readonly orm: Uint8Array;
}

interface WorkerScope {
  onmessage: ((e: MessageEvent<TextureJob>) => void) | null;
  postMessage(message: TextureJobResult, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (e) => {
  const { id, kind, size, seed } = e.data;
  const t0 = performance.now();
  const d = generateTextureData(kind, size, seed);
  const ms = performance.now() - t0;
  scope.postMessage({ id, ms, albedo: d.albedo, normal: d.normal, orm: d.orm }, [
    d.albedo.buffer,
    d.normal.buffer,
    d.orm.buffer,
  ]);
};
