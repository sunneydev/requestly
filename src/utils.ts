export function parseCookies(cookies: string) {
  const parsedCookies: Record<string, string> = {};
  const cookiePairs = cookies.split(";");

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
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}
