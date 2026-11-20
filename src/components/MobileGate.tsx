import { useEffect, useState, type ReactNode } from 'react';
import { Smartphone, Server, ArrowRight, Wifi, LoaderCircle } from 'lucide-react';
import {
  apiOrigin,
  connectServer,
  installNativeLifecycle,
  isNative,
  nativeSettings,
} from '../lib/native';
import { Brand, Button, Field } from './ui';
export function MobileGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isNative),
    [show, setShow] = useState(false),
    [url, setUrl] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!isNative) return;
    nativeSettings()
      .then((value) => {
        setUrl(value);
        setShow(!value);
        setReady(true);
        installNativeLifecycle();
      })
      .catch((e) => {
        setError(e.message);
        setShow(true);
        setReady(true);
      });
    const open = () => {
      setUrl(apiOrigin());
      setShow(true);
    };
    window.addEventListener('fittrack:connection', open);
    return () => window.removeEventListener('fittrack:connection', open);
  }, []);
  if (!ready)
    return (
      <div className="loading">
        <Brand />
        <LoaderCircle className="spin" />
      </div>
    );
  if (!show) return children;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await connectServer(url);
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mobile-connect">
      <Brand />
      <div className="connect-symbol">
        <Smartphone size={42} />
      </div>
      <span className="eyebrow">FITNESS, IN YOUR POCKET</span>
      <h1>
        Your journey.
        <br />
        <em>Now on your phone.</em>
      </h1>
      <p>
        Connect your FitTrack account server to securely sync meals, workouts and progress across
        your devices.
      </p>
      <form onSubmit={save}>
        <Field
          label="FitTrack server address"
          type="url"
          placeholder="https://your-fittrack-server.com"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="full">
          Connect & continue
          <ArrowRight size={17} />
        </Button>
      </form>
      <div className="mobile-connection-note">
        <Wifi size={19} />
        <p>
          Testing at home? Start the backend on your computer and enter its local IP address with
          port 4000. Keep your phone and computer on the same Wi-Fi. Use a hosted HTTPS server for
          access anywhere.
        </p>
      </div>
      {apiOrigin() && (
        <Button variant="ghost" onClick={() => setShow(false)}>
          Back to app
        </Button>
      )}
    </main>
  );
}
export function ConnectionButton() {
  return isNative ? (
    <button
      className="icon-btn"
      aria-label="Server connection settings"
      onClick={() => window.dispatchEvent(new Event('fittrack:connection'))}
    >
      <Server size={19} />
    </button>
  ) : null;
}
