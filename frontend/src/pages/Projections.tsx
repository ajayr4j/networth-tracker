import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as projectionsApi from "../api/projections";
import type { Scenario } from "../api/projections";
import { ProjectionChart } from "../components/ProjectionChart";
import { ProjectionForm } from "../components/ProjectionForm";
import { formatINR } from "../lib/format";

const SCENARIO_LABELS: Record<"conservative" | "base" | "optimistic", string> = {
  conservative: "Conservative",
  base: "Base",
  optimistic: "Optimistic",
};

function ScenarioDate({ name, scenario }: { name: string; scenario: Scenario }) {
  return (
    <li className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
      <span className="font-medium text-slate-700">
        {name} ({scenario.annual_rate}%)
      </span>
      <span className="text-slate-600">
        {scenario.estimated_target_date
          ? `Est. ${scenario.estimated_target_date}`
          : "Not reached within 40 years"}
      </span>
    </li>
  );
}

export function Projections() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["projections", "settings"],
    queryFn: projectionsApi.getSettings,
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ["projections", "forecast"],
    queryFn: projectionsApi.getForecast,
  });

  const updateSettings = useMutation({
    mutationFn: projectionsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projections"] });
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Wealth Projection</h1>

        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          These projections are estimates based on your inputs and are not guaranteed.
        </p>

        {settingsLoading || !settings ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <ProjectionForm
            settings={settings}
            onSubmit={(data) => updateSettings.mutateAsync(data)}
          />
        )}

        {forecastLoading || !forecast ? (
          <p className="text-slate-500">Loading forecast...</p>
        ) : (
          <>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="mb-2 text-sm text-slate-500">
                Starting net worth: {formatINR(forecast.starting_net_worth)}
              </p>
              <ProjectionChart forecast={forecast} />
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Estimated target dates
              </h2>
              <ul className="space-y-2">
                {(Object.keys(SCENARIO_LABELS) as Array<keyof typeof SCENARIO_LABELS>).map(
                  (key) => (
                    <ScenarioDate
                      key={key}
                      name={SCENARIO_LABELS[key]}
                      scenario={forecast.scenarios[key]}
                    />
                  ),
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
