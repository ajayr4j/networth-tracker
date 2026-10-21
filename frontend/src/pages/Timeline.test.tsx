import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as timelineApi from "../api/timeline";
import type { ActivityLogEntry } from "../api/timeline";
import { Timeline } from "./Timeline";

vi.mock("../api/timeline");

function renderTimeline() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const entries: ActivityLogEntry[] = [
  {
    id: 1,
    event_type: "holding_created",
    description: "Savings added",
    metadata: {},
    actor_email: "alice@example.com",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    event_type: "valuation_updated",
    description: "Savings value updated",
    metadata: {},
    actor_email: "alice@example.com",
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: 3,
    event_type: "holding_archived",
    description: "Old FD archived",
    metadata: {},
    actor_email: "alice@example.com",
    created_at: "2026-01-03T00:00:00Z",
  },
  {
    id: 4,
    event_type: "milestone_achieved",
    description: "Milestone reached: ₹25L",
    metadata: {},
    actor_email: null,
    created_at: "2026-01-04T00:00:00Z",
  },
  {
    id: 5,
    event_type: "checkin_created",
    description: "Monthly check-in added",
    metadata: {},
    actor_email: "bob@example.com",
    created_at: "2026-01-05T00:00:00Z",
  },
  {
    id: 6,
    event_type: "partner_joined",
    description: "Bob joined the workspace",
    metadata: {},
    actor_email: "bob@example.com",
    created_at: "2026-01-06T00:00:00Z",
  },
];

describe("Timeline", () => {
  it("renders a human-readable label for every event type", async () => {
    vi.mocked(timelineApi.getTimeline).mockResolvedValue(entries);

    renderTimeline();

    await screen.findByText("Savings added");
    const activity = within(
      screen.getByRole("heading", { name: "Activity" }).closest("div") as HTMLElement,
    );
    expect(activity.getByText("Holding added")).toBeInTheDocument();
    expect(activity.getByText("Valuation updated")).toBeInTheDocument();
    expect(activity.getByText("Holding archived")).toBeInTheDocument();
    expect(activity.getByText("Milestone achieved")).toBeInTheDocument();
    expect(activity.getByText("Monthly check-in")).toBeInTheDocument();
    expect(activity.getByText("Partner joined")).toBeInTheDocument();
  });

  it("renders events newest first", async () => {
    vi.mocked(timelineApi.getTimeline).mockResolvedValue(entries);

    renderTimeline();

    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Savings added");
    expect(items[items.length - 1]).toHaveTextContent("Bob joined the workspace");
  });

  it("submits a check-in and refreshes the timeline without a full reload", async () => {
    vi.mocked(timelineApi.getTimeline).mockResolvedValue([]);
    vi.mocked(timelineApi.createCheckIn).mockResolvedValue({
      id: 10,
      month: "2026-01-01",
      notes: "On track",
      actions: "Increase SIP",
      created_by_email: "alice@example.com",
      created_at: "2026-01-10T00:00:00Z",
    });

    renderTimeline();

    await screen.findByText("No activity yet.");

    fireEvent.change(screen.getByLabelText(/Notes/i), {
      target: { value: "On track" },
    });
    fireEvent.change(screen.getByLabelText(/Action items/i), {
      target: { value: "Increase SIP" },
    });

    vi.mocked(timelineApi.getTimeline).mockResolvedValue([
      {
        id: 10,
        event_type: "checkin_created",
        description: "Monthly check-in added",
        metadata: {},
        actor_email: "alice@example.com",
        created_at: "2026-01-10T00:00:00Z",
      },
    ]);

    fireEvent.click(screen.getByText("Add check-in"));

    await waitFor(() => {
      expect(timelineApi.createCheckIn).toHaveBeenCalled();
    });
    expect(await screen.findByText("Monthly check-in added")).toBeInTheDocument();
  });
});
