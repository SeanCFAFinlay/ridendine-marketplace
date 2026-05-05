'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card } from '@ridendine/ui';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class LiveBoardBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ops live board error:', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <Card className="border-amber-500/30 bg-[#121c2c] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-100">Live board unavailable</p>
            <p className="mt-1 text-sm text-gray-400">
              The dashboard is still available. Retry the live feed after the realtime panel reloads.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => this.setState({ error: null })}
            className="border-gray-700 text-gray-100 hover:bg-gray-800"
          >
            Retry live board
          </Button>
        </div>
      </Card>
    );
  }
}
