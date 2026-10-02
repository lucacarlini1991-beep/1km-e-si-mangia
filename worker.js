import fuelHandler from "./api/fuel-nearby.js";

function handleFuelRequest(request) {
  const url = new URL(request.url);
  const responseState = {
    status: 200,
    headers: {},
    body: null
  };

  const req = {
    method: request.method,
    query: Object.fromEntries(url.searchParams.entries())
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
    json(body) {
      responseState.body = body;
      return this;
    }
  };

  return Promise.resolve(fuelHandler(req, res)).then(() => {
    return new Response(JSON.stringify(responseState.body ?? {}), {
      status: responseState.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...responseState.headers
      }
    });
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/fuel-nearby") {
      return handleFuelRequest(request);
    }

    return env.ASSETS.fetch(request);
  }
};
