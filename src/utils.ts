export const defaultUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36`;

export function parseCookies(cookies: string) {
  const parsedCookies: Record<string, string> = {};
  const cookiePairs = cookies
    .split(",")
    .map((cookie) => cookie.trim().split(";")[0])
    .filter((cookie) => cookie?.includes("=")) as string[];

  for (const cookiePair of cookiePairs) {
    const [key, value] = cookiePair.split("=");
    if (!key || !value) {
      continue;
    }

    parsedCookies[key.trim()] = value.trim();
  }

  return parsedCookies;
}

export function stringifyCookies(cookies: Record<string, string>) {
  const stringified = Object.entries(cookies)
    .map(([key, value]) => encodeURI(`${key}=${value}`))
    .join("; ");

  return stringified;
}
