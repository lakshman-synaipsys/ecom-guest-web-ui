import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRename } from '@/lib/queries';
import { ErrorNote } from '@/components/ui';

/**
 * Sign in, which is also sign up.
 *
 * There is no password, no email and no separate registration screen: a
 * number that has never ordered before gets an account the moment its code
 * is verified. For a town grocery service, being able to receive an SMS on
 * that number is the right bar, and every extra field is a person who does
 * not finish.
 *
 * The name is asked once, after the code, and only when the server says it
 * does not have one yet - a returning shopper is never asked again.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp, signedIn, intent, clearIntent } = useAuth();
  const rename = useRename();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  /* set when the account is new and has no name yet */
  const [askName, setAskName] = useState(false);
  const [sent, setSent] = useState<{ sentTo: string; codeLength: number } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || askName) return;
    const back = intent ?? '/';
    clearIntent();
    navigate(back, { replace: true });
  }, [signedIn, askName, intent, clearIntent, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const digits = phone.replace(/\D/g, '');
  const canSend = digits.length >= 10;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const issued = await requestOtp(phone);
      setSent({ sentTo: issued.sentTo, codeLength: issued.codeLength });
      setCountdown(issued.resendAfterSeconds);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'We could not send a code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const session = await verifyOtp(phone, code);
      if (session.needsName) setAskName(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) { setAskName(false); return; }
    setBusy(true);
    setError(null);
    try {
      await rename.mutateAsync(trimmed);
      setAskName(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'We could not save that.');
    } finally {
      setBusy(false);
    }
  }

  if (askName) {
    return (
      <div className="mx-auto max-w-sm py-8">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[18px] bg-leaf
                           font-display text-2xl font-bold text-white">Q</span>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            What should we call you?
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            So the rider knows who to ask for. We only ask this once.
          </p>
        </div>

        {error && <div className="mb-4">{<ErrorNote message={error} />}</div>}

        <form
          className="space-y-3"
          onSubmit={(event) => { event.preventDefault(); void saveName(); }}
        >
          <input
            className="input"
            autoFocus
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="btn-primary btn-block" disabled={busy || !name.trim()}>
            {busy ? 'Saving...' : 'Continue'}
          </button>
          <button
            type="button"
            className="btn-block text-xs font-semibold text-ink-muted hover:text-ink"
            onClick={() => setAskName(false)}
          >
            Skip for now
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="mb-7 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[18px] bg-leaf
                         font-display text-2xl font-bold text-white">Q</span>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {sent ? 'Enter the code' : 'Your phone number'}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {sent
            ? `We sent it to ${sent.sentTo}.`
            : 'No password. We send a code, you type it in, that is the whole thing.'}
        </p>
      </div>

      {error && <div className="mb-4">{<ErrorNote message={error} />}</div>}

      {!sent ? (
        <form
          className="space-y-3"
          onSubmit={(event) => { event.preventDefault(); void send(); }}
        >
          <label className="block">
            <span className="label">Mobile number</span>
            <input
              className="input text-lg tabular tracking-wide"
              autoFocus
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <span className="hint">Indian mobile numbers. We never share it.</span>
          </label>

          <button className="btn-primary btn-block" disabled={!canSend || busy}>
            {busy ? 'Sending...' : 'Send me a code'}
          </button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => { event.preventDefault(); void verify(); }}
        >
          <label className="block">
            <span className="label">The {sent.codeLength}-digit code</span>
            <input
              className="input text-center text-2xl tabular tracking-[0.5em]"
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={sent.codeLength}
              placeholder={'0'.repeat(sent.codeLength)}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </label>

          <button
            className="btn-primary btn-block"
            disabled={code.length < 4 || busy}
          >
            {busy ? 'Checking...' : 'Continue'}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              className="text-xs font-semibold text-ink-muted hover:text-ink"
              onClick={() => { setSent(null); setCode(''); }}
            >
              Change number
            </button>

            <button
              type="button"
              className="text-xs font-semibold text-leaf disabled:text-ink-faint"
              disabled={countdown > 0 || busy}
              onClick={() => void send()}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Send another code'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-2xs leading-relaxed text-ink-faint">
        In development the code is printed in the storefront-api console.
        Look for the line marked MESSAGE (dev only).
      </p>
    </div>
  );
}
