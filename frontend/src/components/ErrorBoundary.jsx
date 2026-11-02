import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '12px',
          margin: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '12px', fontSize: '1.4rem' }}>⚠️ View Rendering Issue</h2>
          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}
          >
            🔄 Reload View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
