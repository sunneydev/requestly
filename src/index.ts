import type { MaybePromise, RequestOptions, RequestResponse } from "./types";
import * as utils from "./utils";
import "isomorphic-fetch";

export interface RequestsOptions {
  baseUrl?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  persistCookies?: boolean;
  interceptors?: {
    onRequest?: (
      url: string,
      init: RequestInit
    ) => MaybePromise<RequestInit | void>;
    onResponse?: <T>(
      url: string,
      init: RequestInit,
      response: RequestResponse<T>
    ) => MaybePromise<void>;
  };
}

export class Requests {
  private _baseUrl?: string;
  private _headers: Record<string, string>;
  private _cookies: Record<string, string>;
  private _persistCookies?: boolean;
  private _onRequest?: (
    url: string,
    init: RequestInit
  ) => MaybePromise<RequestInit | void>;
  private _onResponse?: <T>(
    url: string,
    init: RequestInit,
    response: RequestResponse<T>
  ) => MaybePromise<void>;

  constructor(opts?: RequestsOptions) {
    this._baseUrl = opts?.baseUrl ?? "";
    this._headers = opts?.headers ?? {};
    this._cookies = opts?.cookies ?? {};
    this._persistCookies = opts?.persistCookies ?? true;
    this._headers["User-Agent"] = opts?.userAgent ?? utils.defaultUserAgent;
    this._onRequest = opts?.interceptors?.onRequest;
    this._onResponse = opts?.interceptors?.onResponse;
  }

  private async _request<T = any, K extends BodyInit | null | undefined = any>(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    options?: RequestOptions<K>
  ): Promise<RequestResponse<T>> {
    if (url.startsWith("/") && this._baseUrl == null) {
      throw new Error(
        "Cannot make request with relative URL without a base URL"
      );
    }

    const params = options?.params ? utils.stringifyParams(options.params) : "";
    const uri = `${this._baseUrl}${url}${params}`;

    const additionalHeaders = {
      ...(options?.body && {
        "Content-Type": options?.contentType || "application/json", // default to JSON, cause why not
      }),
      ...options?.headers,
    };

    let requestOptions: RequestInit = {
      method,
      headers: {
        ...this.headers.getAll(),
        ...additionalHeaders,
        Cookie: this.cookies.toString(),
      },
      body:
        typeof options?.body === "object"
          ? JSON.stringify(options?.body)
          : options?.body,
    };

    requestOptions =
      (await this._onRequest?.(uri, requestOptions)) || requestOptions;

    const response: RequestResponse<T> = await fetch(uri, requestOptions).then(
      async (res) => {
        const { headers } = res;
        const isJSON = headers
          .get("Content-Type")
          ?.includes("application/json");

        const cookies = utils.parseCookies(headers.get("Set-Cookie") || "");

        return {
          ...res,
          url: res.url,
          ok: res.ok,
          redirected: res.redirected,
          status: res.status,
          statusText: res.statusText,
          request: { url, method, options: requestOptions },
          headers,
          cookies,
          data: await (isJSON ? res.json() : res.text()),
        };
      }
    );

    if (options?.ignoreCookies !== false && this._persistCookies) {
      Object.entries(response.cookies).forEach(([key, value]) =>
        this.cookies.set(key, value)
      );
    }

    if (this._onResponse) {
      this._onResponse(uri, requestOptions, response);
    }

    return response;
  }

  public client(opts?: RequestsOptions) {
    return new Requests(opts);
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

  public cookies = {
    set: (key: string, value: string) => {
      this._cookies[key] = value;
    },
    get: (key: string) => {
      return this._cookies[key];
    },
    getAll: () => {
      return this._cookies;
    },
    remove: (key: string) => {
      delete this._cookies[key];
    },
    update: (cookies: Record<string, string>) => {
      this._cookies = {
        ...cookies,
        ...this._cookies,
      };
    },
    toString: () => utils.stringifyCookies(this.cookies.getAll()),
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

  public intercept({
    onRequest,
    onResponse,
  }: RequestsOptions["interceptors"] = {}) {
    this._onRequest = onRequest ?? this._onRequest;
    this._onResponse = onResponse ?? this._onResponse;
  }
}

export default new Requests();

export { RequestOptions, RequestResponse } from "./types";
