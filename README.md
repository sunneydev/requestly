# requests

A very minimal **(1.2kb)**, but powerful HTTP Client for Node.js

### Motivation

I've decided to create `requests`, because every other existing alternative `axios`, `node-fetch`, `got` was either lacking critical features, like:

- Automatically setting cookies from the response
- Modifying the existing the existing HTTP client's headers/cookies

or... they just were too bloated

### Installation

```bash
npm install @sunney/requests
```

### Usage

#### Creating an HTTP Client and making a GET request

```ts
import requests from "@sunney/requests";

const reqs = requests.create({
  baseUrl: "https://jsonplaceholder.typicode.com",
});

const res = reqs.get("/todos/1");

// Retrieve body (no need to `res.json()`)
console.log(res.data);
```

## Features

#### Automatically save cookies from response

```ts
await reqs.get("https://httpbin.org/cookies/set", { params: { test: 123 } });

console.log(reqs.cookies);
```

#### Modify default headers/cookies really easily

```ts
// Modifying headers
reqs.headers.set("foo", "bar");

// Modifying cookies
reqs.cookies.set("foo", "bar");
```
