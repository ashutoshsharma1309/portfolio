import { Component, type ReactNode } from "react";
import { useSceneStore } from "../store/useSceneStore";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches failures from the 3D layer — a WebGL context that can't be created,
 * a three.js runtime error, or a failed lazy-chunk load — and renders a static
 * fallback instead of a blank screen. Recruiters often browse on locked-down
 * machines or VMs without hardware acceleration; this guarantees the portfolio
 * content is always reachable.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Mark the scene as errored so the loading screen dismisses and the rest of
    // the UI knows not to wait on a 3D first frame.
    useSceneStore.getState().setSceneStatus("error");
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
