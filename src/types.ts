export type MaybePromise<T> = T | Promise<T>;

export interface RequestOptions<T = any> {
  contentType?:
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "text/plain"
    | "text/html";
  headers?: Record<string, string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>;
  ignoreCookies?: boolean;

  body?: T;
}

export interface RequestResponse<T> extends Omit<Response, "text" | "json"> {
  request: {
    url: string;
    method: string;
    options?: RequestInit;
  };
  cookies: Record<string, string>;
  data: T;
}
