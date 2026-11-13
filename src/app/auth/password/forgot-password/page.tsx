"use client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FormField } from "@/components/ui/form-field";

import * as React from "react";
import Link from "next/link";
import { Alert, Stack, TextField, Typography, Link as MuiLink, Divider } from "@mui/material";
import { Button } from "@/components/ui/button";
import { ApiFetchError } from "@/api/clients";
import { authApi } from "@/api/auth";
import { useTranslations } from "@/context/locale-context";

function normalizeApiError(err: unknown): string {
  if (err instanceof ApiFetchError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setMessage(res.message);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{t("AUTH.FORGOT_TITLE")}</Typography>

      {error ? <AlertBanner dismissible={false} severity="error">{error}</AlertBanner> : null}
      {message ? <AlertBanner dismissible={false} severity="success">{message}</AlertBanner> : null}

      <FormField
        label={t("SIGNUP.EMAIL")}
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
        inputMode="email"
        fullWidth
      />

      <Button onClick={onSubmit} disabled={!email.trim()} isLoading={loading}>
        {t("AUTH.SEND_RESET_LINK")}
      </Button>

      <Divider />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <MuiLink component={Link} href="/auth/sign-in" variant="body2" fontWeight={600}>
          {t("AUTH.BACK_SIGN_IN")}
        </MuiLink>
        <MuiLink component={Link} href="/auth/sign-up" variant="body2">
          {t("AUTH.CREATE_ACCOUNT")}
        </MuiLink>
      </Stack>

   {/*    <Typography variant="caption" color="text.secondary">
        Endpoint: POST /api/v1/auth/forgot-password
      </Typography> */}
    </Stack>
  );
}
