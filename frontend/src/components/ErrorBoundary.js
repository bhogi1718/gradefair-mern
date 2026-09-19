import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Render error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div className="card card-body" style={{ maxWidth: 440, textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <p className="muted mt-8">{String(this.state.error?.message || this.state.error)}</p>
          <button className="btn btn-primary mt-16" onClick={() => window.location.reload()}>
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
