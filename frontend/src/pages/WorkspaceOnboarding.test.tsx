import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as workspacesApi from "../api/workspaces";
import { useWorkspace } from "../context/WorkspaceContext";
import { WorkspaceOnboarding } from "./WorkspaceOnboarding";

vi.mock("../context/WorkspaceContext", () => ({
  useWorkspace: vi.fn(),
}));

vi.mock("../api/workspaces");

const mockedUseWorkspace = vi.mocked(useWorkspace);

function badRequestError(detail: string) {
  return new AxiosError(
    "Bad Request",
    "400",
    undefined,
    undefined,
    // @ts-expect-error minimal response stub for isAxiosError narrowing
    { status: 400, data: { detail }, statusText: "", headers: {}, config: {} },
  );
}

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={["/onboarding"]}>
      <Routes>
        <Route path="/onboarding" element={<WorkspaceOnboarding />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WorkspaceOnboarding", () => {
  beforeEach(() => {
    mockedUseWorkspace.mockReturnValue({
      workspace: null,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("shows create and join options when there is no workspace", () => {
    renderOnboarding();
    expect(screen.getByText("Create a workspace")).toBeInTheDocument();
    expect(screen.getByText("Join with an invite code")).toBeInTheDocument();
  });

  it("reveals a shareable invite code after creating a workspace", async () => {
    vi.mocked(workspacesApi.createWorkspace).mockResolvedValue({
      id: 1,
      name: "Our Workspace",
      created_by: 1,
      created_at: "",
      members: [],
    });
    vi.mocked(workspacesApi.createInvite).mockResolvedValue({
      id: 1,
      code: "ABC12345",
      created_at: "",
      expires_at: "",
    });

    renderOnboarding();
    await userEvent.type(screen.getByLabelText("Workspace name"), "Our Workspace");
    await userEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByText("ABC12345")).toBeInTheDocument();
  });

  it("joins a workspace and redirects to the dashboard on a valid code", async () => {
    vi.mocked(workspacesApi.redeemInvite).mockResolvedValue({
      id: 1,
      name: "Our Workspace",
      created_by: 1,
      created_at: "",
      members: [],
    });

    renderOnboarding();
    await userEvent.type(screen.getByLabelText("Invite code"), "ABC12345");
    await userEvent.click(screen.getByRole("button", { name: "Join workspace" }));

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  it("shows an inline error and does not crash on an invalid code", async () => {
    vi.mocked(workspacesApi.redeemInvite).mockRejectedValue(
      badRequestError("Invalid invite code."),
    );

    renderOnboarding();
    await userEvent.type(screen.getByLabelText("Invite code"), "NOPE1234");
    await userEvent.click(screen.getByRole("button", { name: "Join workspace" }));

    expect(await screen.findByText("Invalid invite code.")).toBeInTheDocument();
    expect(screen.getByText("Join with an invite code")).toBeInTheDocument();
  });
});
