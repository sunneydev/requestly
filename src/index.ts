import type {
  MaybePromise,
  OnResponse,
  RequestOptions,
  RequestlyResponse,
  RequestlyOptions,
} from "./types";
import * as utils from "./utils";

export class Requestly {
  private _baseUrl?: string;
  private _headers: Record<string, string> = {};
  private _cookies: Record<string, string> = {};
  private _params?: Record<string, string> = {};
  private _storeCookies?: boolean;
  private _onRequest?: (
    url: string,
    init: RequestInit
  ) => MaybePromise<RequestInit | void>;
  private _onResponse?: OnResponse;

  constructor(opts?: RequestlyOptions | string) {
    if (typeof opts === "string") {
      this._baseUrl = opts;
      return;
    }

    this._baseUrl = opts?.baseUrl ?? "";
    this._headers = opts?.headers ?? {};
    this._cookies = opts?.cookies ?? {};
    this._params = opts?.params ?? {};
    this._storeCookies = opts?.storeCookies ?? true;
    this._headers["User-Agent"] = opts?.userAgent ?? utils.defaultUserAgent;
    this._onRequest = opts?.onRequest;
  }

  private async _request<T = any, K extends BodyInit | null | undefined = any>(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    options?: RequestOptions<K>
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

    let requestOptions: RequestInit = {
      method,
      headers: {
        ...this.headers.getAll(),
        ...additionalHeaders,
        Cookie: this.cookies.toString(),
      },
      body:
        typeof options?.body === "object" &&
        !(options?.body instanceof FormData) &&
        !(options?.body instanceof URLSearchParams) &&
        !(options?.body instanceof Blob) &&
        !(options?.body instanceof ArrayBuffer) &&
        !(options?.body instanceof ReadableStream) &&
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
    };

    const response: RequestlyResponse<T> = await fetch(
      uri,
      requestOptions
    ).then(async (res) => {
      const { headers } = res;
      const isJSON = headers.get("Content-Type")?.includes("application/json");

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
    });

    if (options?.ignoreCookies !== false && this._storeCookies) {
      Object.entries(response.cookies).forEach(([key, value]) =>
        this.cookies.set(key, value)
      );
    }

    if (this._onResponse) {
      const middlewareResponse = await this._onResponse(
        uri,
        requestOptions,
        response
      );

      if (middlewareResponse) {
        return middlewareResponse?.headers instanceof Headers
          ? middlewareResponse
          : { ...response, data: middlewareResponse };
      }
    }

    return response;
  }

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

  public onRequest(
    fn: (url: string, init: RequestInit) => MaybePromise<RequestInit | void>
  ) {
    this._onRequest = fn;
  }

  public onResponse(fn: OnResponse) {
    this._onResponse = fn;
  }
}

export const requestly = new Requestly();

export default requestly;
