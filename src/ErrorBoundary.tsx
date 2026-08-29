import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('🔴 FATAL RENDERING ERROR');
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fef2f2', color: '#991b1b', height: '100vh' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Application Error</h1>
          <p style={{ marginTop: '10px' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ marginTop: '10px', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button 
              style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
            <button 
              style={{ padding: '10px 20px', backgroundColor: '#b91c1c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              onClick={() => {
                localStorage.clear();
                window.indexedDB.databases().then((dbs) => {
                  dbs.forEach(db => { if (db.name) window.indexedDB.deleteDatabase(db.name); });
                });
                alert('Local data cleared! Reloading...');
                window.location.reload();
              }}
            >
              Clear Local Data & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
