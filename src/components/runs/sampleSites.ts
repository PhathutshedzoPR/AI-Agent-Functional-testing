/**
 * Public sites built for practising test automation, offered on the new run page when the server
 * allows their host. The story text is recorded for replay, so keep it word for word.
 */
export const SAMPLE_SITES = [
  {
    host: 'demo.playwright.dev',
    name: "Playwright's TodoMVC demo",
    url: 'https://demo.playwright.dev/todomvc/',
    story:
      'As a busy person I want to keep a to-do list.\n- Adding a to-do shows it in the list\n- Completing a to-do marks it as done\n- The Active filter hides completed to-dos',
  },
] as const;

export type SampleSite = (typeof SAMPLE_SITES)[number];
