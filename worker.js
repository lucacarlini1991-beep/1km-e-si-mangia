import fuelHandler from "./api/fuel-nearby.js";
import placesHandler from "./api/places.js";
import routeHandler from "./api/route.js";
import healthHandler from "./api/health.js";

async function handleRequest(request, env, handler) {
  const url = new URL(request.url);
  const method = request.method;
  let body = undefined;

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        body = await request.json();
      } catch (_) {
        body = {};
      }
    }
  }

  const responseState = {
    status: 200,
    headers: {},
    body: null
  };

  const req = {
    method,
    query: Object.fromEntries(url.searchParams.entries()),
    body
  };

  const res = {
    status(code) {
      responseState.status = code;
      return this;
    },
    setHeader(name, value) {
      responseState.headers[name] = String(value);
      return this;
    },
    json(payload) {
      responseState.body = payload;
      return this;
    }
  };

  await handler(req, res, env);

  return new Response(JSON.stringify(responseState.body ?? {}), {
    status: responseState.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...responseState.headers
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/fuel-nearby") {
      return handleRequest(request, env, fuelHandler);
    }

    if (url.pathname === "/api/places") {
      return handleRequest(request, env, placesHandler);
    }

    if (url.pathname === "/api/route") {
      return handleRequest(request, env, routeHandler);
    }

    if (url.pathname === "/api/health") {
      return handleRequest(request, env, healthHandler);
    }

    return env.ASSETS.fetch(request);
  }
};
