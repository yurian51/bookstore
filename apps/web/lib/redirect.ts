/** Only allow same-site relative redirects, to prevent open redirects. */
export function safeNext(next?: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}
