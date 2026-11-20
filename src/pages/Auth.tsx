import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  ScanLine,
  Dumbbell,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api, errorMessage, useApp } from '../lib/app';
import { Brand, Button, Field } from '../components/ui';
import { ConnectionButton } from '../components/MobileGate';
export function AuthPage({ mode = 'login' }: { mode?: 'login' | 'register' | 'forgot' | 'reset' }) {
  const { setUser, refresh } = useApp(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<any>();
  const signup = mode === 'register',
    reset = mode === 'reset',
    forgot = mode === 'forgot';
  async function submit(values: any) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const endpoint = signup ? 'register' : reset ? 'reset' : forgot ? 'forgot' : 'login';
      const { data } = await api.post(`/auth/${endpoint}`, {
        ...values,
        ...(reset ? { token: params.get('token') } : {}),
      });
      if (forgot) {
        setSuccess(data.message);
      } else if (reset) {
        setSuccess('Password reset. You can sign in with your new password.');
      } else {
        setUser(data.user);
        if (data.user.onboardingCompleted) await refresh();
        navigate(data.user.onboardingCompleted ? '/' : '/onboarding', { replace: true });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Brand />
        <div className="auth-story-main">
          <span className="pill">
            <span className="status-dot" />
            YOUR EVERYDAY, UPGRADED
          </span>
          <h1>
            A little stronger.
            <br />A little healthier.
            <br />
            <em>Every day.</em>
          </h1>
          <p>
            Your nutrition, training and progress.
            <br />
            Finally, working together.
          </p>
          <div className="journey-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="art-center">
              <Activity size={64} strokeWidth={1.3} />
            </div>
            <div className="art-tag tag-one">
              <ScanLine size={20} />
              <span>Eat with intention</span>
            </div>
            <div className="art-tag tag-two">
              <Dumbbell size={20} />
              <span>Train with purpose</span>
            </div>
            <div className="art-tag tag-three">
              <ArrowUpRight size={20} />
              <span>See your progress</span>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <span>BUILT AROUND YOU.</span>
          <span>FITTRACK AI © {new Date().getFullYear()}</span>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-top">
          <ConnectionButton />
          {signup ? 'Already part of the club?' : 'New to FitTrack?'}{' '}
          <Link to={signup ? '/login' : '/register'}>
            {signup ? 'Sign in' : 'Join us'} <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="auth-form">
          <span className="eyebrow">
            {signup
              ? 'YOUR NEXT CHAPTER'
              : forgot || reset
                ? 'LET’S GET YOU BACK'
                : 'GOOD TO HAVE YOU HERE'}
          </span>
          <h1>
            {signup
              ? 'Build your better everyday.'
              : forgot
                ? 'Forgot your password?'
                : reset
                  ? 'A fresh start.'
                  : 'Welcome back.'}
          </h1>
          <p className="muted">
            {signup
              ? 'Create your account. We’ll build a plan around your life.'
              : forgot
                ? 'Enter your email and we’ll send a reset link.'
                : reset
                  ? 'Choose a new password to secure your account.'
                  : 'Small steps. Real progress. Let’s keep going.'}
          </p>
          {success ? (
            <div className="success-box">
              <Check />
              {success}
              {reset && <Link to="/login">Back to sign in →</Link>}
            </div>
          ) : (
            <form onSubmit={handleSubmit(submit)}>
              {signup && (
                <Field
                  label="Full name"
                  placeholder="Your full name"
                  autoComplete="name"
                  {...register('name', { required: true, minLength: 2, maxLength: 80 })}
                />
              )}
              {!reset && (
                <Field
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email', { required: true, maxLength: 254 })}
                />
              )}
              {!forgot && (
                <>
                  <label className="field">
                    <span>{reset ? 'New password' : 'Password'}</span>
                    <div className="password-input">
                      <input
                        type={show ? 'text' : 'password'}
                        placeholder={
                          signup || reset ? 'At least 10 characters' : 'Enter your password'
                        }
                        autoComplete={signup || reset ? 'new-password' : 'current-password'}
                        {...register('password', {
                          required: true,
                          minLength: signup || reset ? 10 : 1,
                          maxLength: 72,
                        })}
                      />
                      <button
                        type="button"
                        aria-label={show ? 'Hide password' : 'Show password'}
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  {(signup || reset) && (
                    <Field
                      label="Confirm password"
                      type="password"
                      placeholder="Enter your password again"
                      autoComplete="new-password"
                      {...register('confirmPassword', {
                        required: true,
                        validate: (v) => v === watch('password'),
                      })}
                    />
                  )}
                </>
              )}
              {Object.keys(errors).length > 0 && (
                <p className="form-error">
                  Check the fields above. Passwords must match and contain 10–72 characters.
                </p>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {mode === 'login' && (
                <Link className="forgot-link" to="/forgot-password">
                  Forgot password?
                </Link>
              )}
              <Button type="submit" busy={busy} className="full">
                {signup
                  ? 'Create your account'
                  : forgot
                    ? 'Send reset link'
                    : reset
                      ? 'Reset password'
                      : 'Sign in'}
                <ArrowRight size={19} />
              </Button>
            </form>
          )}
          {(forgot || reset) && (
            <Link className="back-link" to="/login">
              ← Back to sign in
            </Link>
          )}
          <div className="auth-note">
            <span className="tiny-check">
              <Check size={13} />
            </span>
            Your journey is personal. Your data stays yours.
          </div>
        </div>
        <div className="auth-bottom">Fitness that fits your life.</div>
      </main>
    </div>
  );
}
