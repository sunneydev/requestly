import { RequestlyResponse } from "./types";

export const defaultUserAgent = "Requestly/1.0";

export function stringifyParams(params?: Record<string, string>): string {
  if (!params) return "";
  const searchParams = new URLSearchParams(params);
  return searchParams.toString() ? `?${searchParams.toString()}` : "";
}

export function getBodyContentType(body: any): string | undefined {
  if (body instanceof FormData) {
    return "multipart/form-data";
  } else if (body instanceof URLSearchParams) {
    return "application/x-www-form-urlencoded";
  } else if (typeof body === "object" && body !== null) {
    return "application/json";
  }
  return undefined;
}

export function serializeBody(body: any): BodyInit | null | undefined {
  if (typeof body === "object" && body !== null) {
    return JSON.stringify(body);
  }

  return body;
}

export async function createResponseData<T>(
  response: Response,
  requestInfo: {
    url: string;
    method: string;
    options: RequestInit;
    redirectCount: number;
  },
  retry: () => Promise<RequestlyResponse<T>>
): Promise<RequestlyResponse<T>> {
  const isJSON = response.headers
    .get("Content-Type")
    ?.includes("application/json");
  const data = await (isJSON ? response.json() : response.text());

  return {
    ...response,
    url: response.url,
    ok: response.ok,
    redirected: requestInfo.redirectCount > 0,
    status: response.status,
    statusText: response.statusText,
    request: {
      url: requestInfo.url,
      method: requestInfo.method,
      options: requestInfo.options,
    },
    cookies: {}, // This will be populated in the _request method
    headers: response.headers,
    data,
    retry,
  };
}

export function splitCookiesString(cookiesString: string | string[]): string[] {
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }
  if (typeof cookiesString !== "string") {
    return [];
  }

  const cookiesStrings: string[] = [];
  let pos = 0;
  let start: number;
  let ch: string;
  let lastComma: number;
  let nextStart: number;
  let cookiesSeparatorFound: boolean;

  function skipWhitespace(): boolean {
    // @ts-ignore
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }

  function notSpecialChar(): boolean {
    // @ts-ignore
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  }

  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;

    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;

        skipWhitespace();
        nextStart = pos;

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }

        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }

  return cookiesStrings;
}