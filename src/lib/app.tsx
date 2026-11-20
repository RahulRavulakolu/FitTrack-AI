import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import axios from 'axios';
import { apiOrigin, isNative, SecureSession, nativeTheme } from './native';
import type { FitnessProfile, Split } from '../../shared/domain';
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 75000 });
api.interceptors.request.use(async (config) => {
  if (/\/foods\/analyze|\/assistant|\/generate$/.test(config.url || '')) config.timeout = 195000;
  if (isNative) {
    config.baseURL = `${apiOrigin()}/api`;
    config.adapter = 'xhr';
    config.withCredentials = false;
    config.headers.set('X-FitTrack-Native', '1');
    const { token } = await SecureSession.read();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});
api.interceptors.response.use(
  async (response) => {
    if (isNative) {
      const token = response.headers['x-fittrack-session'];
      if (typeof token === 'string') await SecureSession.write({ token });
      if (['/auth/logout', '/auth/account', '/auth/reset'].includes(response.config.url || ''))
        await SecureSession.clear();
    }
    return response;
  },
  async (error) => {
    if (isNative && error.response?.status === 401) await SecureSession.clear();
    return Promise.reject(error);
  },
);
export const errorMessage = (e: unknown) =>
  axios.isAxiosError(e)
    ? e.response?.data?.error || 'Could not connect. Check your connection and try again.'
    : e instanceof Error
      ? e.message
      : 'Something went wrong.';
export type User = {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  onboardingCompleted: boolean;
};
export type State = {
  user: User;
  profile: FitnessProfile & {
    startDate: string;
    bmr: number;
    tdee: number;
    targets: { calories: number; protein: number; carbs: number; fats: number; water: number };
  };
  today: string;
  date: string;
  settings: any;
  foods: any[];
  totals: any;
  splits: (Split & { effective: string })[];
  plan: any;
  setLogs: any[];
  activity: any;
  water: number;
  waterLogs: any[];
  weights: any[];
  expenses: any[];
  favorites: any[];
  records: any[];
  histories: any[];
  streak: any;
  reports: any[];
  budget: any;
  services: any;
};
type AppContext = {
  user: User | null;
  setUser: (u: User | null) => void;
  state: State | null;
  setState: (s: State) => void;
  loading: boolean;
  failure: string;
  busy: boolean;
  refresh: (date?: string) => Promise<void>;
  mutate: (method: string, url: string, data?: unknown, message?: string) => Promise<any>;
  toast: (text: string, error?: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
};
const Context = createContext<AppContext>(null!);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, updateUser] = useState<User | null>(null),
    [state, setState] = useState<State | null>(null),
    [loading, setLoading] = useState(true),
    [failure, setFailure] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null),
    [theme, setTheme] = useState(localStorage.getItem('fittrack-theme') || 'dark');
  const stateRef = useRef(state);
  stateRef.current = state;
  const lock = useRef(false);
  const generation = useRef(0);
  function setUser(next: User | null) {
    if (!next) {
      generation.current++;
      setState(null);
    }
    updateUser(next);
  }
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function toast(text: string, error = false) {
    setNotice({ text, error });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }
  async function refresh(date?: string) {
    const currentGeneration = generation.current;
    try {
      const { data } = await api.get('/state', { params: date ? { date } : {} });
      if (currentGeneration !== generation.current) return;
      setState(data);
      setUser(data.user);
      setTheme(data.settings?.theme || 'dark');
      setFailure('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) setUser(null);
      throw error;
    }
  }
  async function mutate(
    method: string,
    url: string,
    data?: unknown,
    message = 'Saved successfully',
  ) {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    try {
      const response = await api.request({ method, url, data });
      if (url != '/auth/logout' && url != '/auth/account') await refresh(stateRef.current?.date);
      if (message) toast(message);
      return response.data;
    } catch (e) {
      toast(errorMessage(e), true);
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    api
      .get('/auth/me')
      .then(async ({ data }) => {
        setUser(data.user);
        setTheme(data.settings?.theme || 'dark');
        if (data.user.onboardingCompleted) await refresh();
      })
      .catch((e) => {
        if (e.response?.status !== 401) setFailure(errorMessage(e));
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      void nativeTheme(resolved);
    };
    apply();
    localStorage.setItem('fittrack-theme', theme);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    if (!user?.onboardingCompleted) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible')
        refresh(
          stateRef.current?.date === stateRef.current?.today ? undefined : stateRef.current?.date,
        ).catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [user?.id, user?.onboardingCompleted]);
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        state,
        setState,
        loading,
        failure,
        busy,
        refresh,
        mutate,
        toast,
        theme,
        setTheme,
      }}
    >
      {children}
      {notice && (
        <div
          className={`toast ${notice.error ? 'error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
          <button onClick={() => setNotice(null)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
