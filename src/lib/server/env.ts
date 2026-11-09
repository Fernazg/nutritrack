import "server-only";

/**
 * Server-only access to secrets. Importing this module from a Client
 * Component fails the build, so API keys can never reach the browser.
 * Never prefix these variables with NEXT_PUBLIC_.
 */
export const serverEnv = {
  get aiApiKey(): string | undefined {
    return process.env.AI_API_KEY;
  },
};
