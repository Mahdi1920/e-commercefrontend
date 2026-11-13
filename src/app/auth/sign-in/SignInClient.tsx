"use client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FormField } from "@/components/ui/form-field";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Divider, Link as MuiLink, Stack, TextField, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { ApiFetchError } from "@/api/clients";
import { authApi } from "@/api/auth";
import { useSession } from "@/context/session-context";
import { useTranslations } from "@/context/locale-context";

function normalizeApiError(err: unknown): string {
  if (err instanceof ApiFetchError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export default function SignInClient() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const registered = searchParams.get("registered") === "1";
  const reason = searchParams.get("reason");
  const emailFromQuery = searchParams.get("email") ?? "";

  React.useEffect(() => {
    if (emailFromQuery && !email) {
      setEmail(emailFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromQuery]);

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const looksLikeEmail = trimmedEmail.includes("@") && trimmedEmail.includes(".");
  const canSubmit = looksLikeEmail && trimmedPassword.length >= 6;

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email: trimmedEmail, password: trimmedPassword });
      session.login(res.accessToken, (res as any).user ?? null);

      router.replace("/home");
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canSubmit && !loading) {
      e.preventDefault();
      void onSubmit();
    }
  }

  return (
    <Stack spacing={2} onKeyDown={onKeyDown}>
      <Stack spacing={0.5}>
        <Typography variant="h6">{t("AUTH.SIGN_IN")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("AUTH.SIGN_IN_HELP")}
        </Typography>
      </Stack>

      {registered ? <AlertBanner dismissible={false} severity="success">{t("AUTH.ACCOUNT_CREATED")}</AlertBanner> : null}

      {reason === "session" ? (
        <AlertBanner dismissible={false} severity="info">{t("AUTH.SESSION_EXPIRED")}</AlertBanner>
      ) : null}

      {reason === "logout" ? (
        <AlertBanner dismissible={false} severity="info">{t("AUTH.SIGNED_OUT")}</AlertBanner>
      ) : null}

      {error ? <AlertBanner dismissible={false} severity="error">{error}</AlertBanner> : null}

      <FormField
        label={t("SIGNUP.EMAIL")}
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
        inputMode="email"
        autoComplete="email"
        error={Boolean(trimmedEmail) && !looksLikeEmail}
        helperText={Boolean(trimmedEmail) && !looksLikeEmail ? t("AUTH.VALID_EMAIL") : " "}
        fullWidth
      />

      <FormField
        label={t("SIGNUP.PASSWORD")}
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
        type="password"
        autoComplete="current-password"
        helperText={trimmedPassword && trimmedPassword.length < 6 ? t("AUTH.MIN_6") : " "}
        fullWidth
      />

      <Button onClick={onSubmit} disabled={!canSubmit} isLoading={loading}>
        {t("AUTH.SIGN_IN")}
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <MuiLink component={Link} href="/auth/password/forgot-password" variant="body2">
          {t("AUTH.FORGOT_PASSWORD")}
        </MuiLink>
        <MuiLink component={Link} href="/auth/sign-up" variant="body2" fontWeight={600}>
          {t("AUTH.CREATE_ACCOUNT")}
        </MuiLink>
      </Stack>

      <Divider />

      <Typography variant="caption" color="text.secondary">
        If you see â€œAccount is not activatedâ€, go to{" "}
        <MuiLink component={Link} href="/auth/verify-email" underline="hover">
          Verify Email
        </MuiLink>
        .
      </Typography>
    </Stack>
  );
}
