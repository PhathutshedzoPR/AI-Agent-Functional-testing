import { STEP_STATUS_LABELS, type ScenarioView } from '@/core/domain';
import { cn } from '@/lib/cn';
import { Waypoint } from './Waypoint';

type Props = Readonly<{
  scenarios: readonly ScenarioView[];
  selectedStepId?: string | null;
  onSelect?: (stepId: string) => void;
  /** Light the waypoints up one after another (the landing page's one orchestrated moment). */
  animate?: boolean;
  tone?: 'dark' | 'light';
}>;

const REVEAL_STEP_SECONDS = 0.12;

/** The run as a flight: one route per scenario, one waypoint per step. */
export function FlightPath({
  scenarios,
  selectedStepId = null,
  onSelect,
  animate = false,
  tone = 'dark',
}: Props) {
  if (scenarios.length === 0) {
    return (
      <p className={tone === 'dark' ? 'text-muted' : 'text-ink/70'}>
        The flight path appears once the agent has planned its route.
      </p>
    );
  }
  let order = 0;
  return (
    // Read-only paths (the landing page) have no buttons inside, so the scroller itself takes
    // focus to let keyboard users scroll it sideways (WCAG 2.1.1).
    <ol
      aria-label="Flight path"
      tabIndex={onSelect ? undefined : 0}
      className={cn(
        'space-y-4 overflow-x-auto pb-2 focus-visible:outline-2',
        tone === 'dark' ? 'focus-visible:outline-signal' : 'focus-visible:outline-forest',
      )}
    >
      {scenarios.map((scenario) => (
        <li key={scenario.id} className="min-w-max">
          <p
            className={cn('mb-1 text-sm font-semibold', tone === 'dark' ? 'text-text' : 'text-ink')}
          >
            {scenario.title}
            <span
              className={cn('ml-2 font-normal', tone === 'dark' ? 'text-muted' : 'text-ink/60')}
            >
              {STEP_STATUS_LABELS[scenario.state]}
            </span>
          </p>
          <div className="relative flex items-center gap-3 pt-3 pl-1">
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1/2 right-2 left-2 mt-1.5 h-0.5',
                tone === 'dark' ? 'bg-divider' : 'bg-ink/15',
              )}
            />
            {scenario.steps.map((step, index) => (
              <span key={step.id} className="relative">
                <Waypoint
                  step={step}
                  index={index}
                  total={scenario.steps.length}
                  selected={selectedStepId === step.id}
                  onSelect={onSelect}
                  revealDelay={animate ? order++ * REVEAL_STEP_SECONDS : undefined}
                />
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
