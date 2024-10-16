// cookie.ts

export class Cookie {
  key: string;
  value: string;
  expires?: Date;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure: boolean;
  httpOnly: boolean;

  constructor(options: {
    key: string;
    value: string;
    expires?: Date;
    maxAge?: number;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
  }) {
    this.key = options.key;
    this.value = options.value;
    this.expires = options.expires;
    this.maxAge = options.maxAge;
    this.domain = options.domain;
    this.path = options.path;
    this.secure = options.secure || false;
    this.httpOnly = options.httpOnly || false;
  }

  static parse(cookieString: string): Cookie | null {
    const parts = cookieString.split(';').map(part => part.trim());
    const [keyValue, ...attributes] = parts;
    const [key, value] = keyValue.split('=').map(part => part.trim());

    if (!key || !value) {
      return null;
    }

    const cookie: any = { key, value };

    attributes.forEach(attr => {
      const [attrKey, attrValue] = attr.split('=').map(part => part.trim());
      switch (attrKey.toLowerCase()) {
        case 'expires':
          cookie.expires = new Date(attrValue);
          break;
        case 'max-age':
          cookie.maxAge = parseInt(attrValue, 10);
          break;
        case 'domain':
          cookie.domain = attrValue;
          break;
        case 'path':
          cookie.path = attrValue;
          break;
        case 'secure':
          cookie.secure = true;
          break;
        case 'httponly':
          cookie.httpOnly = true;
          break;
      }
    });

    return new Cookie(cookie);
  }

  toString(): string {
    let str = `${this.key}=${this.value}`;
    if (this.expires) str += `; Expires=${this.expires.toUTCString()}`;
    if (this.maxAge !== undefined) str += `; Max-Age=${this.maxAge}`;
    if (this.domain) str += `; Domain=${this.domain}`;
    if (this.path) str += `; Path=${this.path}`;
    if (this.secure) str += '; Secure';
    if (this.httpOnly) str += '; HttpOnly';
    return str;
  }
}

export class CookieJar {
  private cookies: Cookie[] = [];

  async setCookie(cookie: Cookie, url: string, options: { ignoreError?: boolean } = {}): Promise<void> {
    const domain = new URL(url).hostname;
    if (cookie.domain && !domain.endsWith(cookie.domain)) {
      if (!options.ignoreError) {
        throw new Error('Cookie domain does not match URL');
      }
      return;
    }
    this.cookies = this.cookies.filter(c => c.key !== cookie.key || c.domain !== cookie.domain);
    this.cookies.push(cookie);
  }

  async getCookies(url: string): Promise<Cookie[]> {
    const domain = new URL(url).hostname;
    const path = new URL(url).pathname;
    return this.cookies.filter(cookie => 
      (!cookie.domain || domain.endsWith(cookie.domain)) &&
      (!cookie.path || path.startsWith(cookie.path))
    );
  }

  async getCookieString(url: string): Promise<string> {
    const cookies = await this.getCookies(url);
    return cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; ');
  }

  serializeSync(): { cookies: SerializedCookie[] } {
    return {
      cookies: this.cookies.map(cookie => ({
        key: cookie.key,
        value: cookie.value,
        expires: cookie.expires?.toISOString(),
        maxAge: cookie.maxAge,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
      })),
    };
  }

  static deserializeSync(data: {
    cookies: SerializedCookie[] | Record<string, string>[];
    rejectPublicSuffixes: boolean;
    storeType: string;
    version: string;
  }): CookieJar {
    const jar = new CookieJar();
    jar.cookies = data.cookies.map(cookie => new Cookie({
      key: cookie.key,
      value: cookie.value,
      expires: cookie.expires ? new Date(cookie.expires) : undefined,
      maxAge: typeof cookie.maxAge === 'number' ? cookie.maxAge : undefined,
      domain: cookie.domain,
      path: cookie.path,
      secure: typeof cookie.secure === 'boolean' ? cookie.secure : undefined,
      httpOnly: typeof cookie.httpOnly === 'boolean' ? cookie.httpOnly : undefined,
    }));
    return jar;
  }
}

export interface SerializedCookie {
  key: string;
  value: string;
  expires?: string;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
}