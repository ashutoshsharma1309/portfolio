/**
 * DOM input layer for the camera rig: constrained-orbit drag, wheel / pinch
 * zoom, and click-vs-drag disambiguation.
 *
 * Listeners write into a plain mutable object; CameraRig consumes it inside
 * useFrame, so input never triggers React renders and nothing allocates per
 * frame.
 *
 * Click suppression: R3F dispatches onClick from the DOM 'click' event that
 * bubbles to its event-source element (an ancestor of the canvas). We listen
 * for 'click' in the CAPTURE phase on the canvas' parent and stop it when the
 * preceding press was a drag, so no hotspot component needs to know about
 * drags. Taps (movement under the threshold) pass through untouched.
 */

export interface OrbitInput {
  /** Accumulated drag deltas in px since last consumed (single pointer). */
  dragDX: number;
  dragDY: number;
  /** Multiplicative zoom since last consumed (>1 = zoom out). */
  zoomMul: number;
  /** A pointer is down and has crossed the drag threshold. */
  dragging: boolean;
  /** Any pointer is currently pressed on the canvas. */
  pressed: boolean;
  /** performance.now() of the last orbit/zoom input. */
  lastInputAt: number;
  /** performance.now() of the last drag movement (for inertia release). */
  lastMoveAt: number;
  /** Canvas client height in px (for px → radian scaling). */
  viewHeight: number;
  /** When false, gestures still suppress clicks but don't orbit/zoom. */
  enabled: boolean;
}

export function createOrbitInput(): OrbitInput {
  return {
    dragDX: 0,
    dragDY: 0,
    zoomMul: 1,
    dragging: false,
    pressed: false,
    lastInputAt: -Infinity,
    lastMoveAt: -Infinity,
    viewHeight: 800,
    enabled: false,
  };
}

const DRAG_THRESHOLD_MOUSE = 5;
const DRAG_THRESHOLD_TOUCH = 10;
/** A drag's trailing click must arrive within this window to be swallowed. */
const SUPPRESS_WINDOW_MS = 600;

interface PointerTrack {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  type: string;
}

/**
 * Attach listeners. Returns a disposer. `onDragChange` lets the caller update
 * the cursor when a drag starts / ends.
 */
export function attachOrbitInput(
  canvas: HTMLCanvasElement,
  input: OrbitInput,
  onDragChange: (dragging: boolean) => void,
): () => void {
  const pointers: PointerTrack[] = [];
  let suppressUntil = 0;
  let gestureWasDrag = false;
  let pinchDist = 0;

  const now = () => performance.now();

  const find = (id: number) => {
    for (let i = 0; i < pointers.length; i++) if (pointers[i].id === id) return i;
    return -1;
  };

  const pinchDistance = () => {
    const a = pointers[0];
    const b = pointers[1];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const setDragging = (v: boolean) => {
    if (input.dragging === v) return;
    input.dragging = v;
    onDragChange(v);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (pointers.length === 0) gestureWasDrag = false;
    suppressUntil = 0;
    pointers.push({
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
    });
    input.pressed = true;
    input.viewHeight = canvas.clientHeight || input.viewHeight;
    if (pointers.length === 2) {
      // Second finger: switch to pinch. Counts as a drag (never a tap).
      gestureWasDrag = true;
      pinchDist = pinchDistance();
      setDragging(true);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const i = find(e.pointerId);
    if (i < 0) return;
    const p = pointers[i];
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;

    if (pointers.length >= 2) {
      const dist = pinchDistance();
      if (pinchDist > 0 && dist > 0 && input.enabled) {
        input.zoomMul *= pinchDist / dist;
        input.lastInputAt = now();
      }
      pinchDist = dist;
      return;
    }

    if (!gestureWasDrag) {
      const threshold = p.type === "mouse" ? DRAG_THRESHOLD_MOUSE : DRAG_THRESHOLD_TOUCH;
      if (Math.hypot(p.x - p.startX, p.y - p.startY) < threshold) return;
      gestureWasDrag = true;
      setDragging(true);
    }

    if (input.enabled) {
      input.dragDX += dx;
      input.dragDY += dy;
      const t = now();
      input.lastInputAt = t;
      input.lastMoveAt = t;
    }
  };

  const onPointerEnd = (e: PointerEvent) => {
    const i = find(e.pointerId);
    if (i < 0) return;
    pointers.splice(i, 1);
    if (pointers.length === 1) {
      // Pinch → one finger left: re-base so the remaining finger doesn't jump.
      pointers[0].startX = pointers[0].x;
      pointers[0].startY = pointers[0].y;
      pinchDist = 0;
    }
    if (pointers.length === 0) {
      input.pressed = false;
      if (gestureWasDrag) suppressUntil = now() + SUPPRESS_WINDOW_MS;
      setDragging(false);
    }
  };

  // If the release never arrives (window blur / Cmd-Tab with the button held,
  // native context menu, tab hidden, capture stolen), drop all pointer state
  // so the cursor doesn't stick on "grabbing" and idle return / drift resume.
  const resetPointers = () => {
    if (pointers.length === 0 && !input.pressed && !input.dragging) return;
    pointers.length = 0;
    pinchDist = 0;
    input.pressed = false;
    if (gestureWasDrag) suppressUntil = now() + SUPPRESS_WINDOW_MS;
    setDragging(false);
  };
  const onContextMenu = () => {
    // A native menu (e.g. ctrl-click on macOS) eats the mouse release. Touch
    // long-press also fires contextmenu but its pointerup still arrives, so
    // leave touch gestures alone.
    for (let i = 0; i < pointers.length; i++) if (pointers[i].type !== "mouse") return;
    resetPointers();
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") resetPointers();
  };
  const onLostCapture = (e: PointerEvent) => {
    // Only meaningful if the pointer is ours and no pointerup will follow.
    if (find(e.pointerId) >= 0 && e.buttons === 0) onPointerEnd(e);
  };

  const onClickCapture = (e: MouseEvent) => {
    if (suppressUntil > 0 && now() < suppressUntil) {
      e.stopPropagation();
      e.preventDefault();
      suppressUntil = 0;
    }
  };

  const onWheel = (e: WheelEvent) => {
    // Only over the canvas, so page / panel scrolling elsewhere is unaffected.
    e.preventDefault();
    if (!input.enabled) return;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= input.viewHeight;
    // Trackpad pinch arrives as ctrl+wheel with small deltas: boost it.
    const k = e.ctrlKey ? 0.01 : 0.0011;
    input.zoomMul *= Math.exp(Math.max(-0.5, Math.min(0.5, dy * k)));
    input.lastInputAt = now();
  };

  // Safari pinch-to-zoom gestures on the canvas must not zoom the page.
  const onGesture = (e: Event) => e.preventDefault();

  const clickHost = canvas.parentElement ?? canvas;

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerEnd);
  window.addEventListener("pointercancel", onPointerEnd);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("gesturestart", onGesture);
  canvas.addEventListener("gesturechange", onGesture);
  clickHost.addEventListener("click", onClickCapture, true);
  window.addEventListener("blur", resetPointers);
  window.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("lostpointercapture", onLostCapture);

  return () => {
    window.removeEventListener("blur", resetPointers);
    window.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("lostpointercapture", onLostCapture);
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerEnd);
    window.removeEventListener("pointercancel", onPointerEnd);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("gesturestart", onGesture);
    canvas.removeEventListener("gesturechange", onGesture);
    clickHost.removeEventListener("click", onClickCapture, true);
    if (input.dragging) onDragChange(false);
    input.dragging = false;
    input.pressed = false;
  };
}
