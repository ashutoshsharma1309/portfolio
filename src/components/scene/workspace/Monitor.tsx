// A ~40" 16:9 desktop monitor on a height-adjustable VESA stand: thin bezels
// (7.5 mm, 20 mm chin), stepped matte-plastic back housing, aluminium neck and
// base plate, anti-glare screen (emissive wallpaper under a faint
// environment reflection) and a cable dropping into a desk grommet.
//
// Group origin = the point on the desk top under the stand; front faces +z.

import { type ReactNode } from "react";
import { CatmullRomCurve3, PlaneGeometry, TubeGeometry, Vector3, type BufferGeometry, type Material } from "three";
import { cyl, mergeParts, place, rbox, roundedRectShape, slab } from "./geometry";

export const SCREEN_W = 0.88;
export const SCREEN_H = 0.495;
/** Height of the screen centre above the desk. */
export const SCREEN_Y = 0.43;
/** Panel tilt (top back). */
export const SCREEN_TILT = -0.05;
/** z of the screen surface in the panel frame. */
export const SCREEN_Z = 0.0075;

const BEZEL = 0.0075;
const CHIN = 0.02;

export interface MonitorGeometry {
  panel: BufferGeometry; // front slab + back housing + hinge (plastic)
  stand: BufferGeometry; // neck + base (aluminium)
  cable: BufferGeometry; // cable + grommet (black)
  screen: BufferGeometry;
}

export function createMonitorGeometry(low: boolean): MonitorGeometry {
  const seg = low ? 2 : 3;
  const W = SCREEN_W + BEZEL * 2;
  const H = SCREEN_H + BEZEL + CHIN;
  const panel = mergeParts([
    place(rbox(W, H, 0.014, 0.004, seg), [0, (BEZEL - CHIN) / 2, 0]),
    place(rbox(0.8, 0.44, 0.016, 0.008, seg), [0, -0.012, -0.012]),
    place(rbox(0.6, 0.33, 0.04, 0.016, seg), [0, -0.04, -0.024]),
    place(rbox(0.095, 0.11, 0.03, 0.006, 2), [0, -0.065, -0.052]),
  ]);
  const neckTop = SCREEN_Y - 0.06;
  const stand = mergeParts([
    place(rbox(0.066, neckTop - 0.01, 0.022, 0.009, seg), [0, (neckTop + 0.01) / 2, -0.077]),
    place(rbox(0.088, 0.022, 0.044, 0.009, 2), [0, 0.022, -0.077]),
    place(slab(roundedRectShape(0.26, 0.2, 0.04), 0.013, 0.004, low ? 3 : 6, low ? 2 : 3), [0, 0, -0.035]),
  ]);
  const path = new CatmullRomCurve3([
    new Vector3(0.06, SCREEN_Y - 0.2, -0.032),
    new Vector3(0.064, SCREEN_Y - 0.3, -0.055),
    new Vector3(0.07, 0.06, -0.09),
    new Vector3(0.072, 0.02, -0.13),
    new Vector3(0.074, 0.006, -0.18),
    new Vector3(0.075, -0.004, -0.225),
    new Vector3(0.075, -0.04, -0.24),
  ]);
  const cable = mergeParts([
    new TubeGeometry(path, low ? 16 : 40, 0.0035, low ? 4 : 6, false),
    // Grommet: rim ring + dark throat.
    place(cyl(0.03, 0.03, 0.004, low ? 12 : 24), [0.075, 0.002, -0.24]),
  ]);
  const screen = new PlaneGeometry(SCREEN_W, SCREEN_H);
  return { panel, stand, cable, screen };
}

interface MonitorProps {
  position: [number, number, number];
  rotateY: number;
  geometry: MonitorGeometry;
  plastic: Material;
  aluminium: Material;
  cable: Material;
  screen: Material;
  /** Rendered in the screen plane (origin = screen centre, +z out). */
  children?: ReactNode;
}

export function Monitor({ position, rotateY, geometry, plastic, aluminium, cable, screen, children }: MonitorProps) {
  return (
    <group position={position} rotation={[0, rotateY, 0]}>
      <mesh geometry={geometry.stand} material={aluminium} receiveShadow />
      <mesh geometry={geometry.cable} material={cable} />
      <group position={[0, SCREEN_Y, 0]} rotation={[SCREEN_TILT, 0, 0]}>
        <mesh geometry={geometry.panel} material={plastic} castShadow receiveShadow />
        <mesh geometry={geometry.screen} material={screen} position={[0, 0, SCREEN_Z]} />
        <group position={[0, 0, SCREEN_Z + 0.0012]}>{children}</group>
      </group>
    </group>
  );
}
