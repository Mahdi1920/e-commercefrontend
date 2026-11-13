"use client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FormField } from "@/components/ui/form-field";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, Divider, Link as MuiLink, Stack, TextField, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { ApiFetchError } from "@/api/clients";
import { authApi } from "@/api/auth";
import { useTranslations } from "@/context/locale-context";

function normalizeApiError(err: unknown): string {
  if (err instanceof ApiFetchError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export default function ResetPasswordTokenPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";

  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const canSubmit = newPassword.trim().length >= 6;

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await authApi.resetPassword(token, newPassword);
      setMessage(res.message);
      setTimeout(() => router.push("/auth/sign-in"), 800);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{t("AUTH.RESET_TITLE")}</Typography>

      {error ? <AlertBanner dismissible={false} severity="error">{error}</AlertBanner> : null}
      {message ? <AlertBanner dismissible={false} severity="success">{message}</AlertBanner> : null}

      <FormField
        label={t("AUTH.NEW_PASSWORD")}
        value={newPassword}
        onChange={(e: any) => setNewPassword(e.target.value)}
        type="password"
        fullWidth
      />

      <Button onClick={onSubmit} disabled={!token || !canSubmit} isLoading={loading}>
        {t("AUTH.RESET")}
      </Button>

      <Divider />

      <MuiLink component={Link} href="/auth/sign-in" variant="body2" fontWeight={600}>
        {t("AUTH.BACK_SIGN_IN")}
      </MuiLink>

     {/*  <Typography variant="caption" color="text.secondary">
        Endpoint: POST /api/v1/auth/reset-password/:token
      </Typography> */}
    </Stack>
  );
}
