# requests

Introducing requests, an incredibly lightweight (1.2kb) and powerful HTTP client for Node.js, built on top of the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

### Motivation

Driven by the limitations of existing JavaScript HTTP libraries, I developed `requests` with inspiration from the versatile Python `requests` library. My goal was to create a user-friendly and flexible solution for working with HTTP `requests` in JavaScript, filling the gaps left by other alternatives.

### Installation

```js
npm install @sunney/requests
```

### Usage

To use `@sunney/requests`, follow the steps below:

#### 1. Import the library

```typescript
import { requests } from "@sunney/requests";
```

#### 2. Create an HTTP Client

Creating a custom client allows you to set a base URL, default headers, manage cookies, and intercept requests/responses. By default, cookies are persisted.

```typescript
const client = requests.client({
  baseUrl: "https://jsonplaceholder.typicode.com",
  userAgent: "Custom User-Agent",
  headers: {
    "Custom-Header": "CustomHeaderValue",
  },
  cookies: {
    "Custom-Cookie": "CustomCookieValue",
  },
  persistCookies: true,
  interceptors: {
    onRequest: (url, init) => {
      // Modify request before it is sent
    },
    onResponse: (url, init, response) => {
      // Process response after it is received
    },
  },
});
```

#### 3. Make a GET request

```typescript
const response = await client.get("/todos/1");

// Retrieve the response data (no need to call `response.json()`)
console.log(response.data);
```

### Features

#### Automatically save cookies from responses

By default, cookies are persisted. You can change this behavior by setting the `persistCookies` option when creating a client.

```typescript
const client = requests.client({
  baseUrl: "https://jsonplaceholder.typicode.com",
  persistCookies: false,
});
```

#### Intercepting requests and responses

You can intercept requests and responses to modify them before they are sent or after they are received.

```typescript
const client = requests.client({
  baseUrl: "https://jsonplaceholder.typicode.com",
  interceptors: {
    onRequest: (url, init) => {
      return { ...init, headers: { ...init.headers, foo: "bar" } };
    },
    onResponse: (url, init, response) => {
      // Process response after it is received
    },
  },
});
```

#### Modify default headers and cookies

Easily modify the default headers and cookies for your client.

```typescript
// Modifying headers
client.headers.set("foo", "bar");

// Modifying cookies
client.cookies.set("foo", "bar");
```

#### Make POST, PUT, DELETE, and PATCH requests

```typescript
// POST request
const postResponse = await client.post("/todos", {
  body: { title: "New todo", completed: false },
});

// PUT request
const putResponse = await client.put("/todos/1", {
  body: { title: "Updated todo", completed: true },
});

// DELETE request
const deleteResponse = await client.delete("/todos/1");

// PATCH request
const patchResponse = await client.patch("/todos/1", {
  body: { title: "Patched todo" },
});
```
