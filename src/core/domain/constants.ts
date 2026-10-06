/** Single home for enumerations, input limits and status labels (CLAUDE.md section 3, DRY 5). */

export const ACTION_TYPES = [
  'navigate',
  'click',
  'check',
  'fill',
  'select',
  'press',
  'assertVisible',
  'assertHidden',
  'assertText',
  'assertUrl',
  'assertValue',
] as const;

/** Actions that touch an element and may be self-healed when its locator breaks. */
export const INTERACTION_ACTIONS = ['click', 'check', 'fill', 'select', 'press'] as const;

/** Planner preference order: role and name first, test id last. */
export const LOCATOR_STRATEGIES = ['role', 'label', 'placeholder', 'text', 'testId'] as const;

/** Every role Playwright's getByRole accepts. */
export const ARIA_ROLES = [
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'blockquote',
  'button',
  'caption',
  'cell',
  'checkbox',
  'code',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'deletion',
  'dialog',
  'directory',
  'document',
  'emphasis',
  'feed',
  'figure',
  'form',
  'generic',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'insertion',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'meter',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'paragraph',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'strong',
  'subscript',
  'superscript',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'time',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
] as const;

export const SCENARIO_KINDS = ['happy', 'negative', 'edge'] as const;
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export const SEVERITIES = ['high', 'medium', 'low'] as const;

export const STEP_STATUSES = ['passed', 'healed', 'failed', 'skipped'] as const;
export const SCENARIO_STATUSES = ['passed', 'healed', 'failed'] as const;
export const RUN_STATUSES = [
  'queued',
  'running',
  'passed',
  'failed',
  'error',
  'cancelled',
] as const;
export const HEALING_METHODS = ['rule', 'llm'] as const;
export const FINDING_KINDS = ['console-error', 'page-error', 'http-error', 'broken-link'] as const;

/** Severity when a scenario of this kind fails (CLAUDE.md section 6, bug reports). */
export const DEFAULT_SEVERITY = { happy: 'high', negative: 'medium', edge: 'low' } as const;

export const INPUT_LIMITS = {
  storyMaxChars: 2_000,
  urlMaxChars: 2_048,
  locatorValueMaxChars: 200,
  stepValueMaxChars: 500,
} as const;

export const STEP_STATUS_LABELS = {
  pending: 'Pending',
  running: 'Running',
  passed: 'Passed',
  healed: 'Healed',
  failed: 'Failed',
  skipped: 'Skipped',
} as const;

export const RUN_STATUS_LABELS = {
  queued: 'Queued',
  running: 'Running',
  passed: 'Passed',
  failed: 'Bugs found',
  error: 'Run failed',
  cancelled: 'Stopped',
} as const;
