import { describe, expect, it } from 'vitest';
import { BugWordsmith } from '@/core/agent';
import { LlmError } from '@/core/errors';
import { FakeLanguageModel } from '../../../fakes/FakeLanguageModel';
import { aBug, aScenario } from '../../../fakes/domainBuilders';

const bugs = [
  aBug({ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', title: 'Order two kotas: Total failed' }),
  aBug({ id: '16fd2706-8baf-433b-82eb-8c7fada847da', title: 'Bad phone: Check failed' }),
];
const scenarios = [aScenario()];

describe('BugWordsmith', () => {
  it('rewrites titles only, matched by position, in one call', async () => {
    const llm = new FakeLanguageModel().answer('report', {
      bugs: [
        { id: 'bug-2', title: '  Checkout accepts letters in the cellphone number ' },
        { id: 'bug-1', title: 'Cart total ignores quantity' },
      ],
    });

    const reworded = await new BugWordsmith().reword(bugs, scenarios, llm);

    expect(reworded.map((bug) => bug.title)).toEqual([
      'Cart total ignores quantity',
      'Checkout accepts letters in the cellphone number',
    ]);
    expect(reworded.map(({ title: _title, ...rest }) => rest)).toEqual(
      bugs.map(({ title: _title, ...rest }) => rest),
    );
    expect(llm.requests).toHaveLength(1);
    expect(llm.requests[0]?.prompt).not.toMatch(/[\da-f]{8}-[\da-f]{4}-/);
    expect(llm.requests[0]?.prompt).toContain('"scenario": "Order two kotas"');
  });

  it('keeps template titles the model left out, and caps long ones', async () => {
    const llm = new FakeLanguageModel().answer('report', {
      bugs: [
        { id: 'bug-1', title: 'x'.repeat(300) },
        { id: 'bug-9', title: 'stray' },
      ],
    });

    const reworded = await new BugWordsmith().reword(bugs, scenarios, llm);

    expect(reworded[0]?.title).toHaveLength(100);
    expect(reworded[1]?.title).toBe('Bad phone: Check failed');
  });

  it('falls back to the templates when the model fails, and skips the call with no bugs', async () => {
    const failing = new FakeLanguageModel().answer('report', () => {
      throw new LlmError('budget spent');
    });
    const unused = new FakeLanguageModel();

    expect(await new BugWordsmith().reword(bugs, scenarios, failing)).toEqual(bugs);
    expect(await new BugWordsmith().reword([], scenarios, unused)).toEqual([]);
    expect(unused.requests).toHaveLength(0);
  });

  it('lets programming errors through', async () => {
    const broken = new FakeLanguageModel().answer('report', () => {
      throw new TypeError('bug');
    });

    await expect(new BugWordsmith().reword(bugs, scenarios, broken)).rejects.toBeInstanceOf(
      TypeError,
    );
  });
});
