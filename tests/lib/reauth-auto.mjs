/*
 * Reautenticacion automatica para las suites de API (Fase 2).
 *
 * Las acciones criticas (A, AN, visto bueno, usuarios) exigen el encabezado
 * X-Reauth con un token de un solo uso. Para no repetir ese paso en cada caso de
 * las suites anteriores, este modulo envuelve `fetch`:
 *  - recuerda la contrasena de cada token emitido por /auth/login (y por
 *    /auth/password, que devuelve una sesion nueva);
 *  - si una respuesta es 401 `reauth_required`, pide el token a /auth/reauth con
 *    esa contrasena y repite la peticion con X-Reauth.
 * Una peticion con el encabezado `X-Sin-Reauth-Auto: 1` no se reintenta (para
 * probar el 401 mismo). Importarlo al inicio de cada suite: `import "./lib/reauth-auto.mjs";`
 */
const original = globalThis.fetch;
const passwords = new Map();

const tokenDe = (headers) => {
  const auth = headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
};

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const headers = new Headers(init.headers || {});
  const sinAuto = headers.get("x-sin-reauth-auto") === "1";
  headers.delete("x-sin-reauth-auto");
  const res = await original(input, { ...init, headers });
  const esLogin = /\/api\/auth\/(login|password)$/.test(url) && String(init.method || "GET").toUpperCase() === "POST";
  if (esLogin && res.ok) {
    try {
      const body = JSON.parse(String(init.body || "{}"));
      const data = await res.clone().json();
      const pwd = url.endsWith("/password") ? body.nueva : body.password;
      if (data?.token && pwd) passwords.set(data.token, pwd);
    } catch {
      /* sin JSON */
    }
  }
  if (res.status !== 401 || sinAuto) return res;
  const data = await res.clone().json().catch(() => null);
  if (data?.codigo !== "reauth_required") return res;
  const token = tokenDe(headers);
  const password = token ? passwords.get(token) : null;
  if (!password) return res;
  const base = url.slice(0, url.indexOf("/api/") + 5);
  const r = await original(`${base}auth/reauth`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(headers.get("x-forwarded-for") ? { "X-Forwarded-For": headers.get("x-forwarded-for") } : {}) }, body: JSON.stringify({ accion: data.accion, password }) });
  const reauth = await r.json().catch(() => null);
  if (!r.ok || !reauth?.token) return res;
  headers.set("X-Reauth", reauth.token);
  return original(input, { ...init, headers });
};

/* Para suites que obtienen el token por otra via. */
export function recordarPassword(token, password) {
  if (token && password) passwords.set(token, password);
}
