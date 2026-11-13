"use client";
import { AlertBanner } from "@/components/ui/alert-banner";

import * as React from "react";
import { useParams } from "next/navigation";
import { Alert, Stack, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { ApiFetchError } from "@/api/clients";
import { authApi } from "@/api/auth";
import { useTranslations } from "@/context/locale-context";

function normalizeApiError(err: unknown): string {
  if (err instanceof ApiFetchError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export default function VerifyEmailTokenPage() {
  const t = useTranslations();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const run = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await authApi.activate(token);
      setMessage(res.message);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void run();
  }, [run]);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{t("AUTH.VERIFY_EMAIL")}</Typography>

      {loading ? <AlertBanner dismissible={false} severity="info">{t("AUTH.VERIFYING")}</AlertBanner> : null}
      {error ? <AlertBanner dismissible={false} severity="error">{error}</AlertBanner> : null}
      {message ? <AlertBanner dismissible={false} severity="success">{message}</AlertBanner> : null}

      <Button variant="secondary" onClick={run} disabled={loading || !token}>
        {t("AUTH.VERIFY")}
      </Button>

      <Typography variant="caption" color="text.secondary">
        Endpoint: GET /api/v1/auth/activate/:token
      </Typography>
    </Stack>
  );
}
