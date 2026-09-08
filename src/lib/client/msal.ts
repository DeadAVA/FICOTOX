import { API_BASE_URL, postJson } from "./api";
import type { ApiRecord, AuthConfig } from "./types";

/*
 * Login con Microsoft Entra ID (MSAL Browser), equivalente a getMsalClient /
 * loginWithMicrosoft de el app.js de la interfaz original. La libreria se importa bajo demanda.
 */

type MsalClient = import("@azure/msal-browser").PublicClientApplication;

let msalClient: MsalClient | null = null;

export const getMsalClientInstance = (): MsalClient | null => msalClient;

const getMsalClient = async (authConfig: AuthConfig): Promise<MsalClient> => {
  if (msalClient) return msalClient;
  const config = authConfig.microsoft || {};
  if (!config.enabled) {
    throw new Error("Microsoft Entra ID no está configurado");
  }
  const { PublicClientApplication } = await import("@azure/msal-browser");
  const client = new PublicClientApplication({
    auth: {
      clientId: config.clientId || "",
      authority: config.authority,
      redirectUri: window.location.origin + "/",
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  });
  await client.initialize();
  msalClient = client;
  return client;
};

export const loginWithMicrosoft = async (authConfig: AuthConfig): Promise<ApiRecord | null> => {
  const client = await getMsalClient(authConfig);
  const request = { scopes: ["openid", "profile", "email"] };
  let authResult;
  try {
    authResult = await client.loginPopup(request);
  } catch (error) {
    const code = String((error as { errorCode?: string })?.errorCode || "");
    if (code.includes("popup")) {
      await client.loginRedirect(request);
      return null;
    }
    throw error;
  }

  if (!authResult.idToken) {
    throw new Error("Microsoft no devolvió un token de identidad");
  }

  return postJson(`${API_BASE_URL}/auth/microsoft`, { id_token: authResult.idToken });
};

export const logoutMicrosoft = (): void => {
  if (!msalClient) return;
  const account = msalClient.getActiveAccount && msalClient.getActiveAccount();
  if (account) {
    msalClient.logoutPopup({ account }).catch(() => {});
  }
};
