"use server";

const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || "http://localhost:8080";
const ZITADEL_LOGIN_PAT = process.env.ZITADEL_LOGIN_PAT || "";

interface ZitadelSessionResponse {
  sessionId: string;
  sessionToken: string;
  details: {
    sequence: string;
    changeDate: string;
    resourceOwner: string;
  };
  challenges?: {
    webAuthN?: {
      publicKeyCredentialRequestOptions: Record<string, unknown>;
    };
  };
}

interface ZitadelSession {
  session: {
    id: string;
    creationDate: string;
    changeDate: string;
    sequence: string;
    factors: {
      user?: {
        verifiedAt: string;
        id: string;
        loginName: string;
        displayName: string;
      };
      password?: {
        verifiedAt: string;
      };
      webAuthN?: {
        verifiedAt: string;
        userVerified: boolean;
      };
      otp?: {
        verifiedAt: string;
      };
    };
  };
}

interface AuthMethodsResponse {
  authMethodTypes: string[];
}

interface FinalizeResponse {
  callbackUrl: string;
}

function zitadelHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ZITADEL_LOGIN_PAT}`,
  };
}

/**
 * Create a new Zitadel session with a login name (username or email).
 * This is step 1 of the login flow.
 */
export async function createSession(loginName: string): Promise<{
  sessionId: string;
  sessionToken: string;
  userId?: string;
}> {
  const response = await fetch(`${ZITADEL_ISSUER}/v2/sessions`, {
    method: "POST",
    headers: zitadelHeaders(),
    body: JSON.stringify({
      checks: {
        user: {
          loginName,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${error}`);
  }

  const data: ZitadelSessionResponse = await response.json();

  // Fetch the session to get the user ID
  let userId: string | undefined;
  try {
    const sessionData = await getSession(data.sessionId, data.sessionToken);
    userId = sessionData.session.factors.user?.id;
  } catch {
    // User ID lookup is best-effort
  }

  return {
    sessionId: data.sessionId,
    sessionToken: data.sessionToken,
    userId,
  };
}

/**
 * Get session details.
 */
async function getSession(sessionId: string, sessionToken: string): Promise<ZitadelSession> {
  const response = await fetch(`${ZITADEL_ISSUER}/v2/sessions/${sessionId}`, {
    method: "GET",
    headers: {
      ...zitadelHeaders(),
      "x-zitadel-session-token": sessionToken,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get session: ${error}`);
  }

  return response.json();
}

/**
 * Verify password for an existing session.
 * This is step 2 of the login flow.
 */
export async function verifyPassword(
  sessionId: string,
  sessionToken: string,
  password: string
): Promise<{
  sessionToken: string;
  factors: ZitadelSession["session"]["factors"];
}> {
  const response = await fetch(`${ZITADEL_ISSUER}/v2/sessions/${sessionId}`, {
    method: "PATCH",
    headers: zitadelHeaders(),
    body: JSON.stringify({
      sessionToken,
      checks: {
        password: {
          password,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Invalid password: ${error}`);
  }

  const data: ZitadelSessionResponse = await response.json();

  // Get updated session factors
  const sessionData = await getSession(sessionId, data.sessionToken);

  return {
    sessionToken: data.sessionToken,
    factors: sessionData.session.factors,
  };
}

/**
 * List authentication methods available for a user.
 * Used to determine if MFA is required after password verification.
 */
export async function listAuthMethods(userId: string): Promise<string[]> {
  const response = await fetch(
    `${ZITADEL_ISSUER}/v2/users/${userId}/authentication_methods`,
    {
      method: "GET",
      headers: zitadelHeaders(),
    }
  );

  if (!response.ok) {
    return [];
  }

  const data: AuthMethodsResponse = await response.json();
  return data.authMethodTypes || [];
}

/**
 * Finalize the auth request by linking it to the authenticated session.
 * Returns the callback URL that completes the OIDC flow.
 */
export async function finalizeAuthRequest(
  authRequestId: string,
  sessionId: string,
  sessionToken: string
): Promise<string> {
  const response = await fetch(`${ZITADEL_ISSUER}/v2/oidc/authorize`, {
    method: "POST",
    headers: zitadelHeaders(),
    body: JSON.stringify({
      authRequestId,
      session: {
        sessionId,
        sessionToken,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to finalize auth request: ${error}`);
  }

  const data: FinalizeResponse = await response.json();
  return data.callbackUrl;
}
