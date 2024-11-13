export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type OnResponse<T = unknown> = (params: {
  url: string;
  init: RequestInit;
  response: RequestlyResponse<T>;
}) => MaybePromise<RequestlyResponse<T> | void>;

export interface RequestlyOptions {
  baseUrl?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>[];
  maxRedirects?: number;
  fetchOptions?: RequestInit;
  onRequest?: (
    url: string,
    init: RequestInit
  ) => MaybePromise<RequestInit | void>;
  onResponse?: OnResponse<unknown>;
}

export type MaybePromise<T> = T | Promise<T>;

export type Headers = Record<string, string | undefined>;

export type Params = Record<string, string | undefined>;

export type Cookies = Record<string, string | undefined>;

export interface RequestOptions<T = any> {
  headers?: Headers;
  params?: Params;
  cookies?: Cookies;
  body?: T;
  signal?: AbortSignal;
}

export interface RequestlyResponse<T = unknown | string>
  extends Omit<Response, "text" | "json"> {
  request: {
    url: string;
    method: string;
    options?: RequestInit;
  };
  cookies: Record<string, string>;
  data: T;
  retry: () => Promise<RequestlyResponse<T>>;
}
