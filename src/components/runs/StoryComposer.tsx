'use client';

import { INPUT_LIMITS } from '@/core/domain';
import { STORY_SUGGESTIONS } from './storySuggestions';

type Props = Readonly<{ story: string; onChange: (story: string) => void }>;

/** Step two: what to test, with suggestion cards that fill the composer. */
export function StoryComposer({ story, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label htmlFor="story" className="block text-lg font-semibold">
        What should I test?
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {STORY_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.title}
            type="button"
            onClick={() => onChange(suggestion.story)}
            className="rounded-xl border border-divider bg-raised p-3 text-left text-sm hover:border-control focus-visible:outline-2 focus-visible:outline-signal"
          >
            {suggestion.title}
          </button>
        ))}
      </div>
      <textarea
        id="story"
        value={story}
        maxLength={INPUT_LIMITS.storyMaxChars}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder="A user story, ideally with acceptance criteria as bullet points. Leave it empty to test the main flows."
        className="w-full rounded-xl border border-control bg-surface p-3 text-sm"
      />
      <p className="text-right text-xs text-muted">
        {story.length} / {INPUT_LIMITS.storyMaxChars}
      </p>
    </div>
  );
}
