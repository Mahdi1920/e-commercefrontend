"use client";
import { DataTable, type Column } from "@shared/components/table/data-table";
import { AlertBanner } from "@shared/components/ui/alert-banner";
import { Card as SharedCard, CardContent as SharedCardContent } from "@shared/components/ui/card";
import { DateRangeFilter } from "@shared/components/ui/date-range-filter";
import { toDateRangeFilterProps, useDateRangeFilter } from "@shared/hooks/useDateRangeFilter";

import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
  LinearProgress,
} from "@mui/material";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { useSession } from "@shared/context/session-context";
import { useToast } from "@shared/components/ui/toast";
import { ordersApi, type SellerStatsResponse, type SellerStatsDaily } from "@shared/api/orders";
import { SellerStatus, UserRole } from "@shared/enums";
import { Button } from "@shared/components/ui/button";
import { useSocket } from "@shared/context/socket-context";
import { formatDisplayDate } from "@shared/lib/date-utils";
import { InteractiveStatisticsChart } from "@shared/components/dashboard/interactive-statistics-chart";




export default function SellerHomePage() {
  const session = useSession();
  const { notify } = useToast();
  const { onEvent } = useSocket();

  const sellerStatus = session.user?.sellerProfile?.status ?? SellerStatus.PENDING;
  const periodFilter = useDateRangeFilter("today");
  const activeRange = periodFilter.activeRange;

  const [statsLoading, setStatsLoading] = React.useState(false);
  const [statsData, setStatsData] = React.useState<SellerStatsResponse | null>(null);

  // Load stats
  const loadSellerStats = React.useCallback(async (from: string, to: string) => {
    setStatsLoading(true);
    try {
      const data = await ordersApi.getSellerStats({ from, to });
      setStatsData(data);
    } catch (e: any) {
      notify({
        variant: "danger",
        title: "Stats load failed",
        message: e?.response?.data?.message ?? e?.message ?? "Failed to load seller stats.",
      });
    } finally {
      setStatsLoading(false);
    }
  }, [notify]);

  React.useEffect(() => {
    if (sellerStatus === SellerStatus.APPROVED) {
      void loadSellerStats(activeRange.from, activeRange.to);
    }
  }, [sellerStatus, activeRange.from, activeRange.to, loadSellerStats]);


  // Real-time live seller dashboard listener
  React.useEffect(() => {
    const unsubSeller = onEvent("dashboard:refresh:seller", () => {
      if (sellerStatus === SellerStatus.APPROVED) {
        void loadSellerStats(activeRange.from, activeRange.to);
      }
    });

    const unsubOrder = onEvent("order:created", () => {
      if (sellerStatus === SellerStatus.APPROVED) {
        void loadSellerStats(activeRange.from, activeRange.to);
      }
    });

    const unsubStatus = onEvent("order:status_updated", () => {
      if (sellerStatus === SellerStatus.APPROVED) {
        void loadSellerStats(activeRange.from, activeRange.to);
      }
    });

    const unsubSellerStatus = onEvent("seller:status_updated", (data: { status?: string; reason?: string }) => {
      session.refresh();
      if (data?.status === "APPROVED") {
        notify({ variant: "success", title: "Store Approved! 🎉", message: "Congratulations! Your store has been approved by admin." });
      } else if (data?.status === "REJECTED") {
        notify({ variant: "danger", title: "Store Application Rejected", message: data?.reason ? `Reason: ${data.reason}` : "Your seller application was rejected." });
      }
    });

    return () => {
      unsubSeller();
      unsubOrder();
      unsubStatus();
      unsubSellerStatus();
    };
  }, [onEvent, sellerStatus, loadSellerStats, activeRange.from, activeRange.to, session, notify]);



  // --- STATS OVERVIEW TOTALS ---
  const statuses = statsData?.statuses ?? {
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    EXCHANGING: 0,
    RETURNING: 0,
  };

  const paymentMethods = statsData?.paymentMethods ?? {
    CASH_ON_DELIVERY: 0,
    BANK_CARD: 0,
  };

  const dailyStats = statsData?.daily ?? [];


    // Daily stats table columns
  const dailyColumns: Array<Column<SellerStatsDaily>> = [
    {
      id: "date",
      header: "Day / Date",
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {formatDisplayDate(row.date)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.date}
          </Typography>
        </Box>
      ),
    },
    {
      id: "total",
      header: "Total Commands",
      align: "center",
      render: (row) => (
        <Chip
          size="small"
          label={`${row.total} orders`}
          sx={{ fontWeight: 700, bgcolor: "action.hover" }}
        />
      ),
    },
    {
      id: "pending",
      header: "Pending",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.statuses.PENDING > 0 ? 800 : 400}
          color={row.statuses.PENDING > 0 ? "warning.main" : "text.secondary"}
        >
          {row.statuses.PENDING}
        </Typography>
      ),
    },
    {
      id: "confirmed",
      header: "Confirmed",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.statuses.CONFIRMED > 0 ? 800 : 400}
          color={row.statuses.CONFIRMED > 0 ? "success.main" : "text.secondary"}
        >
          {row.statuses.CONFIRMED}
        </Typography>
      ),
    },
    {
      id: "preparing",
      header: "Preparing",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.statuses.PREPARING > 0 ? 800 : 400}
          color={row.statuses.PREPARING > 0 ? "info.main" : "text.secondary"}
        >
          {row.statuses.PREPARING}
        </Typography>
      ),
    },
    {
      id: "out_for_delivery",
      header: "Out for Delivery",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.statuses.OUT_FOR_DELIVERY > 0 ? 800 : 400}
          color={row.statuses.OUT_FOR_DELIVERY > 0 ? "primary.main" : "text.secondary"}
        >
          {row.statuses.OUT_FOR_DELIVERY}
        </Typography>
      ),
    },
    {
      id: "delivered",
      header: "Delivered",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.statuses.DELIVERED > 0 ? 800 : 400}
          color={row.statuses.DELIVERED > 0 ? "success.main" : "text.secondary"}
        >
          {row.statuses.DELIVERED}
        </Typography>
      ),
    },
    {
      id: "returning",
      header: "Returning",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.statuses.RETURNING > 0 ? 800 : 400}
          color={row.statuses.RETURNING > 0 ? "error.main" : "text.secondary"}
        >
          {row.statuses.RETURNING}
        </Typography>
      ),
    },
    {
      id: "exchanging",
      header: "Exchanging",
      align: "center",
      render: (row) => (
        <Typography variant="body2" fontWeight={row.statuses.EXCHANGING > 0 ? 800 : 400} color={row.statuses.EXCHANGING > 0 ? "info.main" : "text.secondary"}>
          {row.statuses.EXCHANGING}
        </Typography>
      ),
    },
    {
      id: "cash_on_delivery",
      header: "COD",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.paymentMethods?.CASH_ON_DELIVERY > 0 ? 800 : 400}
          color={row.paymentMethods?.CASH_ON_DELIVERY > 0 ? "text.primary" : "text.secondary"}
        >
          {row.paymentMethods?.CASH_ON_DELIVERY ?? 0}
        </Typography>
      ),
    },
    {
      id: "bank_card",
      header: "Bank Card",
      align: "center",
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={row.paymentMethods?.BANK_CARD > 0 ? 800 : 400}
          color={row.paymentMethods?.BANK_CARD > 0 ? "text.primary" : "text.secondary"}
        >
          {row.paymentMethods?.BANK_CARD ?? 0}
        </Typography>
      ),
    },
  ];

  return (
    <RequireAuth roles={[UserRole.SELLER]}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* TOP TOOLBAR */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>Seller Dashboard</Typography>
              <Typography color="text.secondary">Store performance metrics per day and order statuses.</Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => { void loadSellerStats(activeRange.from, activeRange.to); }}
              disabled={statsLoading}
            >
              {statsLoading ? "Refreshing…" : "Refresh stats"}
            </Button>
          </Box>

          {sellerStatus !== SellerStatus.APPROVED ? (
            <AlertBanner dismissible={false} severity="warning">
              Your seller account is currently <b>{sellerStatus}</b>. Once approved, you'll be able to start receiving commands and managing your store inventory.
            </AlertBanner>
          ) : null}

          {/* DASHBOARD STATS SECTION */}
          <SharedCard variant="outlined">
            <SharedCardContent>
              <Stack spacing={2.5}>
                {/* FILTER CONTROLS BAR */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", lg: "row" },
                    alignItems: { xs: "flex-start", lg: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                    pb: 1,
                    borderBottom: (t: any) => `1px solid ${t.palette.divider}`,
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      Store Statistics
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Showing stats from <b>{activeRange.from}</b> to <b>{activeRange.to}</b>
                    </Typography>
                  </Box>

                </Box>

                <DateRangeFilter {...toDateRangeFilterProps(periodFilter)} />

                {statsLoading ? <LinearProgress /> : null}

                <InteractiveStatisticsChart
                  title="Orders by Day and Status"
                  data={dailyStats}
                  series={[
                    { key: "orders", label: "All orders", color: "#2563eb", value: (point) => Number(point.total ?? 0) },
                    { key: "delivered", label: "Delivered", color: "#16a34a", value: (point) => Number((point.statuses as SellerStatsDaily["statuses"] | undefined)?.DELIVERED ?? 0) },
                    { key: "pending", label: "Pending", color: "#f59e0b", value: (point) => Number((point.statuses as SellerStatsDaily["statuses"] | undefined)?.PENDING ?? 0) },
                    { key: "returning", label: "Returning", color: "#ef4444", value: (point) => Number((point.statuses as SellerStatsDaily["statuses"] | undefined)?.RETURNING ?? 0) },
                  ]}
                />

                {/* 8 REQUIRED STORE STATS CARDS */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(4, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  {/* 1. Commands PENDING */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: "4px solid #f59e0b",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Commands Pending
                        </Typography>
                        <Chip size="small" label="PENDING" color="warning" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#d97706" }}>
                        {statuses.PENDING}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Awaiting seller confirmation
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderLeft: "4px solid #16a34a", borderRadius: 2, bgcolor: "background.paper" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>Commands Confirmed</Typography>
                        <Chip size="small" label="CONFIRMED" color="success" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#16a34a" }}>{statuses.CONFIRMED}</Typography>
                      <Typography variant="caption" color="text.secondary">Accepted and waiting for preparation</Typography>
                    </CardContent>
                  </Card>

                  {/* 2. Commands PREPARING */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: "4px solid #0284c7",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Commands Preparing
                        </Typography>
                        <Chip size="small" label="PREPARING" color="info" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#0284c7" }}>
                        {statuses.PREPARING}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Orders being packed
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* 3. Commands OUT_FOR_DELIVERY */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: "4px solid #6366f1",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Out For Delivery
                        </Typography>
                        <Chip size="small" label="IN TRANSIT" color="primary" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#6366f1" }}>
                        {statuses.OUT_FOR_DELIVERY}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Shipped to customers
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* 4. Commands DELIVERED */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: "4px solid #10b981",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Commands Delivered
                        </Typography>
                        <Chip size="small" label="DELIVERED" color="success" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#10b981" }}>
                        {statuses.DELIVERED}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completed successfully
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderLeft: "4px solid #0284c7", borderRadius: 2, bgcolor: "background.paper" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>Product Exchanges</Typography>
                        <Chip size="small" label="EXCHANGING" color="info" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#0284c7" }}>{statuses.EXCHANGING}</Typography>
                      <Typography variant="caption" color="text.secondary">Product exchange in progress</Typography>
                    </CardContent>
                  </Card>

                  {/* 5. Commands RETURNING */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: "4px solid #ef4444",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Commands Returning
                        </Typography>
                        <Chip size="small" label="RETURNING" color="error" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#ef4444" }}>
                        {statuses.RETURNING}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Returned by customers
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* 6. Commands paid CASH_ON_DELIVERY */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: "4px solid #0d9488",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Cash on Delivery
                        </Typography>
                        <Chip size="small" label="COD" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#ccfbf1", color: "#0f766e" }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#0d9488" }}>
                        {paymentMethods.CASH_ON_DELIVERY}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Orders paid at delivery
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* 7. Commands paid BANK_CARD */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: "4px solid #8b5cf6",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                          Bank Card
                        </Typography>
                        <Chip size="small" label="CARD" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#ede9fe", color: "#6d28d9" }} />
                      </Stack>
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#8b5cf6" }}>
                        {paymentMethods.BANK_CARD}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Prepaid via bank card
                      </Typography>
                    </CardContent>
                  </Card>

                </Box>

                {/* DAILY BREAKDOWN SECTION */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                    Store Stats Per Day ({dailyStats.length} active day{dailyStats.length === 1 ? "" : "s"})
                  </Typography>

                  <DataTable
                    columns={dailyColumns}
                    rows={dailyStats}
                    rowKey={(r) => r.date}
                    emptyState={
                      statsLoading
                        ? "Loading store statistics…"
                        : "No commands recorded for this date range. Try selecting another filter or week/month."
                    }
                  />
                </Box>
              </Stack>
            </SharedCardContent>
          </SharedCard>

        </Stack>
      </Container>
    </RequireAuth>
  );
}
