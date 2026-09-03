import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import {
  getAuthErrorMessage,
  resetPassword,
  signIn,
  signInWithGoogle,
  signUp,
} from "../services/auth";

const inputClassName =
  "w-full rounded border border-gray-600 bg-gray-900/70 p-2.5 pl-9 text-sm text-gray-100 shadow-[inset_0_4px_8px_-2px_rgba(0,0,0,0.5)] outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400";

export default function AuthPage({ initialMode = "login", onBack, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cursorPosition, setCursorPosition] = useState({
    x: "50%",
    y: "50%",
    visible: false,
  });

  const isSignup = mode === "signup";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onSuccess();
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage("Password reset instructions sent to your email.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setCursorPosition({
      x: `${event.clientX - bounds.left}px`,
      y: `${event.clientY - bounds.top}px`,
      visible: true,
    });
  };

  const hideCursorHighlight = () => {
    setCursorPosition((position) => ({ ...position, visible: false }));
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[url('/plus.svg')] bg-repeat px-4 py-4 font-sans text-gray-100"
      onPointerMove={handlePointerMove}
      onPointerLeave={hideCursorHighlight}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: cursorPosition.visible ? 1 : 0,
          background: `radial-gradient(circle 150px at ${cursorPosition.x} ${cursorPosition.y}, rgba(156, 163, 175, 0.411), rgba(75, 85, 99, 0.12) 45%, transparent 100%)`,
          mixBlendMode: "screen",
        }}
      />
      <div className="absolute inset-0 bg-[rgba(0, 0, 0, 0.658)]"></div>
      <section className="flex w-full max-w-3xl overflow-hidden rounded-xl border border-gray-800 bg-gray-950 shadow-2xl z-20">
        <div className="w-full p-4 sm:p-10 md:w-1/2">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-xs text-gray-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>

          <div className="mb-7">
            <h1 className="text-2xl font-bold">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {isSignup
                ? "Sign up to access cloud sync."
                : "Sign in to keep your data saved online."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
              Email
              <span className="relative mt-1.5 block">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClassName}
                />
              </span>
            </label>

            <label className="block text-xs font-semibold text-gray-300">
              Password
              <span className="relative mt-1.5 block">
                <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClassName} pr-10`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-2 rounded p-1 text-gray-500 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {isSignup && (
              <label className="block text-xs font-semibold text-gray-300">
                Confirm password
                <span className="relative mt-1.5 block">
                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClassName}
                  />
                </span>
              </label>
            )}

            {!isSignup && (
              <button
                type="button"
                onClick={forgotPassword}
                className="block text-xs text-blue-400 hover:text-blue-300"
              >
                Forgot your password?
              </button>
            )}

            {(error || message) && (
              <p className={`rounded border p-2.5 text-xs ${error ? "border-red-900 bg-red-950/50 text-red-300" : "border-green-900 bg-green-950/50 text-green-300"}`}>
                {error || message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-[0_6px_0_#737373] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-1.5 active:shadow-none mt-2"
            >
              {loading ? "Working..." : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-gray-600">
            <span className="h-px flex-1 bg-gray-800" /> Or <span className="h-px flex-1 bg-gray-800" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={googleLogin}
            className="flex w-full items-center justify-center gap-2 rounded border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-200 shadow-[0_5px_0_#252525] transition hover:bg-gray-800 disabled:opacity-50 active:translate-y-1 active:shadow-none"
          >
            <span className="text-base font-bold">G</span> Continue with Google
          </button>

          <p className="mt-6 text-center text-xs text-gray-500">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => changeMode(isSignup ? "login" : "signup")}
              className="font-semibold text-blue-400 hover:text-blue-300"
            >
              {isSignup ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>

        <div className="relative min-h-140 w-1/2 overflow-hidden bg-gray-800 md:blockb">
          <img
            src="/stack.avif"
            alt="Colorful building blocks representing organization and structure"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-end bg-linear-to-t from-gray-950/90 to-transparent p-8">
            <div>
              <p className="text-lg font-semibold text-gray-200">Track your opportunities better.</p>
              <p className="mt-2 max-w-xs text-sm text-gray-400">Secure cloud sync keeps your progress saved online. Start now and never lose your momentum.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}