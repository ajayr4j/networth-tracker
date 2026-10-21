import { isAxiosError } from "axios";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type FieldErrors = Record<string, string[]>;

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);
    try {
      await register({ email, password, display_name: displayName });
      navigate("/");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        setFieldErrors(err.response.data as FieldErrors);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          Create an account
        </h1>
        {formError && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        <label className="mb-3 block text-sm text-slate-700">
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="mb-3 block text-sm text-slate-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {fieldErrors.email && (
            <span className="mt-1 block text-xs text-red-600">
              {fieldErrors.email.join(" ")}
            </span>
          )}
        </label>
        <label className="mb-6 block text-sm text-slate-700">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {fieldErrors.password && (
            <span className="mt-1 block text-xs text-red-600">
              {fieldErrors.password.join(" ")}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="text-slate-900 underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
