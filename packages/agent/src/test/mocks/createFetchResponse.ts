/**
 * Creates a minimal fetch Response-like object for unit tests.
 */
export const createFetchResponse = (ok: boolean, body: unknown, status = 200) => ({
    ok,
    status,
    json: async (): Promise<unknown> => body,
    text: async (): Promise<string> => (
        typeof body === 'string'
            ? body
            : JSON.stringify(body)
    ),
});

