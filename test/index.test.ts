import { expect, test, mock, beforeAll, afterAll, beforeEach } from "bun:test";
import { Requestly } from "@/";
import { OnResponse } from "@/types";
import { app } from "./server";

const server = Bun.serve({
  fetch: app.fetch,
  port: 3000,
});

const mockHttpbinUrl = "http://localhost:3000";

let requestly: Requestly;

beforeAll(() => {
  requestly = new Requestly({ baseUrl: mockHttpbinUrl });
});

afterAll(() => {
  requestly.cookies.clear();
  server.stop();
});

beforeEach(async () => {
  requestly.cookies.clear();
  // Ensure the cookie jar is empty
  const cookies = await requestly.cookies.getAll(mockHttpbinUrl);
  expect(cookies).toHaveLength(0);
});

test("Requestly constructor", () => {
  const instance = new Requestly("https://example.com");
  expect(instance.baseUrl).toBe("https://example.com");

  const instanceWithOptions = new Requestly({
    baseUrl: "https://example.com",
    headers: { "X-Custom-Header": "Test" },
    userAgent: "CustomUserAgent",
  });
  expect(instanceWithOptions.baseUrl).toBe("https://example.com");
  expect(instanceWithOptions.headers.get("X-Custom-Header")).toBe("Test");
  expect(instanceWithOptions.headers.get("User-Agent")).toBe("CustomUserAgent");
});

test("GET request", async () => {
  const response = await requestly.get("/get");
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
  expect(typeof response.data).toBe("object");
});

test("POST request", async () => {
  const data = { key: "value" };
  const response = await requestly.post("/post", { body: data });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expect.objectContaining(data));
});

test("PUT request", async () => {
  const data = { key: "value" };
  const response = await requestly.put("/put", { body: data });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expect.objectContaining(data));
});

test("DELETE request", async () => {
  const response = await requestly.delete("/delete");
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test("PATCH request", async () => {
  const data = { key: "value" };
  const response = await requestly.patch("/patch", { body: data });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expect.objectContaining(data));
});
test("Request with query parameters", async () => {
  const params = { param1: "value1", param2: "value2" };
  const response = await requestly.get("/get", { params });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(params);
});

test("Request with headers", async () => {
  const customHeaders = { "X-Custom-Header": "TestValue" };
  const response = await requestly.get("/headers", { headers: customHeaders });
  expect(response.status).toBe(200);
  expect(response.headers.get("x-custom-header")).toBe("TestValue");
});

test("Cookies handling", async () => {
  await requestly.get("/cookies/set/sessioncookie/123456789");
  const cookies = await requestly.cookies.getAll(mockHttpbinUrl);
  expect(
    cookies.some(
      (cookie) => cookie.key === "sessioncookie" && cookie.value === "123456789"
    )
  ).toBe(true);

  const cookieValue = await requestly.cookies.get(
    "sessioncookie",
    mockHttpbinUrl
  );
  expect(cookieValue).toBe("123456789");

  await requestly.cookies.set(mockHttpbinUrl, {
    key: "testcookie",
    value: "testvalue",
  });
  const cookie = await requestly.cookies.get("testcookie", mockHttpbinUrl);
  expect(cookie).toBe("testvalue");
  const response = await requestly.get("/cookies");
  expect(response.cookies.testcookie).toBe("testvalue");
});

test("URL handling", async () => {
  const response = await requestly.get("/get");

  expect(response.request.url).toBe("/get");
});

test("Redirect handling 1", async () => {
  const response = await requestly.get("/redirect/1");

  expect(response.status).toBe(200);
  expect(response.request.url).toBe("/get");
});

test("Redirect handling 2", async () => {
  const response = await requestly.get("/redirect/2");

  expect(response.status).toBe(200);
  expect(response.url).toBe(`${mockHttpbinUrl}/get`);
});

test("onRequest middleware", async () => {
  const onRequestMock = mock((url: string, init: RequestInit) => {
    return {
      headers: {
        ...init.headers,
        "X-Middleware-Header": "TestValue",
      },
    };
  });

  requestly.onRequest.set(onRequestMock);

  const response = await requestly.get("/headers");
  expect(onRequestMock).toHaveBeenCalled();
  expect(response.headers.get("x-middleware-header")).toBe("TestValue");
});

test("onResponse middleware", async () => {
  const onResponseMock = mock<OnResponse<{ middlewareModified: boolean }>>(
    ({ response }) => {
      return {
        ...response,
        data: { ...response.data, middlewareModified: true },
      };
    }
  );

  requestly.onResponse.set(onResponseMock);

  const response = await requestly.get("/get");

  expect(onResponseMock).toHaveBeenCalled();
  expect(response.data).toHaveProperty("middlewareModified", true);
  requestly.onResponse.remove();
});

test("Request body serialization", async () => {
  const jsonData = { key: "value" };
  const response = await requestly.post("/post", { body: jsonData });
  expect(response.data).toEqual(expect.objectContaining(jsonData));

  const formData = new FormData();
  formData.append("key", "value");
  const formDataResponse = await requestly.post("/post", { body: formData });
  expect(formDataResponse.data).toEqual(
    expect.objectContaining({ key: "value" })
  );
});

test("Base URL handling", () => {
  const instance = new Requestly("https://example.com");
  expect(instance.baseUrl).toBe("https://example.com");

  instance.baseUrl = "https://newexample.com";
  expect(instance.baseUrl).toBe("https://newexample.com");
});

test("Create new instance", () => {
  const newInstance = requestly.create("https://example.com");
  expect(newInstance).toBeInstanceOf(Requestly);
  expect(newInstance.baseUrl).toBe("https://example.com");
});

test("Headers manipulation", () => {
  requestly.headers.set("X-Test-Header", "TestValue");
  expect(requestly.headers.get("X-Test-Header")).toBe("TestValue");

  requestly.headers.update({ "X-Another-Header": "AnotherValue" });
  expect(requestly.headers.get("X-Another-Header")).toBe("AnotherValue");

  requestly.headers.remove("X-Test-Header");
  expect(requestly.headers.get("X-Test-Header")).toBeUndefined();

  const allHeaders = requestly.headers.getAll();
  expect(allHeaders["X-Another-Header"]).toBe("AnotherValue");
});

test("Params handling", () => {
  requestly.params = { globalParam: "globalValue" };
  expect(requestly.params).toEqual({ globalParam: "globalValue" });
});

test("Cookie serialization and deserialization", () => {
  const cookies = [
    { key: "testCookie", value: "testValue", domain: "httpbin.org", path: "/" },
  ];
  requestly.cookies.deserialize(cookies);

  const serializedCookies = requestly.cookies.serialize();
  expect(serializedCookies).toHaveLength(1);
  expect(serializedCookies[0].key).toBe("testCookie");
  expect(serializedCookies[0].value).toBe("testValue");
});

test("Error handling - invalid URL", async () => {
  const instance = new Requestly();
  expect(instance.get("invalid-url")).rejects.toThrow();
});

test("Max redirects", async () => {
  const instance = new Requestly({ maxRedirects: 2 });
  expect(instance.get("/redirect/3")).rejects.toThrow();
});

test("Content types - form data", async () => {
  const formData = new FormData();
  formData.append("key", "value");
  const response = await requestly.post("/post", { body: formData });
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty("key", "value");
});

test("URL handling - relative URL with base", () => {
  const instance = new Requestly("http://localhost:3000");
  expect(() => instance.get("/path")).not.toThrow();
});

test("URL handling - relative URL without base", () => {
  const instance = new Requestly();
  expect(() => instance.get("/path")).toThrow();
});

test("Retry method", async () => {
  const response = await requestly.get("/status/329");
  expect(response.status).toBe(329);
  const retryResponse = await response.retry();
  expect(retryResponse.status).toBe(329);
});

test("Multiple cookies", async () => {
  // Set the first cookie
  const request1 = await requestly.get("/cookies/set/cookie1/value1");
  expect(request1.cookies).toEqual({ cookie1: "value1" });

  // Set the second cookie
  const request2 = await requestly.get("/cookies/set/cookie2/value2");
  expect(request2.cookies).toEqual({ cookie1: "value1", cookie2: "value2" });

  // Get all cookies
  const response = await requestly.get("/cookies");
  expect(response.cookies).toEqual({
    cookie1: "value1",
    cookie2: "value2",
  });
});

test("Cookies handling", async () => {
  // Set a cookie using the API
  await requestly.get("/cookies/set/sessioncookie/123456789");

  // Verify the cookie was set
  const cookies = await requestly.cookies.getAll(mockHttpbinUrl);
  const sessionCookie = cookies.find(
    (cookie) => cookie.key === "sessioncookie"
  );
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.value).toBe("123456789");

  // Get a specific cookie
  const cookieValue = await requestly.cookies.get(
    "sessioncookie",
    mockHttpbinUrl
  );
  expect(cookieValue).toBe("123456789");

  // Set a cookie manually
  await requestly.cookies.set(mockHttpbinUrl, {
    key: "testcookie",
    value: "testvalue",
  });

  // Verify both cookies are present
  const response = await requestly.get("/cookies");
  expect(response.cookies).toEqual({
    sessioncookie: "123456789",
    testcookie: "testvalue",
  });
});

test("Fetch method", async () => {
  const response = await requestly.fetch("/get", { method: "GET" });
  expect(response.status).toBe(200);
});

test("URL normalization", () => {
  const instance = new Requestly("https://example.com/");
  expect(instance.baseUrl).toBe("https://example.com/");

  // Test double slash handling
  const response = instance.get("//api/endpoint");
  expect(response).rejects.toThrow();

  // Test query string with special characters
  const specialCharsInstance = new Requestly();
  specialCharsInstance.params = {
    special: "!@#$%^&*()",
    spaces: "hello world",
    unicode: "🌎",
  };
  expect(specialCharsInstance.params["special"]).toBe("!@#$%^&*()");
});

test("Cookie domain validation", async () => {
  const instance = new Requestly("https://example.com");

  // Test subdomain cookie handling
  await instance.cookies.set("https://sub.example.com", {
    key: "subdomain",
    value: "test",
  });

  // Should work for main domain
  const mainDomainCookie = await instance.cookies.get(
    "subdomain",
    "https://example.com"
  );
  expect(mainDomainCookie).toBe("test");

  // Should not work for different domain
  const differentDomainCookie = await instance.cookies.get(
    "subdomain",
    "https://different.com"
  );
  expect(differentDomainCookie).toBeNull();
});

test("Request timeout handling", async () => {
  const instance = new Requestly({
    baseUrl: "http://localhost:3000",
    fetchOptions: {
      signal: AbortSignal.timeout(1), // 1ms timeout
    },
  });

  // Should timeout
  expect(instance.get("/delay/2")).rejects.toThrow();
});

test("Large request body handling", async () => {
  const instance = new Requestly("http://localhost:3000");

  // Create large JSON payload
  const largeData = {
    array: Array(1000).fill({ data: "x".repeat(1000) }),
  };

  const response = await instance.post("/post", { body: largeData });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expect.objectContaining(largeData));
});

test("Multiple concurrent requests", async () => {
  const instance = new Requestly("http://localhost:3000");

  // Make multiple concurrent requests
  const promises = Array(10)
    .fill(null)
    .map((_, i) => instance.get(`/get?id=${i}`));

  const responses = await Promise.all(promises);
  expect(responses).toHaveLength(10);
  responses.forEach((response) => {
    expect(response.status).toBe(200);
  });
});

test("Request body content types", async () => {
  const instance = new Requestly("http://localhost:3000");

  // Test URLSearchParams
  const urlParams = new URLSearchParams();
  urlParams.append("key", "value");
  const urlParamsResponse = await instance.post("/post", { body: urlParams });
  expect(urlParamsResponse.status).toBe(200);

  // Test FormData with files
  const formData = new FormData();
  const blob = new Blob(["test"], { type: "text/plain" });
  formData.append("file", blob, "test.txt");
  const formDataResponse = await instance.post("/post", { body: formData });
  expect(formDataResponse.status).toBe(200);

  // Test empty body
  const emptyResponse = await instance.post("/post", { body: null });
  expect(emptyResponse.status).toBe(200);
});

// test("Header case sensitivity", async () => {
//   const instance = new Requestly("http://localhost:3000");

//   // Set headers with different cases
//   instance.headers.set("Content-Type", "application/json");
//   instance.headers.set("CONTENT-TYPE", "text/plain");
//   instance.headers.set("content-type", "application/xml");

//   // Should use the last set header regardless of case
//   const headers = instance.headers.getAll();
//   const contentTypeKeys = Object.keys(headers).filter(
//     (key) => key.toLowerCase() === "content-type"
//   );
//   expect(contentTypeKeys).toHaveLength(1);
// });

test("Request cancellation", async () => {
  const instance = new Requestly("http://localhost:3000");

  const controller = new AbortController();
  const promise = instance.get("/delay/5", {
    signal: controller.signal,
  });

  controller.abort();

  expect(promise).rejects.toThrow();
});

test("Retry with modified request", async () => {
  const instance = new Requestly("http://localhost:3000");

  // First request with invalid data
  const response = await instance.post("/post", {
    body: { invalid: true },
  });

  // Retry with corrected data
  const retryResponse = await response.retry();
  expect(retryResponse.status).toBe(200);
});

test("Base URL modification mid-request", async () => {
  const instance = new Requestly("http://localhost:3000");

  // Start request
  const promise = instance.get("/get");

  // Change base URL during request
  instance.baseUrl = "https://different.com";

  // Original request should still use old base URL
  const response = await promise;
  expect(response.url).toContain("localhost:3000");
});

test.only("Cookie attributes handling", async () => {
  const instance = new Requestly("http://localhost:3000");

  // Set cookie with various attributes
  await instance.cookies.set("localhost:3000", {
    key: "test",
    value: "value",
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    maxAge: 86400,
    domain: "localhost",
    path: "/test",
    secure: true,
    httpOnly: true,
  });

  const cookies = await instance.cookies.getAll("http://localhost:3000");
  console.log(cookies);
  const testCookie = cookies.find((c) => c.key === "test");

  expect(testCookie).toBeDefined();
  expect(testCookie?.secure).toBe(true);
  expect(testCookie?.httpOnly).toBe(true);
  expect(testCookie?.path).toBe("/test");
});
