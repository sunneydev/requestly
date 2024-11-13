import { Hono } from "hono";

import { setCookie } from "hono/cookie";

const app = new Hono();

app.get("/get", (c) => {
  const query = c.req.query();
  if (query) {
    return c.json(query);
  }

  return c.json({
    params: query,
    headers: c.req.header(),
    origin: c.req.header("x-forwarded-for") || c.req.header("host"),
    url: c.req.url,
  });
});

app.get("/delay/:s", async (c) => {
  const s = parseInt(c.req.param("s"));
  await new Promise((resolve) => setTimeout(resolve, s * 1000));
  return c.json({ ok: true });
});

app.post("/post", async (c) => {
  const contentType = c.req.header("content-type");

  let data;

  if (contentType?.includes("form")) {
    data = await c.req.formData().then((formData) => {
      const entries = Array.from(formData.entries());
      return Object.fromEntries(entries);
    });
  } else {
    data = await c.req.json();
  }

  return c.json({
    ...data,
    headers: c.req.header(),
    origin: c.req.header("x-forwarded-for") || c.req.header("host"),
    url: c.req.url,
  });
});

app.put("/put", async (c) => {
  const body = await c.req.json();
  return c.json({
    ...body,
    headers: c.req.header(),
    origin: c.req.header("x-forwarded-for") || c.req.header("host"),
    url: c.req.url,
  });
});

app.delete("/delete", (c) => {
  return c.json({
    headers: c.req.header(),
    origin: c.req.header("x-forwarded-for") || c.req.header("host"),
    url: c.req.url,
  });
});

app.patch("/patch", async (c) => {
  const body = await c.req.json();
  return c.json({
    ...body,
    headers: c.req.header(),
    origin: c.req.header("x-forwarded-for") || c.req.header("host"),
    url: c.req.url,
  });
});

app.get("/headers", (c) => {
  return c.json({ ok: true }, 200, c.req.header());
});

app.get("/cookies/set/:name/:value", (c) => {
  const { name, value } = c.req.param();

  setCookie(c, name, value);

  return c.redirect("/cookies");
});

app.get("/cookies", (c) => {
  const cookies =
    c.req
      .header("cookie")
      ?.split(";")
      .reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>) || {};

  return c.json({ cookies });
});

app.get("/redirect/:n", (c) => {
  const n = parseInt(c.req.param("n"));
  if (n > 1) {
    return c.redirect(`/redirect/${n - 1}`);
  } else {
    return c.redirect("/get");
  }
});

app.get("/status/:code", (c) => {
  const code = parseInt(c.req.param("code"));
  return new Response(null, { status: code });
});

export { app };
