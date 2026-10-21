import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import type { Forecast } from "../api/projections";
import { ProjectionChart } from "./ProjectionChart";

beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ width: 600, height: 320, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;

  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error jsdom has no ResizeObserver; recharts needs a stub to measure the container.
  global.ResizeObserver = MockResizeObserver;
});

const forecast: Forecast = {
  target_net_worth: 50000000,
  starting_net_worth: 1000000,
  as_of: "2026-01-01",
  monthly_contribution: 50000,
  disclaimer: "estimate",
  scenarios: {
    conservative: {
      annual_rate: 6,
      trajectory: [
        { date: "2026-01-01", net_worth: 1000000 },
        { date: "2026-02-01", net_worth: 1050000 },
      ],
      estimated_target_date: null,
      is_estimate: true,
    },
    base: {
      annual_rate: 10,
      trajectory: [
        { date: "2026-01-01", net_worth: 1000000 },
        { date: "2026-02-01", net_worth: 1058000 },
      ],
      estimated_target_date: null,
      is_estimate: true,
    },
    optimistic: {
      annual_rate: 14,
      trajectory: [
        { date: "2026-01-01", net_worth: 1000000 },
        { date: "2026-02-01", net_worth: 1067000 },
      ],
      estimated_target_date: null,
      is_estimate: true,
    },
  },
};

describe("ProjectionChart", () => {
  it("renders all three scenario lines distinguishably plus a separate target reference line", () => {
    const { container } = render(<ProjectionChart forecast={forecast} />);

    expect(screen.getByText("Conservative")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Optimistic")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();

    const legendIcons = container.querySelectorAll(".recharts-legend-icon");
    expect(legendIcons.length).toBe(3);
    const strokes = new Set(Array.from(legendIcons).map((icon) => icon.getAttribute("stroke")));
    expect(strokes.size).toBe(3);

    expect(container.querySelector(".recharts-reference-line-line")).not.toBeNull();
  });
});
