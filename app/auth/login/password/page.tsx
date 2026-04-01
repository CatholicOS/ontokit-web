"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { BackLink } from "@/components/auth/BackLink";
import { Button } from "@/components/ui/button";
import { verifyPassword, listAuthMethods, finalizeAuthRequest } from "@/lib/auth/zitadel-session";
import { getLoginSession, setLoginSession, clearLoginSession } from "@/lib/auth/login-session";

export default function PasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginName, setLoginName] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadSession() {
      const session = await getLoginSession();
      if (!session) {
        // No session cookie — redirect back to login
        router.replace("/auth/signin");
        return;
      }
      setLoginName(session.loginName || null);
      setSessionReady(true);
    }
    loadSession();
  }, [router]);

  useEffect(() => {
    if (sessionReady) {
      inputRef.current?.focus();
    }
  }, [sessionReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const session = await getLoginSession();
      if (!session) {
        router.replace("/auth/signin");
        return;
      }

      const result = await verifyPassword(session.sessionId, session.sessionToken, password);

      // Update the session token (it changes after each check)
      await setLoginSession({
        ...session,
        sessionToken: result.sessionToken,
      });

      // Check if MFA is required
      const mfaMethods: string[] = [];
      if (session.userId) {
        try {
          const methods = await listAuthMethods(session.userId);
          // Filter for second-factor methods (TOTP, passkey, etc.)
          const secondFactors = methods.filter(
            (m) => m !== "AUTHENTICATION_METHOD_TYPE_PASSWORD" && m !== "AUTHENTICATION_METHOD_TYPE_UNSPECIFIED"
          );
          mfaMethods.push(...secondFactors);
        } catch {
          // If we can't check auth methods, try to finalize directly
        }
      }

      if (mfaMethods.length > 0) {
        // MFA required — redirect to MFA page (Phase 3)
        // For now, try to finalize anyway; Zitadel will enforce MFA if required
        router.push("/auth/login/mfa");
        return;
      }

      // No MFA required — finalize the auth request
      const callbackUrl = await finalizeAuthRequest(
        session.authRequestId,
        session.sessionId,
        result.sessionToken
      );

      // Clean up the login session cookie
      await clearLoginSession();

      // Redirect to the NextAuth callback to complete OIDC flow
      router.push(callbackUrl);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid password")) {
        setError("Incorrect password. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <AuthCard>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mb-4">
        <BackLink href="/auth/signin" label="Use a different account" />
      </div>

      <h2 className="mb-2 text-center text-xl font-semibold text-slate-900 dark:text-white">
        Enter your password
      </h2>
      {loginName && (
        <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Signing in as <span className="font-medium text-slate-700 dark:text-slate-300">{loginName}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          ref={inputRef}
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={error || undefined}
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
