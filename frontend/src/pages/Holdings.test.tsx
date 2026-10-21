import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as holdingsApi from "../api/holdings";
import type { Holding } from "../api/holdings";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { Holdings } from "./Holdings";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/WorkspaceContext", () => ({
  useWorkspace: vi.fn(),
}));

vi.mock("../api/holdings");

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseWorkspace = vi.mocked(useWorkspace);

function holding(overrides: Partial<Holding>): Holding {
  return {
    id: 1,
    kind: "asset",
    category: "cash",
    label: "Savings",
    owner_type: "joint",
    owner_user: null,
    owner_email: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00Z",
    current_value: 100000,
    valuations: [{ id: 1, value: "100000.00", as_of: "2026-01-01", created_at: "2026-01-01T00:00:00Z" }],
    ...overrides,
  };
}

function renderHoldings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Holdings", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { id: 1, email: "alice@example.com", display_name: "Alice", date_joined: "" },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockedUseWorkspace.mockReturnValue({
      workspace: {
        id: 1,
        name: "W",
        created_by: 1,
        created_at: "",
        members: [
          { id: 1, email: "alice@example.com", display_name: "Alice", joined_at: "" },
          { id: 2, email: "bob@example.com", display_name: "Bob", joined_at: "" },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it("hides edit controls for a holding individually owned by the other partner", async () => {
    vi.mocked(holdingsApi.listHoldings).mockResolvedValue([
      holding({ id: 1, owner_type: "individual", owner_user: 2, owner_email: "bob@example.com", label: "Bob's Stocks" }),
    ]);

    renderHoldings();

    expect(await screen.findByText("Bob's Stocks")).toBeInTheDocument();
    expect(screen.getByText(/Read-only/i)).toBeInTheDocument();
    expect(screen.queryByText("Update value")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
  });

  it("shows edit controls for a holding individually owned by the current user", async () => {
    vi.mocked(holdingsApi.listHoldings).mockResolvedValue([
      holding({ id: 2, owner_type: "individual", owner_user: 1, owner_email: "alice@example.com", label: "Alice's Stocks" }),
    ]);

    renderHoldings();

    expect(await screen.findByText("Alice's Stocks")).toBeInTheDocument();
    expect(screen.getByText("Update value")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
  });

  it("shows edit controls for a joint holding regardless of which partner it lists", async () => {
    vi.mocked(holdingsApi.listHoldings).mockResolvedValue([
      holding({ id: 3, owner_type: "joint", label: "Joint Cash" }),
    ]);

    renderHoldings();

    expect(await screen.findByText("Joint Cash")).toBeInTheDocument();
    expect(screen.getByText("Update value")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
  });
});
