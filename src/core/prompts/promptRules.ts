/** Rules shared by the plan and heal prompts, so both describe locators the same way. */

export const LOCATOR_RULES = [
  'Find elements the way a person would describe them. Prefer, in order: "role" with the accessible name, "label", "placeholder", "text", "testId". Never use CSS or XPath.',
  'Copy names exactly from the snapshot, including capitals and spacing.',
  'A locator must match exactly one element. When a control repeats (for example an "Add" button on every product card), set "within" to the container role and text that makes it unique, such as {"role":"article","hasText":"<the product name>"}.',
  'Set "role" only when "by" is "role"; otherwise set it to null. Set "exact" to false unless a shorter name would also match another element.',
].join('\n- ');

export const ACTION_RULES = [
  'navigate: target null, value is a path on the same site such as "/shop/cart".',
  'click, check: target required, value null.',
  'fill: target required, value is the text to type.',
  'select: target required, value is the visible option label.',
  'press: target optional, value is one key: Enter, Tab, Escape, Space, Backspace, Delete, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, End, PageUp or PageDown.',
  'assertVisible, assertHidden: target required, value null.',
  'assertText: target optional (null checks the whole page), value is text that must appear.',
  'assertUrl: target null, value is a path or fragment the URL must contain.',
  'assertValue: target required, value is the exact field value expected.',
].join('\n- ');
