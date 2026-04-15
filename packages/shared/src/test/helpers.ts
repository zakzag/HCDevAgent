/**
 * Shared test helpers.
 */

/** Creates a simple delay promise for testing async flows. */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

