/** One request a person cannot make while working as another employee (a prefix of the path after `/api`, for the listed methods). */
interface ForbiddenRoute {
  methods: readonly string[];
  pattern: RegExp;
}

const WRITES = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

/**
 * What a platform administrator cannot do inside a «sign in as» session: turn on admin mode or start another «sign in as», touch the
 * person's own sign-in (authenticator, trusted devices, sessions, profile), their roles, groups and access, their account status, and the
 * security settings. Reading and the everyday work of the person stay open.
 */
const FORBIDDEN_ROUTES: readonly ForbiddenRoute[] = [
  { methods: ['POST'], pattern: /^\/admin-mode\/activate$/ },
  { methods: ['POST'], pattern: /^\/impersonation\/(?!stop$)[^/]+$/ },
  { methods: ['POST'], pattern: /^\/mfa\/enroll(\/confirm)?$/ },
  { methods: WRITES, pattern: /^\/me\/(sessions|trusted-devices|profile)(\/|$)/ },
  { methods: ['POST', 'PUT'], pattern: /^\/employees\/[^/]+\/(deactivate|activate|terminate|reset-authenticator|resend-invite|roles|groups)$/ },
  { methods: WRITES, pattern: /^\/(roles|role-groups|user-groups|permission-targets|access\/exceptions|page-visibility|security-settings)(\/|$)/ },
];

/** Is this request refused inside a «sign in as» session? `path` is the URL path with the `/api` prefix. */
export function isForbiddenWhileImpersonating(method: string, path: string): boolean {
  const bare = path.replace(/^\/api(?=\/)/, '').replace(/\/+$/, '');
  return FORBIDDEN_ROUTES.some((route) => route.methods.includes(method.toUpperCase()) && route.pattern.test(bare));
}

/** The session ends by itself after this many idle minutes. */
export function impersonationIdle(lastActivityAt: Date | string | null, idleMinutes: number, now: Date): boolean {
  if (!lastActivityAt) return false;
  return now.getTime() - new Date(lastActivityAt).getTime() > idleMinutes * 60_000;
}
