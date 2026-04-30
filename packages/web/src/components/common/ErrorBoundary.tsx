import { Component, type ReactNode } from 'react';

interface State { error: Error | null; }
interface Props { children: ReactNode; }

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error('ErrorBoundary caught', error, info);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6">
            <h2 className="text-lg font-semibold text-red-300">Something went wrong</h2>
            <p className="mt-2 text-sm text-red-200/80">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-3 py-1.5 text-sm rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
