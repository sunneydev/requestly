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

test.only("Requestly constructor", () => {
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

test.only("GET request", async () => {
  const response = await requestly.get("/get");
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
  expect(typeof response.data).toBe("object");
});

test.only("POST request", async () => {
  const data = { key: "value" };
  const response = await requestly.post("/post", { body: data });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expect.objectContaining(data));
});

test.only("PUT request", async () => {
  const data = { key: "value" };
  const response = await requestly.put("/put", { body: data });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expect.objectContaining(data));
});

test.only("DELETE request", async () => {
  const response = await requestly.delete("/delete");
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test.only("PATCH request", async () => {
  const data = { key: "value" };
  const response = await requestly.patch("/patch", { body: data });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expect.objectContaining(data));
});
test.only("Request with query parameters", async () => {
  const params = { param1: "value1", param2: "value2" };
  const response = await requestly.get("/get", { params });
  expect(response.status).toBe(200);
  expect(response.data).toEqual(params);
});

test.only("Request with headers", async () => {
  const customHeaders = { "X-Custom-Header": "TestValue" };
  const response = await requestly.get("/headers", { headers: customHeaders });
  expect(response.status).toBe(200);
  expect(response.headers.get("x-custom-header")).toBe("TestValue");
});

test.only("Cookies handling", async () => {
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

test.only("URL handling", async () => {
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

test.only("Base URL handling", () => {
  const instance = new Requestly("https://example.com");
  expect(instance.baseUrl).toBe("https://example.com");

  instance.baseUrl = "https://newexample.com";
  expect(instance.baseUrl).toBe("https://newexample.com");
});

test.only("Create new instance", () => {
  const newInstance = requestly.create("https://example.com");
  expect(newInstance).toBeInstanceOf(Requestly);
  expect(newInstance.baseUrl).toBe("https://example.com");
});

test.only("Headers manipulation", () => {
  requestly.headers.set("X-Test-Header", "TestValue");
  expect(requestly.headers.get("X-Test-Header")).toBe("TestValue");

  requestly.headers.update({ "X-Another-Header": "AnotherValue" });
  expect(requestly.headers.get("X-Another-Header")).toBe("AnotherValue");

  requestly.headers.remove("X-Test-Header");
  expect(requestly.headers.get("X-Test-Header")).toBeUndefined();

  const allHeaders = requestly.headers.getAll();
  expect(allHeaders["X-Another-Header"]).toBe("AnotherValue");
});

test.only("Params handling", () => {
  requestly.params = { globalParam: "globalValue" };
  expect(requestly.params).toEqual({ globalParam: "globalValue" });
});

test.only("Cookie serialization and deserialization", () => {
  const cookies = [
    { key: "testCookie", value: "testValue", domain: "httpbin.org", path: "/" },
  ];
  requestly.cookies.deserialize(cookies);

  const serializedCookies = requestly.cookies.serialize();
  expect(serializedCookies).toHaveLength(1);
  expect(serializedCookies[0].key).toBe("testCookie");
  expect(serializedCookies[0].value).toBe("testValue");
});

test.only("Error handling - invalid URL", async () => {
  const instance = new Requestly();
  expect(instance.get("invalid-url")).rejects.toThrow();
});

test.only("Max redirects", async () => {
  const instance = new Requestly({ maxRedirects: 2 });
  expect(instance.get("/redirect/3")).rejects.toThrow();
});

test.only("Content types - form data", async () => {
  const formData = new FormData();
  formData.append("key", "value");
  const response = await requestly.post("/post", { body: formData });
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty("key", "value");
});

test.only("URL handling - relative URL with base", () => {
  const instance = new Requestly("http://localhost:3000");
  expect(() => instance.get("/path")).not.toThrow();
});

test.only("URL handling - relative URL without base", () => {
  const instance = new Requestly();
  expect(() => instance.get("/path")).toThrow();
});

test.only("Retry method", async () => {
  const response = await requestly.get("/status/329");
  expect(response.status).toBe(329);
  const retryResponse = await response.retry();
  expect(retryResponse.status).toBe(329);
});

test.only("Multiple cookies", async () => {
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

test.only("Cookies handling", async () => {
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

test.only("Fetch method", async () => {
  const response = await requestly.fetch("/get", { method: "GET" });
  expect(response.status).toBe(200);
});
