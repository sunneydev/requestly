export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type OnResponse<T> = (params: {
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
  onRequest?: (
    url: string,
    init: RequestInit
  ) => MaybePromise<RequestInit | void>;
  onResponse?: OnResponse<unknown>;
}

export type MaybePromise<T> = T | Promise<T>;

export interface RequestOptions<T = any> {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>;

  body?: T;
}

export interface RequestlyResponse<T> extends Omit<Response, "text" | "json"> {
  request: {
    url: string;
    method: string;
    options?: RequestInit;
  };
  cookies: Record<string, string>;
  data: T;
  retry: () => Promise<RequestlyResponse<T>>;
}
