import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught React rendering error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--negative-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--negative-bg)',
                color: 'var(--negative-crimson)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <AlertOctagon size={32} />
            </div>

            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '8px' }}>
              Something unexpected happened
            </h2>

            <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
              SpendMic AI encountered an isolated rendering issue. Your stored financial data is safe in offline storage.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: 'var(--surface-subtle)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: 'var(--ink-secondary)',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '24px',
                  maxHeight: '120px',
                }}
              >
                {this.state.error.message || 'Unknown error'}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" onClick={this.handleReload} leftIcon={<RotateCw size={16} />}>
                Reload App
              </Button>
              <Button variant="secondary" onClick={this.handleReset} leftIcon={<Home size={16} />}>
                Try Recovering
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
