# requests

A very minimal **(1.2kb)**, but powerful HTTP Client for Node.js built on top of [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

### Motivation

I've decided to create `requests`, because every other existing alternative `axios`, `node-fetch`, `got` was either lacking critical features, like:

- Automatically setting cookies from the response
- Modifying the existing the existing HTTP client's headers/cookies
- Rich API of Intercepting the request/response and modifying it

or... they just were too bloated

### Installation

```bash
npm install @sunney/requests
```

### Usage

#### Creating an HTTP Client and making a GET request

```ts
import requests from "@sunney/requests";

const client = requests.create({
  baseUrl: "https://jsonplaceholder.typicode.com",
});

const response = await client.get("/todos/1");

// Retrieve body (no need to `response.json()`)
console.log(response.data);
```

## Features

#### Automatically save cookies from response

```ts
await client.get("https://httpbin.org/cookies/set", { params: { test: 123 } });

console.log(client.cookies);
// { test: 123 }
```

#### Intercepting requests and responses

```ts
// Change the request headers before sending it
const client = requests.create();

client.intercept({
  onRequest(url, init) {
    return { ...init, foo: "bar" };
  },
});
```

#### Modify default headers/cookies really easily

```ts
// Modifying headers
client.headers.set("foo", "bar");

// Modifying cookies
client.cookies.set("foo", "bar");
```
