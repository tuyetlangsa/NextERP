"use client";

import { Component, type ReactNode } from "react";

interface Props {
  /** Changing this value remounts the boundary and clears the error (e.g. active tab index). */
  resetKey?: unknown;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Contains a render/runtime error to its subtree so a single broken panel does not
 * unmount the whole window (previously any thrown error blanked the entire ERP UI).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-sm text-red-700">
          <div className="font-semibold mb-1">Đã xảy ra lỗi khi hiển thị nội dung này.</div>
          <div className="text-red-500 break-all">{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
