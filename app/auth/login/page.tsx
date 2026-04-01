"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { Button } from "@/components/ui/button";
import { createSession } from "@/lib/auth/zitadel-session";
import { setLoginSession } from "@/lib/auth/login-session";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const authRequestId = searchParams.get("authRequest") || "";

  const [loginName, setLoginName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginName.trim()) {
      setError("Please enter your username or email.");
      return;
    }

    if (!authRequestId) {
      setError("Missing auth request. Please start the sign-in flow again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createSession(loginName.trim());

      await setLoginSession({
        sessionId: result.sessionId,
        sessionToken: result.sessionToken,
        authRequestId,
        loginName: loginName.trim(),
        userId: result.userId,
      });

      router.push("/auth/login/password");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes("not found")
            ? "User not found. Please check your username or email."
            : "Something went wrong. Please try again."
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard>
      <h2 className="mb-6 text-center text-xl font-semibold text-slate-900 dark:text-white">
        Sign in
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          ref={inputRef}
          label="Username or email"
          type="text"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
          error={error || undefined}
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCard>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        </AuthCard>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
