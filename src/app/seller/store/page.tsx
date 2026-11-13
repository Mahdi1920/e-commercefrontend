"use client";

import * as React from "react";
import {
  Box,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Card as SharedCard, CardContent as SharedCardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useSession } from "@/context/session-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { clientsApi } from "@/api/users";
import { cloudinaryApi } from "@/api/cloudinary";
import { SellerStatus, UserRole } from "@/enums";

export default function SellerStorePage() {
  const session = useSession();
  const { notify } = useToast();

  const sellerStatus = session.user?.sellerProfile?.status ?? SellerStatus.PENDING;
  const accessToken = session.accessToken;
  const seller = session.user?.sellerProfile ?? null;

  // ── Store Modal State ────────────────────────────────────────────────────────
  const [openStoreModal, setOpenStoreModal] = React.useState(false);
  const [storeSaving, setStoreSaving] = React.useState(false);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [bannerUploading, setBannerUploading] = React.useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState<string>("");
  const [bannerPreviewUrl, setBannerPreviewUrl] = React.useState<string>("");
  const [storeDraft, setStoreDraft] = React.useState(() => ({
    shopName: seller?.shopName ?? "",
    description: seller?.description ?? "",
    logo: seller?.logo ?? "",
    banner: seller?.banner ?? "",
    businessEmail: seller?.businessEmail ?? "",
    businessPhone: seller?.businessPhone ?? "",
    businessAddress: seller?.businessAddress ?? "",
  }));

  React.useEffect(() => {
    setStoreDraft({
      shopName: seller?.shopName ?? "",
      description: seller?.description ?? "",
      logo: seller?.logo ?? "",
      banner: seller?.banner ?? "",
      businessEmail: seller?.businessEmail ?? "",
      businessPhone: seller?.businessPhone ?? "",
      businessAddress: seller?.businessAddress ?? "",
    });
  }, [session.user?._id, (session.user as any)?.id, seller]);

  React.useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    };
  }, [logoPreviewUrl, bannerPreviewUrl]);

  async function onPickLogo(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify({ variant: "danger", title: "Invalid file", message: "Logo must be an image." });
      return;
    }
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const uploaded = await cloudinaryApi.uploadStoreLogo(file);
      setStoreDraft((d) => ({ ...d, logo: uploaded.url }));
      notify({ variant: "success", title: "Uploaded", message: "Logo uploaded." });
    } catch (e: any) {
      notify({ variant: "danger", title: "Upload failed", message: e?.message ?? "Failed to upload logo." });
    } finally {
      setLogoUploading(false);
    }
  }

  async function onPickBanner(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify({ variant: "danger", title: "Invalid file", message: "Banner must be an image." });
      return;
    }
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    setBannerPreviewUrl(URL.createObjectURL(file));
    setBannerUploading(true);
    try {
      const uploaded = await cloudinaryApi.uploadStoreBanner(file);
      setStoreDraft((d) => ({ ...d, banner: uploaded.url }));
      notify({ variant: "success", title: "Uploaded", message: "Banner uploaded." });
    } catch (e: any) {
      notify({ variant: "danger", title: "Upload failed", message: e?.message ?? "Failed to upload banner." });
    } finally {
      setBannerUploading(false);
    }
  }

  async function saveStore() {
    setStoreSaving(true);
    try {
      const updated = await clientsApi.updateMyStore({
        shopName: storeDraft.shopName || undefined,
        description: storeDraft.description || undefined,
        logo: storeDraft.logo || undefined,
        banner: storeDraft.banner || undefined,
        businessEmail: storeDraft.businessEmail || undefined,
        businessPhone: storeDraft.businessPhone || undefined,
        businessAddress: storeDraft.businessAddress || undefined,
      });
      if (accessToken) session.login(accessToken, updated);
      notify({ variant: "success", title: "Saved", message: "Store information updated." });
      setOpenStoreModal(false);
    } catch (e: any) {
      notify({ variant: "danger", title: "Save failed", message: e?.message ?? "Failed to update store." });
    } finally {
      setStoreSaving(false);
    }
  }

  return (
    <RequireAuth roles={[UserRole.SELLER]}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>
                My Store
              </Typography>
              <Typography color="text.secondary">
                Manage your store branding, KYC documents, and payment information.
              </Typography>
            </Box>
            <Button id="seller-store-management" onClick={() => setOpenStoreModal(true)}>
              Manage store
            </Button>
          </Box>

          {/* ── Store Status Banner ──────────────────────────────────────────── */}
          {sellerStatus !== SellerStatus.APPROVED && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: sellerStatus === SellerStatus.PENDING ? "warning.light" : "error.light",
                color: sellerStatus === SellerStatus.PENDING ? "warning.contrastText" : "error.contrastText",
              }}
            >
              <Typography fontWeight={700}>
                Account Status: <b>{sellerStatus}</b> — Once approved you can manage inventory and receive orders.
              </Typography>
            </Box>
          )}

          {/* ── Store Banner Preview ──────────────────────────────────────────── */}
          {seller?.banner && (
            <Box
              component="img"
              src={seller.banner}
              alt="Store Banner"
              sx={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 2, border: "1px solid", borderColor: "divider" }}
            />
          )}

          {/* ── Store Info Cards ─────────────────────────────────────────────── */}
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            <SharedCard variant="outlined">
              <SharedCardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  {seller?.logo && (
                    <Box
                      component="img"
                      src={seller.logo}
                      alt="Logo"
                      sx={{ width: 56, height: 56, borderRadius: 1, objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <Box>
                    <Typography variant="overline" color="text.secondary">Shop</Typography>
                    <Typography variant="h6" fontWeight={800}>{seller?.shopName ?? "—"}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {seller?.description ?? "Add a description to improve trust."}
                    </Typography>
                  </Box>
                </Stack>
              </SharedCardContent>
            </SharedCard>

            <SharedCard variant="outlined">
              <SharedCardContent>
                <Typography variant="overline" color="text.secondary">KYC Documents</Typography>
                <Typography variant="h6" fontWeight={800}>
                  {seller?.identityDocument?.fileUrl ? "✅ Uploaded" : "⚠️ Missing"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Keep your docs up-to-date for approval.
                </Typography>
              </SharedCardContent>
            </SharedCard>

            <SharedCard variant="outlined">
              <SharedCardContent>
                <Typography variant="overline" color="text.secondary">Payments</Typography>
                <Typography variant="h6" fontWeight={800}>
                  {seller?.bankInfo?.paymentMethod ?? "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Add payment information to receive payouts.
                </Typography>
              </SharedCardContent>
            </SharedCard>
          </Box>

          {/* ── Business Contact ─────────────────────────────────────────────── */}
          <SharedCard variant="outlined">
            <SharedCardContent>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Business Contact</Typography>
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Business Email</Typography>
                  <Typography fontWeight={700}>{seller?.businessEmail || "—"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Business Phone</Typography>
                  <Typography fontWeight={700}>{seller?.businessPhone || "—"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Business Address</Typography>
                  <Typography fontWeight={700}>{seller?.businessAddress || "—"}</Typography>
                </Box>
              </Box>
            </SharedCardContent>
          </SharedCard>
        </Stack>

        {/* ── Manage Store Modal ────────────────────────────────────────────── */}
        <Modal
          open={openStoreModal}
          onClose={() => setOpenStoreModal(false)}
          title="Manage Store"
          description="Update your store branding and business details"
          size="lg"
          footer={
            <>
              <Button variant="outlined" onClick={() => setOpenStoreModal(false)} disabled={storeSaving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={saveStore}
                disabled={storeSaving || logoUploading || bannerUploading}
              >
                {storeSaving ? "Saving…" : "Save"}
              </Button>
            </>
          }
        >
          <Stack spacing={2}>
            <FormField
              label="Shop name"
              value={storeDraft.shopName}
              onChange={(e: any) => setStoreDraft((d) => ({ ...d, shopName: e.target.value }))}
              fullWidth
            />
            <FormField
              label="Description"
              value={storeDraft.description}
              onChange={(e: any) => setStoreDraft((d) => ({ ...d, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />

            <Divider />

            <Typography variant="subtitle2" fontWeight={800}>Store Branding</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Logo</Typography>
                  <Box
                    sx={{
                      width: 72, height: 72, borderRadius: 2, overflow: "hidden",
                      border: (t: any) => `1px solid ${t.palette.divider}`,
                      backgroundColor: (t: any) => t.palette.action.hover,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {logoPreviewUrl || storeDraft.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreviewUrl || storeDraft.logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </Box>
                </Box>
                <Button variant="outlined" component="label" disabled={logoUploading}>
                  {logoUploading ? "Uploading…" : "Upload logo"}
                  <input hidden type="file" accept="image/*" onChange={(e: any) => onPickLogo(e.target.files?.[0] ?? null)} />
                </Button>
              </Box>
              <FormField
                label="Logo URL"
                value={storeDraft.logo}
                onChange={(e: any) => setStoreDraft((d) => ({ ...d, logo: e.target.value }))}
                placeholder="https://..."
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Banner</Typography>
                  <Box
                    sx={{
                      width: 140, height: 72, borderRadius: 2, overflow: "hidden",
                      border: (t: any) => `1px solid ${t.palette.divider}`,
                      backgroundColor: (t: any) => t.palette.action.hover,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {bannerPreviewUrl || storeDraft.banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bannerPreviewUrl || storeDraft.banner} alt="Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </Box>
                </Box>
                <Button variant="outlined" component="label" disabled={bannerUploading}>
                  {bannerUploading ? "Uploading…" : "Upload banner"}
                  <input hidden type="file" accept="image/*" onChange={(e: any) => onPickBanner(e.target.files?.[0] ?? null)} />
                </Button>
              </Box>
              <FormField
                label="Banner URL"
                value={storeDraft.banner}
                onChange={(e: any) => setStoreDraft((d) => ({ ...d, banner: e.target.value }))}
                placeholder="https://..."
                fullWidth
              />
            </Stack>

            <Divider />

            <Typography variant="subtitle2" fontWeight={800}>Business Contact</Typography>
            <FormField
              label="Business email"
              value={storeDraft.businessEmail}
              onChange={(e: any) => setStoreDraft((d) => ({ ...d, businessEmail: e.target.value }))}
              fullWidth
            />
            <FormField
              label="Business phone"
              value={storeDraft.businessPhone}
              onChange={(e: any) => setStoreDraft((d) => ({ ...d, businessPhone: e.target.value }))}
              fullWidth
            />
            <FormField
              label="Business address"
              value={storeDraft.businessAddress}
              onChange={(e: any) => setStoreDraft((d) => ({ ...d, businessAddress: e.target.value }))}
              fullWidth
            />
          </Stack>
        </Modal>
      </Container>
    </RequireAuth>
  );
}

