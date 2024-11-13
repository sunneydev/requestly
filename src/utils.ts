import { RequestlyResponse } from "./types";

export const defaultUserAgent = "Requestly/1.0";

export function processBody(body: any) {
  if (body == null) {
    return { body, contentType: null };
  }

  if (body instanceof FormData) {
    return { body, contentType: null };
  }

  if (body instanceof URLSearchParams) {
    return { body, contentType: "application/x-www-form-urlencoded" };
  }

  if (body instanceof Blob || body instanceof File) {
    return {
      body,
      contentType: body.type || "application/octet-stream",
    };
  }

  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return { body, contentType: "application/octet-stream" };
  }

  if (typeof body === "object") {
    return {
      body: JSON.stringify(body),
      contentType: "application/json",
    };
  }

  if (typeof body === "string") {
    try {
      JSON.parse(body);
      return { body, contentType: "application/json" };
    } catch {
      return { body, contentType: "text/plain" };
    }
  }

  return { body, contentType: null };
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

export class URLHandler {
  // Cached regex patterns
  private static readonly URL_PATTERN = /^https?:\/\//i;
  private static readonly PROTOCOL_PATTERN = /^(https?:\/\/)/i;
  private static readonly MULTIPLE_SLASHES = /\/+/g;
  private static readonly TRAILING_SLASH = /\/+$/;
  private static readonly LEADING_SLASH = /^\/+/;

  /**
   * Creates a complete URL by combining path, base URL, and query parameters
   * @param path - URL path or complete URL
   * @param params - Optional query parameters
   * @returns Complete URL string
   */
  public createUrl(
    path: string,
    baseUrl: string = "",
    params?: Record<string, string | undefined>
  ): string {
    try {
      baseUrl = this.normalizeUrl(baseUrl);

      // Quick return if no path
      if (!path) {
        return this.addQueryParams(baseUrl, params);
      }

      // Return cleaned absolute URLs directly
      if (URLHandler.URL_PATTERN.test(path)) {
        return this.addQueryParams(this.cleanUrl(path), params);
      }

      // Handle paths starting with multiple slashes
      if (path.startsWith("//")) {
        throw new Error("Invalid path: Cannot start with multiple slashes");
      }

      // Construct full URL
      const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
      const baseUrlToUse = baseUrl || "https://";
      const fullUrl = baseUrl
        ? `${baseUrlToUse}/${normalizedPath}`
        : `https://${normalizedPath}`;

      // Add query parameters and return
      return this.addQueryParams(this.cleanUrl(fullUrl), params);
    } catch (error) {
      // Throw specific error for invalid URLs
      throw new Error(
        `Invalid URL creation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Internal helper to normalize URLs
   */
  private normalizeUrl(url: string): string {
    if (!url) return "";

    try {
      const trimmedUrl = url.trim();
      const withProtocol = URLHandler.URL_PATTERN.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl}`;

      const cleaned = this.cleanUrl(withProtocol);
      new URL(cleaned); // Validate URL
      return cleaned;
    } catch {
      if (url.trim()) {
        throw new Error(`Invalid URL: ${url}`);
      }
      return "";
    }
  }

  /**
   * Internal helper to clean URLs of multiple slashes while preserving protocol
   */
  private cleanUrl(url: string): string {
    const protocolMatch = url.match(URLHandler.PROTOCOL_PATTERN);
    if (!protocolMatch) {
      return url
        .replace(URLHandler.MULTIPLE_SLASHES, "/")
        .replace(URLHandler.TRAILING_SLASH, "");
    }

    const [protocol] = protocolMatch;
    return (
      protocol +
      url
        .slice(protocol.length)
        .replace(URLHandler.MULTIPLE_SLASHES, "/")
        .replace(URLHandler.LEADING_SLASH, "")
        .replace(URLHandler.TRAILING_SLASH, "")
    );
  }

  /**
   * Internal helper to add query parameters to URL
   */
  private addQueryParams(
    url: string,
    params?: Record<string, string | undefined>
  ): string {
    if (!params || Object.keys(params).length === 0) return url;

    try {
      const urlObj = new URL(url);

      // Add parameters efficiently
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          urlObj.searchParams.append(key, value);
        }
      }

      return this.cleanUrl(urlObj.toString());
    } catch {
      throw new Error(`Invalid URL while adding parameters: ${url}`);
    }
  }
}
