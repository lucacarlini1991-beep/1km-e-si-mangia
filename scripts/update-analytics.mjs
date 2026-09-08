import { writeFile } from "node:fs/promises";

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID || "1km-e-si-mangia";
const teamId = process.env.VERCEL_TEAM_ID;

if (!token) {
  throw new Error("Manca VERCEL_TOKEN nei GitHub Secrets.");
}

const API = "https://api.vercel.com/v1/query/web-analytics/visits/count";

function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function count({ since, until, filter }) {
  const url = new URL(API);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  if (filter) url.searchParams.set("filter", filter);
  if (teamId) url.searchParams.set("teamId", teamId);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vercel Analytics ${response.status}: ${body}`);
  }

  const json = await response.json();
  return {
    visitors: json?.data?.visitors ?? null,
    pageviews: json?.data?.pageviews ?? null,
  };
}

async function collect(hours) {
  const since = isoHoursAgo(hours);
  const until = new Date().toISOString();
  const production = "environment eq 'production'";

  const [totale, uscite, parcheggi, facebook] = await Promise.all([
    count({ since, until, filter: production }),
    count({ since, until, filter: `${production} and requestPath eq '/uscite'` }),
    count({ since, until, filter: `${production} and requestPath eq '/parcheggi'` }),
    count({ since, until, filter: `${production} and referrerHostname eq 'facebook.com'` }),
  ]);

  return {
    since,
    until,
    totale,
    uscite,
    parcheggi,
    facebook,
  };
}

const report = {
  project: projectId,
  updatedAt: new Date().toISOString(),
  source: "Vercel Web Analytics API",
  note: "Il bounce rate non è incluso in questo report perché l'API pubblica usata qui espone direttamente visitatori e pageviews.",
  last24h: await collect(24),
  last7d: await collect(24 * 7),
};

await writeFile("analytics-report.json", JSON.stringify(report, null, 2) + "\n");
console.log("Analytics aggiornati:", report.updatedAt);
console.log(JSON.stringify(report, null, 2));
