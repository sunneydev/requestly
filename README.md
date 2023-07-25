# requestly

#### Modern, lightweight and feature-rich powerful HTTP client for Node.js, built on top of the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

## Features

- **Automatic Cookie Management 🍪** - No more hassle with manual cookie management, requestly takes care of saving cookies from responses automatically.
- **Intercept Requests and Responses ⚡** - Modify requests before they are sent and responses after they are received. This is useful for adding authentication headers, logging requests, and more.
- **Custom Instances 🛠️** - Create custom instances with a base URL, default headers, params, and more.
- **Modify Default Headers and Cookies 📝** - Easily modify the default headers and cookies for your client.
- **Supports TypeScript 🚀** - Built with TypeScript, requestly provides type definitions out of the box.
- **Environment Independent 🌎** - Be it Node.js or the browser, requestly works everywhere.
- **Lightweight ♻️** - requestly is incredibly lightweight, weighing in at only 1.2kb.

## Installation

#### npm

```js
npm install requestly
```

#### yarn

```js
yarn add requestly
```

#### pnpm

```js
pnpm add requestly
```

## Usage

#### 1. Import the library

```typescript
import requestly from "requestly";
```

#### 2. Create a custom instance (optional, but recommended)

Creating a custom instance allows you to set a base URL, default headers, params, manage cookies, and intercept requests/responses.

```typescript
const client = requestly.create({
  baseUrl: "https://jsonplaceholder.typicode.com",
  userAgent: "Custom User-Agent",
  headers: {
    "Custom-Header": "CustomHeaderValue",
  },
  cookies: {
    "Custom-Cookie": "CustomCookieValue",
  },
  interceptors: {
    onRequest: (url, init) => {
      // Modify request before it is sent
    },
    onResponse: (url, init, response) => {
      // Process response after it is received
    },
  },
});

// or create a client with a custom baseUrl without any options
const client = requestly.create("https://jsonplaceholder.typicode.com");
```

#### 3. Make a GET request

```typescript
const response = await client.get("/todos/1");

// Retrieve the response data (no need to call `response.json()`)
console.log(response.data);
```

## Features

#### Automatically save cookies from responses

By default, cookies are persisted. You can change this behavior by setting the `storeCookies` option when creating a client.

```typescript
const client = requestly.create({
  baseUrl: "https://jsonplaceholder.typicode.com",
  storeCookies: false,
});
```

#### Intercepting requests and responses

You can intercept requests and responses to modify them before they are sent or after they are received.

```typescript
const client = requestly.create({
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
