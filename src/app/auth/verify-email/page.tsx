"use client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FormField } from "@/components/ui/form-field";

import * as React from "react";
import { Alert, Stack, TextField, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/context/locale-context";

export default function VerifyEmailPage() {
  const t = useTranslations();
  const [token, setToken] = React.useState("");

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{t("AUTH.VERIFY_EMAIL")}</Typography>

      <AlertBanner dismissible={false} severity="info">
        {t("AUTH.VERIFY_LINK_HELP")}
      </AlertBanner>

      <FormField
        label={t("AUTH.ACTIVATION_TOKEN")}
        value={token}
        onChange={(e: any) => setToken(e.target.value)}
        placeholder={t("AUTH.PASTE_TOKEN")}
        fullWidth
      />

      <Button
        onClick={() => {
          const t = token.trim();
          if (!t) return;
          window.location.href = `/auth/verify-email/${encodeURIComponent(t)}`;
        }}
        disabled={!token.trim()}
      >
        {t("AUTH.VERIFY")}
      </Button>

      <Typography variant="caption" color="text.secondary">
        This will call GET /api/v1/auth/activate/:token.
      </Typography>
    </Stack>
  );
}
