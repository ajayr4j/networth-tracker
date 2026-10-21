import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as holdingsApi from "../api/holdings";
import { useAuth } from "../context/AuthContext";
import { formatINR } from "../lib/format";
import { Dashboard } from "./Dashboard";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/holdings");

const mockedUseAuth = vi.mocked(useAuth);

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { id: 1, email: "alice@example.com", display_name: "Alice", date_joined: "" },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("renders net worth figures that match the backend response exactly", async () => {
    vi.mocked(holdingsApi.getDashboard).mockResolvedValue({
      target_net_worth: 50000000,
      net_worth: 25000000,
      remaining: 25000000,
      percent_complete: 50,
      historical_series: [{ date: "2026-01-01", net_worth: 25000000 }],
    });

    renderDashboard();

    expect(await screen.findByText(formatINR(25000000))).toBeInTheDocument();
    expect(screen.getByText("50% complete")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("renders an empty chart message when there is no historical data", async () => {
    vi.mocked(holdingsApi.getDashboard).mockResolvedValue({
      target_net_worth: 50000000,
      net_worth: 0,
      remaining: 50000000,
      percent_complete: 0,
      historical_series: [],
    });

    renderDashboard();

    expect(
      await screen.findByText(/No historical data yet/i),
    ).toBeInTheDocument();
  });
});
