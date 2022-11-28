export interface RequestsOptions {
  baseUrl?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

export interface RequestOptions<T = any> {
  content?:
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
  data: T;
}
