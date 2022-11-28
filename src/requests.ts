import type { RequestsOptions, RequestOptions, RequestResponse } from "./types";
import * as utils from "./utils";

export class Requests {
  private _baseUrl?: string;
  private _headers: Record<string, string>;
  private _cookies: Record<string, string>;

  constructor(opts?: RequestsOptions) {
    this._baseUrl = opts?.baseUrl || "";
    this._headers = opts?.headers || {};
    this._cookies = opts?.cookies || {};
    this._headers["User-Agent"] = opts?.userAgent || utils.defaultUserAgent;
  }

  private async _request<T = any, K extends BodyInit | null | undefined = any>(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    options?: RequestOptions<K>
  ): Promise<RequestResponse<T>> {
    const params = options?.params ? utils.stringifyParams(options.params) : "";
    const uri = `${this._baseUrl}${url}${params}`;

    const isJson = typeof options?.body === "object";

    const contentType = {
      "Content-Type": options?.content || "application/json",
    };

    const requestOptions: RequestInit = {
      method,
      headers: {
        ...contentType,
        ...this.headers.getAll(),
        ...(options?.headers || {}),
        ...contentType,
        Cookie: this.cookies.toString(),
      },
      body: isJson ? JSON.stringify(options?.body) : options?.body,
    };

    const response = await fetch(uri, requestOptions);

    if (!options?.ignoreCookies) {
      Object.entries(
        utils.parseCookies(response.headers.get("set-cookie") || "")
      ).forEach(([key, value]) => {
        this.cookies.set(key, value);
      });
    }

    const { headers } = response;

    const isJsonResponse = headers
      .get("Content-Type")
      ?.includes("application/json");

    return {
      ...response,
      request: {
        url,
        method,
        options: requestOptions,
      },
      headers,
      data: await (isJsonResponse ? response.json() : response.text()),
    };
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
}
