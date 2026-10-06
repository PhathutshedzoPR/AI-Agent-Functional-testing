import { Locator } from './Locator';
import type { RunEvent } from './RunEvent';
import type { FeedTone, RunView } from './RunView';

type Line = Readonly<{ text: string; tone: FeedTone }> | null;

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

const pathOf = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
};

/**
 * The agent's own voice in the feed: one short line for the events worth narrating. Every
 * number in it comes from the event itself.
 */
export function narrateEvent(event: RunEvent, view: RunView): Line {
  switch (event.type) {
    case 'run.started':
      return { text: `Heading to ${event.targetLabel}.`, tone: 'info' };
    case 'explore.page':
      return { text: `Read ${pathOf(event.url)}.`, tone: 'info' };
    case 'plan.ready': {
      const planned = `Planned ${plural(event.plan.scenarios.length, 'scenario')}`;
      const dropped = event.warnings.length > 0 ? ' with warnings to read' : '';
      return { text: `${planned}${dropped}.`, tone: 'info' };
    }
    case 'scenario.started': {
      const title = view.scenarios.find((s) => s.id === event.scenarioId)?.title ?? 'a scenario';
      return { text: `Flying "${title}".`, tone: 'info' };
    }
    case 'step.finished':
      return narrateStep(event);
    case 'bug.reported':
      return { text: `Bug: ${event.bug.title}.`, tone: 'bad' };
    case 'run.finished':
      return event.status === 'passed'
        ? { text: 'Landed. Every check passed.', tone: 'good' }
        : { text: `Landed with ${plural(view.bugs.length, 'bug')} to look at.`, tone: 'bad' };
    case 'run.failed':
      return { text: `The run stopped: ${event.error.message}`, tone: 'bad' };
    case 'run.cancelled':
      return { text: 'Stopped on request.', tone: 'warn' };
    default:
      return null;
  }
}

function narrateStep(event: Extract<RunEvent, { type: 'step.finished' }>): Line {
  const { result } = event;
  if (result.status === 'healed' && result.healing) {
    return {
      text: `Couldn't find ${Locator.describe(result.healing.from)}, used ${Locator.describe(result.healing.to)} instead. Needs review.`,
      tone: 'warn',
    };
  }
  if (result.status === 'failed') {
    return { text: `A check failed: ${result.error ?? 'no detail'}`, tone: 'bad' };
  }
  return null;
}
