// Web Worker: generates the walnut veneer maps off the main thread and
// transfers the RGBA8 buffers back (zero-copy).
import { generateVeneerData } from "./veneerGen";

export interface VeneerJob {
  readonly w: number;
  readonly h: number;
}

export interface VeneerJobResult {
  readonly ms: number;
  readonly albedo: Uint8Array<ArrayBuffer>;
  readonly normal: Uint8Array<ArrayBuffer>;
  readonly orm: Uint8Array<ArrayBuffer>;
}

interface WorkerScope {
  onmessage: ((e: MessageEvent<VeneerJob>) => void) | null;
  postMessage(message: VeneerJobResult, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (e) => {
  const t0 = performance.now();
  const d = generateVeneerData(e.data.w, e.data.h);
  const ms = performance.now() - t0;
  scope.postMessage({ ms, albedo: d.albedo, normal: d.normal, orm: d.orm }, [d.albedo.buffer, d.normal.buffer, d.orm.buffer]);
};
