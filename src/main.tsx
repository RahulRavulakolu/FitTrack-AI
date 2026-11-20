import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { MobileGate } from './components/MobileGate';
import './styles.css';
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="loading">
        <h1>Let’s get you back on track.</h1>
        <p>The page hit an unexpected error. Your saved records are safe.</p>
        <button className="btn" onClick={() => location.reload()}>
          Reload FitTrack
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MobileGate>
        <App />
      </MobileGate>
    </ErrorBoundary>
  </StrictMode>,
);
