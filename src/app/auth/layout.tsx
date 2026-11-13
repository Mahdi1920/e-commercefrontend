import * as React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { TypedText } from "@/components/ui/typed-text";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
        background:
          "radial-gradient(1200px 600px at 10% 10%, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0) 60%), radial-gradient(900px 500px at 90% 80%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0) 55%), linear-gradient(180deg, #0B1020 0%, #090A0F 100%)",
      }}
    >
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          p: 6,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.12,
            backgroundImage:
              "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <Stack spacing={3} sx={{ position: "relative", maxWidth: 520, textAlign: "center" }} alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
            <ShoppingBagOutlinedIcon fontSize="large" />
            <Typography variant="h4" component="h1">
              Next Shop Platform
            </Typography>
          </Stack>

          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }} textAlign="center">
            <TypedText
              strings={[
                "Admin dashboard",
                "Customer shopping",
                "Seller storefront",
                "Orders & delivery",
              ]}
            />
          </Typography>

          {/* <Stack spacing={1.5} sx={{ opacity: 0.9 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <LocalShippingOutlinedIcon />
              <Typography>Track orders and shipping status</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CreditCardOutlinedIcon />
              <Typography>Secure checkout and payments workflow</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ShoppingBagOutlinedIcon />
              <Typography>Catalog management with sellers and reviews</Typography>
            </Stack>
          </Stack> */}

         
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 4, md: 6 },
        }}
      >
        <Paper
          elevation={10}
          sx={{
            width: "100%",
            maxWidth: 460,
            borderRadius: 3,
            p: { xs: 3, sm: 4 },
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack spacing={3} alignItems="center">
            <Typography variant="h5" component="h2" fontWeight={700} textAlign="center">
              Welcome back
            </Typography>
            <Box sx={{ width: "100%" }}>{children}</Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
