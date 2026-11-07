import { useEffect, useMemo, type DependencyList } from "react";
import type { Material } from "three";
import { disposeMaterial } from "./factories";

type Disposable = { dispose(): void };

function isMaterial(v: unknown): v is Material {
  return typeof v === "object" && v !== null && (v as Material).isMaterial === true;
}

function disposeValue(v: unknown) {
  if (Array.isArray(v)) v.forEach(disposeValue);
  else if (isMaterial(v)) disposeMaterial(v);
  else if (v && typeof (v as Disposable).dispose === "function") (v as Disposable).dispose();
}

/**
 * useMemo + dispose-on-change/unmount for materials (incl. their owned texture
 * clones), geometries, or arrays/records of them.
 *
 *   const q = useRoomQuality();
 *   const pad = useDisposable(() => createLeather(q, { widthM: 1.4, heightM: 0.34 }), [q]);
 */
export function useDisposable<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(
    () => () => {
      const v: unknown = value;
      if (v && typeof v === "object" && !Array.isArray(v) && !isMaterial(v) && typeof (v as Disposable).dispose !== "function") {
        Object.values(v as Record<string, unknown>).forEach(disposeValue);
      } else {
        disposeValue(v);
      }
    },
    [value],
  );
  return value;
}
