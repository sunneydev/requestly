import { Cookie, CookieJar, SerializedCookie } from "tough-cookie";
import { splitCookiesString } from "set-cookie-parser";
import type {
  MaybePromise,
  OnResponse,
  RequestOptions,
  RequestlyResponse,
  RequestlyOptions,
  RequestMethod,
} from "./types";
import * as utils from "./utils";

const redirectStatus = new Set([301, 302, 303, 307, 308]);

export class Requestly {
  private _baseUrl?: string;
  private _headers: Record<string, string> = {};
  private _params?: Record<string, string> = {};
  private _cookieJar: CookieJar;
  private _onRequest?: (
    url: string,
    init: RequestInit
  ) => MaybePromise<RequestInit | void>;
  private _onResponse?: OnResponse<unknown>;
  private _maxRedirects: number;

  constructor(opts?: RequestlyOptions | string) {
    if (typeof opts === "string") {
      this._baseUrl = opts;
      this._cookieJar = new CookieJar();
      this._maxRedirects = 20;
      return;
    }

    this._baseUrl = opts?.baseUrl ?? "";
    this._headers = opts?.headers ?? {};
    this._params = opts?.params ?? {};
    this._cookieJar = new CookieJar();
    if (opts?.cookies) {
      this.cookies.deserialize(opts.cookies);
    }
    this._headers["User-Agent"] = opts?.userAgent ?? utils.defaultUserAgent;
    this._onRequest = opts?.onRequest;
    this._maxRedirects = opts?.maxRedirects ?? 20;
  }

  private async _request<T = any, K extends BodyInit | null | undefined = any>(
    url: string,
    method: RequestMethod,
    options?: RequestOptions<K>,
    redirectCount = 0
  ): Promise<RequestlyResponse<T>> {
    if (url.startsWith("/") && this._baseUrl == null) {
      throw new Error(
        "Cannot make request with relative URL without a base URL"
      );
    }

    const params = utils.stringifyParams({
      ...options?.params,
      ...this._params,
    });

    let uri = `${this._baseUrl}${url}${params}`;

    uri.endsWith("/") && (uri = uri.slice(0, -1));

    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      uri = `https://${uri}`;
    }

    const bodyContentType = utils.getBodyContentType(options?.body);

    const additionalHeaders = {
      ...(bodyContentType ? { "Content-Type": bodyContentType } : {}),
      ...options?.headers,
    };

    const cookieString = await this._cookieJar.getCookieString(uri);

    let requestOptions: RequestInit = {
      method,
      headers: {
        ...this.headers.getAll(),
        ...additionalHeaders,
        ...(cookieString ? { Cookie: cookieString } : {}),
      },
      body: utils.serializeBody(options?.body),
    };

    const middlewareRequestOptions = await this._onRequest?.(
      uri,
      requestOptions
    );

    requestOptions = {
      ...requestOptions,
      ...middlewareRequestOptions,
      redirect: "manual",
    } satisfies RequestInit;

    const response = await fetch(uri, requestOptions);

    let cookies: Record<string, string> = {};

    const setCookieHeader = response.headers.get("Set-Cookie");

    if (setCookieHeader) {
      const cookieArr = splitCookiesString(setCookieHeader);

      for (const ca of cookieArr) {
        const cookie = Cookie.parse(ca);

        if (!cookie) continue;

        cookies[cookie.key] = cookie.value;
        await this._cookieJar.setCookie(cookie, uri, { ignoreError: true });
      }
    }

    // Add this section to get all cookies for the current URL
    const allCookies = await this._cookieJar.getCookies(uri);
    for (const cookie of allCookies) {
      cookies[cookie.key] = cookie.value;
    }

    if (
      redirectStatus.has(response.status) &&
      redirectCount < this._maxRedirects
    ) {
      const location = response.headers.get("Location");
      if (location) {
        const redirectUrl = new URL(location, uri).pathname;
        const redirectMethod = response.status === 303 ? "GET" : method;
        const redirectBody =
          response.status === 303 ? undefined : options?.body;
        return this._request(
          redirectUrl,
          redirectMethod,
          { ...options, body: redirectBody },
          redirectCount + 1
        );
      }
    }

    let responseData: RequestlyResponse<T> = await utils.createResponseData(
      response,
      {
        url,
        method,
        options: requestOptions,
        redirectCount,
      },
      () => this._request(url, method, options, redirectCount + 1)
    );

    if (this._onResponse) {
      const middlewareResponse = (await this._onResponse({
        url: uri,
        init: requestOptions,
        response: responseData,
      })) as RequestlyResponse<T>;

      if (middlewareResponse) {
        return middlewareResponse.headers instanceof Headers
          ? middlewareResponse
          : { ...responseData, data: middlewareResponse.data as T };
      }
    }

    return {
      ...responseData,
      cookies,
    };
  }

  public cookies = {
    serialize: () =>
      this._cookieJar.serializeSync()?.cookies ?? ([] as SerializedCookie[]),
    deserialize: (cookies: Record<string, string>[]): void => {
      this._cookieJar = CookieJar.deserializeSync({
        rejectPublicSuffixes: true,
        storeType: "MemoryCookieStore",
        version: "tough-cookie@4.1.4",
        cookies,
      });
    },
    get: async (name: string, url?: string): Promise<string | null> => {
      if (url) {
        const cookies = await this._cookieJar.getCookies(url);

        return cookies.find((cookie) => cookie.key === name)?.value ?? null;
      }

      const allCookies = await this._cookieJar.serialize();

      for (const cookie of allCookies.cookies) {
        if (cookie.key?.toLowerCase() === name.toLowerCase()) {
          return cookie.value ?? null;
        }
      }

      return null;
    },
    getAll: async (url: string): Promise<any[]> => {
      return this._cookieJar.getCookies(url);
    },
    set: async (url: string, params: { key: string; value: string }) => {
      const cookie = new Cookie(params);

      this._cookieJar.setCookie(cookie, url);
    },
    clear: (): void => {
      this._cookieJar = new CookieJar();
    },
  };

  public get baseUrl() {
    return this._baseUrl;
  }

  public set baseUrl(url: string | undefined) {
    this._baseUrl = url;
  }

  public create(opts?: RequestlyOptions | string) {
    return new Requestly(opts);
  }

  public get params() {
    return this._params;
  }

  public set params(params: Record<string, string> | undefined) {
    this._params = params;
  }

  public headers = {
    set: (key: string, value: string) => {
      this._headers[key] = value;
    },
    get: (key: string) => {
      return this._headers[key];
    },
    getAll: () => {
      return this._headers;
    },
    remove: (key: string) => {
      delete this._headers[key];
    },
    update: (headers: Record<string, string>) => {
      this._headers = {
        ...headers,
        ...this._headers,
      };
    },
  };

  public get<T>(url: string, options?: Omit<RequestOptions, "body">) {
    return this._request<T>(url, "GET", options);
  }

  public post<T>(url: string, options?: RequestOptions) {
    return this._request<T>(url, "POST", options);
  }

  public put<T>(url: string, options?: RequestOptions) {
    return this._request<T>(url, "PUT", options);
  }

  public delete<T>(url: string, options?: RequestOptions) {
    return this._request<T>(url, "DELETE", options);
  }

  public patch<T>(url: string, options?: RequestOptions) {
    return this._request<T>(url, "PATCH", options);
  }

  public onRequest = {
    set: (
      fn: (url: string, init: RequestInit) => MaybePromise<RequestInit | void>
    ) => {
      this._onRequest = fn;
    },
    remove: () => {
      this._onRequest = undefined;
    },
  };

  public onResponse = {
    set: <T>(fn: OnResponse<T>) => {
      this._onResponse = fn as OnResponse<unknown>;
    },
    remove: () => {
      this._onResponse = undefined;
    },
  };

  public fetch(
    url: string,
    options?: RequestOptions & { method: RequestMethod }
  ) {
    return this._request(url, options?.method || "GET", options);
  }
}

export const requestly = new Requestly();

export default requestly;
