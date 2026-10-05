import { createSign } from "node:crypto";

/** Leitura do Google Analytics 4 (GA4 Data API) por conta de serviço. Só roda no servidor. */

export type AnalyticsReport = {
  configured: true;
  days: 7 | 30;
  totals: { today: Totals; week: Totals; month: Totals };
  pages: { name: string; value: number }[];
  events: { name: string; value: number }[];
  countries: { name: string; value: number }[];
  devices: { name: string; value: number }[];
  fetchedAt: string;
};
type Totals = { users: number; sessions: number; views: number };

const PROPERTY = process.env.GA4_PROPERTY_ID ?? "";
const RAW_KEY = process.env.GA_SERVICE_ACCOUNT_JSON ?? "";

/** O que ainda falta configurar (vazio = pronto). */
export function missingConfig(): string[] {
  const miss: string[] = [];
  if (!PROPERTY) miss.push("GA4_PROPERTY_ID");
  if (!RAW_KEY) miss.push("GA_SERVICE_ACCOUNT_JSON");
  return miss;
}

function serviceAccount(): { client_email: string; private_key: string } {
  const text = RAW_KEY.trim().startsWith("{") ? RAW_KEY : Buffer.from(RAW_KEY, "base64").toString("utf8");
  const j = JSON.parse(text) as { client_email?: string; private_key?: string };
  if (!j.client_email || !j.private_key) throw new Error("chave inválida");
  return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n") };
}

const b64 = (o: object | Buffer) => Buffer.from(o instanceof Buffer ? o : JSON.stringify(o)).toString("base64url");

let token: { value: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.exp - 60 > now) return token.value;
  const sa = serviceAccount();
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${body}.${b64(sig)}` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, exp: now + j.expires_in };
  return token.value;
}

type Row = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };
type Resp = { reports?: { rows?: Row[] }[] };

const list = (rows: Row[] | undefined) => (rows ?? []).map((r) => ({ name: r.dimensionValues?.[0]?.value ?? "—", value: Number(r.metricValues?.[0]?.value ?? 0) }));

const cache = new Map<number, { at: number; data: AnalyticsReport }>();

/** Relatório do painel (guardado por 5 minutos para não gastar a cota do Google). */
export async function fetchReport(days: 7 | 30): Promise<AnalyticsReport> {
  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.data;

  const range = [{ startDate: `${days}daysAgo`, endDate: "today" }];
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:batchRunReports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          dateRanges: [
            { startDate: "today", endDate: "today", name: "today" },
            { startDate: "7daysAgo", endDate: "today", name: "week" },
            { startDate: "30daysAgo", endDate: "today", name: "month" },
          ],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
        },
        { dateRanges: range, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 },
        { dateRanges: range, dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 12 },
        { dateRanges: range, dimensions: [{ name: "country" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 6 },
        { dateRanges: range, dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }] },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`ga ${res.status}`);
  const data = (await res.json()) as Resp;
  const r = data.reports ?? [];

  const totals: Record<string, Totals> = { today: { users: 0, sessions: 0, views: 0 }, week: { users: 0, sessions: 0, views: 0 }, month: { users: 0, sessions: 0, views: 0 } };
  for (const row of r[0]?.rows ?? []) {
    const k = row.dimensionValues?.[0]?.value;
    if (k && totals[k]) totals[k] = { users: Number(row.metricValues?.[0]?.value ?? 0), sessions: Number(row.metricValues?.[1]?.value ?? 0), views: Number(row.metricValues?.[2]?.value ?? 0) };
  }
  const out: AnalyticsReport = {
    configured: true,
    days,
    totals: { today: totals.today, week: totals.week, month: totals.month },
    pages: list(r[1]?.rows),
    events: list(r[2]?.rows),
    countries: list(r[3]?.rows),
    devices: list(r[4]?.rows),
    fetchedAt: new Date().toISOString(),
  };
  cache.set(days, { at: Date.now(), data: out });
  return out;
}
