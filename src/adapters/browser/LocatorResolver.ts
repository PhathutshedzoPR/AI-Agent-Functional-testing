import type { Locator as PlaywrightLocator, Page } from 'playwright';
import type { Locator } from '@/core/domain';
import { toLocatorCalls, type LocatorCall } from './locatorCalls';

type Scope = Page | PlaywrightLocator;

/** Turns a semantic Locator into a Playwright locator (getBy* only, never CSS or XPath). */
export class LocatorResolver {
  resolve(page: Page, locator: Locator): PlaywrightLocator {
    let scope: Scope = page;
    for (const call of toLocatorCalls(locator)) {
      scope = this.apply(scope, call);
    }
    // toLocatorCalls always ends with a getBy* call, so scope is a locator by now.
    return scope as PlaywrightLocator;
  }

  private apply(scope: Scope, call: LocatorCall): PlaywrightLocator {
    switch (call.method) {
      case 'getByRole':
        return call.name === null
          ? scope.getByRole(call.role)
          : scope.getByRole(call.role, { name: call.name, exact: call.exact });
      case 'filter':
        return (scope as PlaywrightLocator).filter({ hasText: call.hasText });
      case 'getByLabel':
        return scope.getByLabel(call.text, { exact: call.exact });
      case 'getByPlaceholder':
        return scope.getByPlaceholder(call.text, { exact: call.exact });
      case 'getByText':
        return scope.getByText(call.text, { exact: call.exact });
      case 'getByTestId':
        return scope.getByTestId(call.testId);
    }
  }
}
