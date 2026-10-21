import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as projectionsApi from "../api/projections";
import { Projections } from "./Projections";

vi.mock("../api/projections");

function renderProjections() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Projections />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const settings = {
  monthly_contribution: "50000.00",
  conservative_rate: "6.00",
  base_rate: "10.00",
  optimistic_rate: "14.00",
  updated_at: "2026-01-01T00:00:00Z",
};

const forecast = {
  target_net_worth: 50000000,
  starting_net_worth: 1000000,
  as_of: "2026-01-01",
  monthly_contribution: 50000,
  disclaimer: "These projections are estimates based on your inputs and are not guaranteed.",
  scenarios: {
    conservative: {
      annual_rate: 6,
      trajectory: [{ date: "2026-01-01", net_worth: 1000000 }],
      estimated_target_date: null,
      is_estimate: true,
    },
    base: {
      annual_rate: 10,
      trajectory: [{ date: "2026-01-01", net_worth: 1000000 }],
      estimated_target_date: "2045-06-01",
      is_estimate: true,
    },
    optimistic: {
      annual_rate: 14,
      trajectory: [{ date: "2026-01-01", net_worth: 1000000 }],
      estimated_target_date: "2040-02-01",
      is_estimate: true,
    },
  },
};

describe("Projections", () => {
  it("always shows the estimate disclaimer, not just on hover", async () => {
    vi.mocked(projectionsApi.getSettings).mockResolvedValue(settings);
    vi.mocked(projectionsApi.getForecast).mockResolvedValue(forecast);

    renderProjections();

    expect(
      await screen.findByText(/estimates based on your inputs and are not guaranteed/i),
    ).toBeInTheDocument();
  });

  it("lists an estimated target date per scenario", async () => {
    vi.mocked(projectionsApi.getSettings).mockResolvedValue(settings);
    vi.mocked(projectionsApi.getForecast).mockResolvedValue(forecast);

    renderProjections();

    expect(await screen.findByText("Est. 2045-06-01")).toBeInTheDocument();
    expect(await screen.findByText("Est. 2040-02-01")).toBeInTheDocument();
    expect(await screen.findByText("Not reached within 40 years")).toBeInTheDocument();
  });

  it("submits the updated settings payload shape when the form is saved", async () => {
    vi.mocked(projectionsApi.getSettings).mockResolvedValue(settings);
    vi.mocked(projectionsApi.getForecast).mockResolvedValue(forecast);
    vi.mocked(projectionsApi.updateSettings).mockResolvedValue(settings);

    renderProjections();

    const monthlyInput = await screen.findByLabelText(/Monthly contribution/i);
    fireEvent.change(monthlyInput, { target: { value: "75000" } });
    fireEvent.click(screen.getByText("Save and recalculate"));

    await waitFor(() => {
      expect(projectionsApi.updateSettings).toHaveBeenCalled();
    });
    expect(vi.mocked(projectionsApi.updateSettings).mock.calls[0][0]).toEqual({
      monthly_contribution: "75000",
      conservative_rate: "6.00",
      base_rate: "10.00",
      optimistic_rate: "14.00",
    });
  });
});
