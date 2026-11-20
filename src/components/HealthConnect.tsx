import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Footprints, RefreshCw, Settings2, Play, Square, Activity } from 'lucide-react';
import { api, errorMessage, useApp } from '../lib/app';
import { apiOrigin, StepCounter } from '../lib/native';
import { addDays } from '../../shared/domain';
import { Button } from './ui';

type HealthStatus = { available: boolean; needsUpdate: boolean; granted: boolean };
const Health = registerPlugin<{
  status(): Promise<HealthStatus>;
  requestAccess(): Promise<HealthStatus>;
  readSteps(options: {
    date: string;
    timezone: string;
  }): Promise<{ date: string; steps: number; hasData: boolean; measuredAt: string }>;
  openSettings(): Promise<void>;
}>('FitTrackHealth');

export function HealthConnect() {
  return Capacitor.getPlatform() === 'android' ? <AndroidSteps /> : null;
}

function AndroidSteps() {
  const app = useApp();
  const latest = useRef(app);
  latest.current = app;

  // Step sensor state
  const [sensorAvailable, setSensorAvailable] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);
  const [sensorSteps, setSensorSteps] = useState(0);

  // Health Connect state
  const [status, setStatus] = useState<HealthStatus>();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const enabledRef = useRef(false);
  const sensorActiveRef = useRef(false);
  const working = useRef(false);
  const alive = useRef(true);

  const hcKey = `fittrack-health:${apiOrigin()}:${app.user!.id}`;
  const sensorKey = `fittrack-sensor:${apiOrigin()}:${app.user!.id}`;
  const date = app.state!.today;
  const timezone = app.state!.profile.timezone;

  // Sync sensor steps to server
  const syncSensorSteps = useCallback(async () => {
    if (!alive.current || working.current) return;
    try {
      const reading = await StepCounter.getSteps();
      setSensorSteps(reading.steps);
      if (reading.steps > 0) {
        working.current = true;
        await api.put('/activity/health-connect', {
          date,
          steps: reading.steps,
          hasData: true,
          measuredAt: reading.measuredAt,
        });
        await latest.current.refresh();
      }
    } catch {
      // Ignore background sync errors
    } finally {
      working.current = false;
    }
  }, [date]);

  // Health Connect sync
  const syncHealthConnect = useCallback(
    async (history = false) => {
      if (working.current || !enabledRef.current || !alive.current) return;
      working.current = true;
      setBusy(true);
      try {
        const current = await Health.status();
        if (!alive.current) return;
        setStatus(current);
        if (!current.granted)
          throw new Error('Step access is not granted. Reconnect Health Connect to continue.');
        for (let offset = history ? 6 : 0; offset >= 0; offset--) {
          const result = await Health.readSteps({ date: addDays(date, -offset), timezone });
          if (!alive.current || !enabledRef.current) return;
          await api.put('/activity/health-connect', result);
        }
        if (!alive.current) return;
        await latest.current.refresh();
        setMessage('Steps synced from Health Connect.');
      } catch (e) {
        if (alive.current) setMessage(errorMessage(e));
      } finally {
        working.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [date, timezone],
  );

  useEffect(() => {
    alive.current = true;
    let cancelled = false;

    // Check device hardware step sensor
    StepCounter.isAvailable()
      .then(async ({ available }) => {
        if (cancelled) return;
        setSensorAvailable(available);
        if (available) {
          const pref = await Preferences.get({ key: sensorKey });
          const shouldStart = pref.value === 'true';
          sensorActiveRef.current = shouldStart;
          setSensorActive(shouldStart);
          if (shouldStart) {
            await StepCounter.start().catch(() => {});
            void syncSensorSteps();
          }
        }
      })
      .catch(() => {});

    // Check Health Connect
    Promise.all([Health.status(), Preferences.get({ key: hcKey })])
      .then(([current, preference]) => {
        if (cancelled) return;
        setStatus(current);
        enabledRef.current = preference.value === 'true';
        setEnabled(enabledRef.current);
        if (enabledRef.current) void syncHealthConnect();
      })
      .catch(() => {
        if (!cancelled)
          setMessage('Health Connect needs Android 9 or later and the latest app update.');
      });

    // Periodic sync every 30 seconds & on app visibility resume
    const resume = () => {
      if (document.visibilityState === 'visible') {
        if (sensorActiveRef.current) void syncSensorSteps();
        if (enabledRef.current) void syncHealthConnect();
      }
    };
    document.addEventListener('visibilitychange', resume);
    const timer = setInterval(resume, 30000);

    return () => {
      cancelled = true;
      alive.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [hcKey, sensorKey, syncHealthConnect, syncSensorSteps]);

  // Start / Stop Hardware Step Sensor
  async function toggleSensor() {
    setBusy(true);
    setMessage('');
    try {
      if (sensorActive) {
        await StepCounter.stop();
        sensorActiveRef.current = false;
        setSensorActive(false);
        await Preferences.set({ key: sensorKey, value: 'false' });
        setMessage('Step tracking paused.');
      } else {
        await StepCounter.start();
        sensorActiveRef.current = true;
        setSensorActive(true);
        await Preferences.set({ key: sensorKey, value: 'true' });
        void syncSensorSteps();
        setMessage('Automatic step counter started. Counting your steps continuously!');
      }
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Connect Health Connect
  async function connectHealthConnect() {
    setBusy(true);
    setMessage('');
    try {
      const current = await Health.requestAccess();
      setStatus(current);
      if (!current.granted) {
        setMessage(
          'Step access was not granted. You can try again or manage permissions in Health Connect.',
        );
        return;
      }
      await Preferences.set({ key: hcKey, value: 'true' });
      enabledRef.current = true;
      setEnabled(true);
      await syncHealthConnect(true);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function disconnectHealthConnect() {
    enabledRef.current = false;
    setEnabled(false);
    await Preferences.remove({ key: hcKey });
    setMessage(
      'Sync stopped. Saved step totals remain. Use Health Connect settings to revoke Android permission.',
    );
  }

  const source = app.state!.activity;

  return (
    <div className="health-connect">
      {/* 1. Phone Hardware Sensor Step Tracker */}
      <div className="health-connect-title">
        <Activity size={22} className={sensorActive ? 'text-accent' : ''} />
        <div>
          <strong>Automatic Step Tracker</strong>
          <small>
            {sensorActive
              ? `Active · ${sensorSteps > 0 ? `${sensorSteps.toLocaleString()} steps today · ` : ''}tracks continuously in your pocket`
              : 'Counts your steps automatically using your phone sensor'}
          </small>
        </div>
      </div>

      <p>
        {sensorActive
          ? 'Runs in the background even when your screen is off or the app is closed. Your steps sync automatically to your daily goals.'
          : 'Tracks your steps automatically throughout the day as you walk, without needing a smartwatch.'}
      </p>

      {sensorAvailable && (
        <div className="health-connect-actions" style={{ marginBottom: '1rem' }}>
          <Button busy={busy} variant={sensorActive ? 'secondary' : 'default'} onClick={toggleSensor}>
            {sensorActive ? <Square size={15} /> : <Play size={15} />}
            {sensorActive ? 'Stop Step Counter' : 'Start Automatic Step Counter'}
          </Button>
          {sensorActive && (
            <Button variant="ghost" busy={busy} onClick={() => syncSensorSteps()}>
              <RefreshCw size={15} />
              Sync now
            </Button>
          )}
        </div>
      )}

      {/* 2. Health Connect Integration */}
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '1rem 0' }} />

      <div className="health-connect-title">
        <Footprints size={22} />
        <div>
          <strong>Android Health Connect</strong>
          <small>
            {enabled && status?.granted
              ? 'Synced · refreshes while Home is open'
              : 'Sync steps from smartwatches or other fitness apps'}
          </small>
        </div>
      </div>

      {source?.stepsSource === 'health_connect' && (
        <p className="hint">
          {source.stepsHasData === false
            ? 'No step records in Health Connect for this day.'
            : `Last synced ${new Date(source.stepsSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </p>
      )}

      {message && <p role="status">{message}</p>}

      <div className="health-connect-actions">
        {status?.available && (!enabled || !status.granted) && (
          <Button busy={busy} variant="secondary" onClick={connectHealthConnect}>
            {enabled ? 'Reconnect Health Connect' : 'Connect Health Connect'}
          </Button>
        )}
        {enabled && status?.granted && (
          <Button variant="secondary" busy={busy} onClick={() => syncHealthConnect(true)}>
            <RefreshCw size={15} />
            Sync Health Connect
          </Button>
        )}
        {(status?.available || status?.needsUpdate) && (
          <Button
            variant="ghost"
            onClick={() => Health.openSettings().catch((e) => setMessage(errorMessage(e)))}
          >
            <Settings2 size={15} />
            {status.needsUpdate ? 'Install / update' : 'Permissions'}
          </Button>
        )}
        {enabled && (
          <Button
            variant="ghost"
            onClick={() => disconnectHealthConnect().catch((e) => setMessage(errorMessage(e)))}
          >
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
}
