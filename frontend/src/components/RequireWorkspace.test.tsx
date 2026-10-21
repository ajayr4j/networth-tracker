import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RequireWorkspace } from "./RequireWorkspace";
import { useWorkspace } from "../context/WorkspaceContext";

vi.mock("../context/WorkspaceContext", () => ({
  useWorkspace: vi.fn(),
}));

const mockedUseWorkspace = vi.mocked(useWorkspace);

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/onboarding" element={<div>Onboarding page</div>} />
        <Route
          path="/dashboard"
          element={
            <RequireWorkspace>
              <div>Secret dashboard</div>
            </RequireWorkspace>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireWorkspace", () => {
  it("renders nothing while workspace state is loading", () => {
    mockedUseWorkspace.mockReturnValue({
      workspace: null,
      isLoading: true,
      refetch: vi.fn(),
    });
    renderGuarded();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Onboarding page")).not.toBeInTheDocument();
  });

  it("redirects to /onboarding when there is no workspace", () => {
    mockedUseWorkspace.mockReturnValue({
      workspace: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderGuarded();
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("renders the guarded content when a workspace exists", () => {
    mockedUseWorkspace.mockReturnValue({
      workspace: { id: 1, name: "W", created_by: 1, created_at: "", members: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    renderGuarded();
    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });
});
