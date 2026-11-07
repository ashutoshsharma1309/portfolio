// Web Worker: generates the window's exterior view pixels off the main
// thread and transfers the buffer back (see exteriorView.ts).
import { generateExteriorPixels } from "./exteriorView";

interface WorkerScope {
  onmessage: (() => void) | null;
  postMessage(message: ArrayBuffer, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = () => {
  const data = generateExteriorPixels();
  scope.postMessage(data.buffer, [data.buffer]);
};
