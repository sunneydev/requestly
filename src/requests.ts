interface RequestsProps {
  baseUrl?: string;
}

interface RequestOptions {
  content?:
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "text/plain"
    | "text/html";
  headers?: Record<string, string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>;

  body?: any;
}

class Requests {
  private _baseUrl?: string;
  private _headers: Record<string, string> = {};
  private _cookies: Record<string, string> = {};

  constructor(props?: RequestsProps) {
    this._baseUrl = props?.baseUrl || "";
  }

  private async _request<T = any>(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    options?: RequestOptions
  ): Promise<Response & { data: T }> {
    url = this._baseUrl
      ? this._baseUrl + url
      : options?.params
      ? url + "?" + new URLSearchParams(options.params).toString()
      : url;

    const isJson = typeof options?.body === "object";

    const contentType = {
      "Content-Type": options?.content || "application/json",
    };

    const response = await fetch(url, {
      method,
      headers: {
        ...contentType,
        ...this.headers.getAll(),
        ...(options?.headers || {}),
        ...contentType,
      },
      body: isJson ? JSON.stringify(options?.body) : options?.body,
    });

    const isJsonResponse = response.headers
      .get("Content-Type")
      ?.includes("application/json");

    return {
      ...response,
      data: isJsonResponse ? await response.json() : await response.text(),
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
  };

  public get = <T>(url: string, options?: Omit<RequestOptions, "body">) =>
    this._request<T>(url, "GET", options);

  public post = <T>(url: string, options?: RequestOptions) =>
    this._request<T>(url, "POST", options);

  public put = <T>(url: string, options?: RequestOptions) =>
    this._request<T>(url, "PUT", options);

  public delete = <T>(url: string, options?: RequestOptions) =>
    this._request<T>(url, "DELETE", options);

  public patch = <T>(url: string, options?: RequestOptions) =>
    this._request<T>(url, "PATCH", options);
}

export default {
  session: (props?: RequestsProps) => new Requests(props),
};
