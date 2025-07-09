import { z } from 'zod';

import type { Context } from '../context.js';
import { defineTool, type Tool } from './tool.js';

const setCookieInputSchema = z.object({
  cookies: z
    .array(
      z.object({
        name: z.string().describe('The name of the cookie.'),
        value: z.string().describe('The value of the cookie.'),
        url: z
          .string()
          .url()
          .optional()
          .describe(
            'The URL of the cookie. If specified, it must be a valid URL. Either url or domain/path should be specified.'
          ),
        domain: z
          .string()
          .optional()
          .describe(
            'The domain of the cookie. Required if url is not provided.'
          ),
        path: z
          .string()
          .optional()
          .describe('The path of the cookie. Required if url is not provided.'),
        expires: z
          .number()
          .optional()
          .describe(
            'The expiration date of the cookie as a Unix timestamp in seconds since the epoch.'
          ),
        httpOnly: z
          .boolean()
          .optional()
          .describe('Whether the cookie is HTTP only.'),
        secure: z
          .boolean()
          .optional()
          .describe('Whether the cookie is secure.'),
        sameSite: z
          .enum(['Strict', 'Lax', 'None'])
          .optional()
          .describe('The SameSite attribute of the cookie.'),
      })
    )
    .min(1)
    .describe('An array of cookies to set.'),
  reload: z
    .boolean()
    .optional()
    .describe('Whether to reload the page after setting the cookies.'),
});

type SetCookieInput = z.infer<typeof setCookieInputSchema>;

const setCookie: Tool<typeof setCookieInputSchema> = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_set_cookie',
    title: 'Set Cookies',
    description:
      'Adds one or more cookies to the current browser context. If a cookie with the same name, domain, and path already exists, it will be overridden.',
    inputSchema: setCookieInputSchema,
    type: 'destructive',
  },
  handle: async (context: Context, params: SetCookieInput) => {
    const currentTab = context.currentTabOrDie();
    const browserContext = currentTab.page.context();

    await browserContext.addCookies(params.cookies);

    const cookieNames = params.cookies.map((c) => c.name).join(', ');
    const domainsOrUrls = params.cookies
      .map((c) => c.domain || c.url || 'current context')
      .join(', ');

    if (params.reload) {
      await currentTab.page.reload();
    }

    const code = [
      `// Set cookies: ${cookieNames} for domains/URLs: ${domainsOrUrls}`,
    ];

    if (params.reload) {
      code.push(`await page.reload();`);
    }

    return {
      code,
      captureSnapshot: false,
      waitForNetwork: true,
    };
  },
});

export default [setCookie];
