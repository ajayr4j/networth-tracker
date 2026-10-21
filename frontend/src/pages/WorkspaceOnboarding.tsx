import { isAxiosError } from "axios";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import * as workspacesApi from "../api/workspaces";
import { useWorkspace } from "../context/WorkspaceContext";

export function WorkspaceOnboarding() {
  const { workspace, isLoading, refetch } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  if (isLoading) {
    return null;
  }

  if (workspace && !inviteCode) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const created = await workspacesApi.createWorkspace(name);
      const invite = await workspacesApi.createInvite(created.id);
      setInviteCode(invite.code);
      await refetch();
    } catch {
      setCreateError("Could not create a workspace. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setJoinError(null);
    setIsJoining(true);
    try {
      await workspacesApi.redeemInvite(code);
      await refetch();
      navigate("/dashboard");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        const detail = (err.response.data as { detail?: string }).detail;
        setJoinError(detail ?? "That invite code is invalid or expired.");
      } else {
        setJoinError("Something went wrong. Please try again.");
      }
    } finally {
      setIsJoining(false);
    }
  }

  if (inviteCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">
            Workspace created
          </h1>
          <p className="mb-2 text-sm text-slate-600">
            Share this invite code with your partner:
          </p>
          <p className="mb-6 rounded bg-slate-100 py-3 font-mono text-2xl font-semibold tracking-widest text-slate-900">
            {inviteCode}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full rounded bg-slate-900 py-2 text-white"
          >
            Go to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-wrap items-center justify-center gap-8 bg-slate-50 p-8">
      <form
        onSubmit={handleCreate}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          Create a workspace
        </h1>
        {createError && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">
            {createError}
          </p>
        )}
        <label className="mb-6 block text-sm text-slate-700">
          Workspace name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isCreating}
          className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create workspace"}
        </button>
      </form>

      <form
        onSubmit={handleJoin}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          Join with an invite code
        </h1>
        {joinError && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">
            {joinError}
          </p>
        )}
        <label className="mb-6 block text-sm text-slate-700">
          Invite code
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 uppercase"
          />
        </label>
        <button
          type="submit"
          disabled={isJoining}
          className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50"
        >
          {isJoining ? "Joining..." : "Join workspace"}
        </button>
      </form>
    </main>
  );
}
