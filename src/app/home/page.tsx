"use client";

import * as React from "react";
import { Box, CircularProgress } from "@mui/material";
import { useSession } from "@/context/session-context";
import { UserRole } from "@/enums";
import { HomeLanding } from "@/components/home/home-landing";
import CustomerDashboardPage from "@/app/customer/page";
import SellerHomePage from "@/app/seller/page";

export default function HomePage() {
  const session = useSession();

  if (!session.isReady) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (session.role === UserRole.CUSTOMER) {
    return <CustomerDashboardPage />;
  }

  if (session.role === UserRole.SELLER) {
    return <SellerHomePage />;
  }

  return <HomeLanding />;
}
