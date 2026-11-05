import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  onError?: () => void;
}

/** Generic boundary — used around the hero's WebGL layer so a failed context
 *  or chunk load degrades to the static visual instead of a blank hero. */
export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
