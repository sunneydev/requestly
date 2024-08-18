import { Cookie, CookieJar } from "tough-cookie";
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

    const bodyContentType = utils.getBodyContentType(options?.body);

    const additionalHeaders = {
      ...(bodyContentType ? { "Content-Type": bodyContentType } : {}),
      ...options?.headers,
    };

    // Get cookies for the current URL
    const cookieString =
      (await this._cookieJar.getCookieString(uri)) +
      "; " +
      Object.entries(options?.cookies ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");

    let requestOptions: RequestInit = {
      method,
      headers: {
        ...this.headers.getAll(),
        ...additionalHeaders,
        ...(cookieString ? { Cookie: cookieString } : {}),
      },
      body:
        typeof options?.body === "object" &&
          !(options?.body instanceof FormData) &&
          !(options?.body instanceof URLSearchParams) &&
          !(options?.body instanceof Blob) &&
          !(options?.body instanceof ArrayBuffer) &&
          (typeof ReadableStream === "undefined" ||
            !(options?.body instanceof ReadableStream)) &&
          !(options?.body instanceof URL) &&
          !(options?.body instanceof Uint8Array)
          ? JSON.stringify(options?.body)
          : options?.body,
    };

    const middlewareRequestOptions = await this._onRequest?.(
      uri,
      requestOptions
    );

    requestOptions = {
      ...requestOptions,
      ...middlewareRequestOptions,
      headers: {
        ...requestOptions.headers,
        ...middlewareRequestOptions?.headers,
      },
      redirect: "manual",
    } satisfies RequestInit;

    const response = await fetch(uri, requestOptions);

    let cookiesObject = {} as Record<string, string>;

    const setCookieHeader = response.headers.get("Set-Cookie");
    if (setCookieHeader) {
      const cookies = splitCookiesString(setCookieHeader);
      for (const cookie of cookies) {
        const ck = await this._cookieJar.setCookie(cookie, uri, {
          ignoreError: true,
        });

        cookiesObject[ck.key] = ck.value;
      }
    }

    if (
      redirectStatus.has(response.status) &&
      redirectCount < this._maxRedirects
    ) {
      const location = response.headers.get("Location");
      if (location) {
        const redirectUrl = new URL(location, uri).toString();
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

    const isJSON = response.headers
      .get("Content-Type")
      ?.includes("application/json");

    const responseData: RequestlyResponse<T> = {
      ...response,
      url: response.url,
      ok: response.ok,
      redirected: redirectCount > 0,
      status: response.status,
      statusText: response.statusText,
      request: { url, method, options: requestOptions },
      headers: response.headers,
      cookies: cookiesObject,
      data: await (isJSON ? response.json() : response.text()),
      retry: async () => {
        return this._request<T, K>(url, method, options, redirectCount);
      },
    };

    if (this._onResponse) {
      const middlewareResponse = (await this._onResponse({
        url: uri,
        init: requestOptions,
        response: responseData,
      })) as Awaited<ReturnType<OnResponse<T>>>;

      if (middlewareResponse) {
        return middlewareResponse?.headers instanceof Headers
          ? middlewareResponse
          : { ...responseData, data: middlewareResponse.data };
      }
    }

    return responseData;
  }

  public cookies = {
    serialize: () => {
      return this._cookieJar.serializeSync().cookies;
    },
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
          return cookie.value;
        }
      }

      return null;
    },
    getAll: async (url: string): Promise<any[]> => {
      return this._cookieJar.getCookies(url);
    },
    set: async (url: string, params: { key: string, value: string }): Promise<void> => {
      const cookie = new Cookie({
        key: params.key,
        value: params.value,
      })

      await this._cookieJar.setCookie(cookie, url);
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

  public onRequest(
    fn: (url: string, init: RequestInit) => MaybePromise<RequestInit | void>
  ) {
    this._onRequest = fn;
  }

  public onResponse<T>(fn: OnResponse<T>) {
    this._onResponse = fn as OnResponse<unknown>;
  }
}

export const requestly = new Requestly();

export default requestly;
