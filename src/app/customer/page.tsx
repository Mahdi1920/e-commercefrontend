"use client";

import * as React from "react";
import Link from "next/link";
import { Alert, Box, Card, CardContent, Chip, Container, Stack, Typography } from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { DateRangeFilter } from "@shared/components/ui/date-range-filter";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { StatCard } from "@shared/components/ui/stat-card";
import { Button } from "@shared/components/ui/button";
import { useConfirm } from "@shared/components/ui/confirm-provider";
import { useSession } from "@shared/context/session-context";
import { useToast } from "@shared/components/ui/toast";
import { useTranslations } from "@shared/context/locale-context";
import { UserRole } from "@shared/enums";
import { ordersApi, type Order } from "@shared/api/orders";
import { useSocket } from "@shared/context/socket-context";
import { formatCurrency, toBusinessDateStr } from "@shared/lib/date-utils";
import { toDateRangeFilterProps, useDateRangeFilter } from "@shared/hooks/useDateRangeFilter";
import { InteractiveStatisticsChart } from "@shared/components/dashboard/interactive-statistics-chart";

const statusColors: Record<string, "warning" | "info" | "secondary" | "success" | "error" | "default"> = {
  PENDING: "warning", CONFIRMED: "success", PREPARING: "info", OUT_FOR_DELIVERY: "secondary", DELIVERED: "success", EXCHANGING: "info", RETURNING: "warning", CANCELLED: "error",
};

function orderStatusLabel(status: string) {
  if (status === "EXCHANGING") return "Product exchange in progress";
  return status === "RETURNING" ? "Returning — customer refused delivery" : status.replace(/_/g, " ");
}

function customerOrderStatusLabel(order: Order) {
  if (!order.exchangeRequest) return orderStatusLabel(order.status);
  const labels: Record<string, string> = {
    REQUESTED: "Exchange awaiting review",
    REJECTED: "Exchange rejected",
    PREPARING: "Replacement preparing",
    OUT_FOR_DELIVERY: "Replacement out for delivery",
    EXCHANGED: "Replacement delivered",
    RETURNING: "Replacement returning",
    RETURNED: "Replacement returned",
  };
  return labels[order.exchangeRequest.status ?? "REQUESTED"] ?? "Exchange in progress";
}

export default function CustomerDashboardPage() {
  const t = useTranslations();
  const session = useSession();
  const { notify } = useToast();
  const confirm = useConfirm();
  const { onEvent } = useSocket();
  const periodFilter = useDateRangeFilter("today");
  const activeRange = periodFilter.activeRange;
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [kpiOrders, setKpiOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const strikes = (session.user as any)?.nbBanned ?? 0;
  const isBlocked = (session.user as any)?.isBlocked ?? false;

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      setOrders((await ordersApi.listMine()).slice(0, 10));
    } catch (error: any) {
      notify({ variant: "danger", title: "Orders load failed", message: error?.message ?? "Failed to load orders." });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const loadKpiOrders = React.useCallback(async (from: string, to: string) => {
    try {
      setKpiOrders(await ordersApi.listMine({ from, to }));
    } catch (error: any) {
      notify({ variant: "danger", title: "Order metrics load failed", message: error?.message ?? "Failed to load order metrics." });
    }
  }, [notify]);

  async function cancelOrder(order: Order) {
    const confirmed = await confirm({
      title: "Cancel this order?",
      message: `Order #${order._id} will be cancelled and its items returned to stock.`,
      confirmText: "Cancel order",
      cancelText: "Keep order",
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      await ordersApi.cancelMine(order._id);
      notify({ variant: "success", title: "Order cancelled", message: `Order #${order._id} has been cancelled.` });
      await Promise.all([loadOrders(), loadKpiOrders(activeRange.from, activeRange.to)]);
    } catch (error: any) {
      notify({ variant: "danger", title: "Cancellation failed", message: error?.message ?? "This order can no longer be cancelled." });
    }
  }

  React.useEffect(() => { void loadOrders(); }, [loadOrders]);
  React.useEffect(() => { void loadKpiOrders(activeRange.from, activeRange.to); }, [activeRange.from, activeRange.to, loadKpiOrders]);
  React.useEffect(() => {
    const refresh = () => {
      void loadOrders();
      void loadKpiOrders(activeRange.from, activeRange.to);
    };
    const unsubCreated = onEvent("order:created", refresh);
    const unsubDashboard = onEvent("dashboard:refresh:customer", refresh);
    const unsubStatus = onEvent("order:status_updated", refresh);
    return () => { unsubCreated(); unsubDashboard(); unsubStatus(); };
  }, [activeRange.from, activeRange.to, loadKpiOrders, loadOrders, onEvent]);

  const stats = React.useMemo(() => ({
    count: kpiOrders.length,
    spent: kpiOrders.filter((order) => order.status !== "CANCELLED").reduce((sum, order) => sum + order.total, 0),
    active: kpiOrders.filter((order) => ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "EXCHANGING"].includes(order.status) || ["REQUESTED", "PREPARING", "OUT_FOR_DELIVERY", "RETURNING"].includes(order.exchangeRequest?.status ?? "")).length,
    delivered: kpiOrders.filter((order) => order.status === "DELIVERED").length,
    cancelled: kpiOrders.filter((order) => ["CANCELLED", "RETURNING"].includes(order.status)).length,
  }), [kpiOrders]);

  const dailyOrderStats = React.useMemo(() => {
    const byDay = new Map<string, { date: string; orders: number; spending: number }>();
    for (const order of kpiOrders) {
      const date = toBusinessDateStr(new Date(order.createdAt));
      const day = byDay.get(date) ?? { date, orders: 0, spending: 0 };
      day.orders += 1;
      if (order.status !== "CANCELLED") day.spending += order.total;
      byDay.set(date, day);
    }
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [kpiOrders]);

  return (
    <RequireAuth roles={[UserRole.CUSTOMER]}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          {isBlocked ? <Alert severity="error">Your account has been blocked. Please contact support.</Alert> : null}
          {!isBlocked && strikes > 0 ? <Alert severity="warning">Account notice: {strikes} of 3 strike warnings.</Alert> : null}
          <Box>
            <Typography variant="h4" fontWeight={800}>{t("CUSTOMER_PAGE.TITLE")}</Typography>
            <Typography color="text.secondary">Welcome, {session.user?.fullname ?? "Valued Customer"}. Here are your latest orders.</Typography>
          </Box>

          <Box>
            <DateRangeFilter {...toDateRangeFilterProps(periodFilter)} />
          </Box>

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" } }}>
            <StatCard label="LAST 10 ORDERS" value={stats.count} icon={<ShoppingBagIcon />} borderColor="#3b82f6" />
            <StatCard label="SPENT ON LAST 10" value={formatCurrency(stats.spent)} icon={<AttachMoneyIcon />} borderColor="#10b981" isMonetary />
            <StatCard label="IN PROGRESS" value={stats.active} icon={<LocalShippingIcon />} borderColor="#8b5cf6" />
            <StatCard label="DELIVERED" value={stats.delivered} icon={<CheckCircleIcon />} borderColor="#22c55e" />
            <StatCard label="CANCELLED / RETURNED" value={stats.cancelled} icon={<CancelIcon />} borderColor="#ef4444" />
          </Box>

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
            <InteractiveStatisticsChart
              title="Your Orders Over Time"
              data={dailyOrderStats}
              series={[{ key: "orders", label: "Orders", color: "#2563eb", value: (point) => Number(point.orders ?? 0) }]}
            />
            <InteractiveStatisticsChart
              title="Your Spending Over Time"
              data={dailyOrderStats}
              series={[{ key: "spending", label: "Spending", color: "#16a34a", value: (point) => Number(point.spending ?? 0), format: (amount) => formatCurrency(amount) }]}
            />
          </Box>

          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight={800}>Order history</Typography>
                <Typography color="text.secondary" variant="body2">Your 10 most recent orders</Typography>
              </Box>
              <Button component={Link} href="/customer/orders" variant="outlined">View all orders</Button>
            </Box>
            {loading ? <Typography color="text.secondary">Loading orders…</Typography> : orders.length === 0 ? (
              <Alert severity="info">No orders yet.</Alert>
            ) : orders.map((order) => (
              <Card key={order._id} variant="outlined">
                <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography fontWeight={700}>Order #{order._id}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(order.createdAt).toLocaleString()}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography fontWeight={700}>{formatCurrency(order.total)}</Typography>
                    <Chip size="small" color={statusColors[order.status] ?? "default"} label={customerOrderStatusLabel(order)} />
                    <Button component={Link} href={`/customer/orders?order=${order._id}`} size="small" variant="outlined">Details</Button>
                    {["PENDING", "PREPARING"].includes(order.status) ? (
                      <Button size="small" variant="danger" onClick={() => void cancelOrder(order)}>Cancel</Button>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

        </Stack>
      </Container>
    </RequireAuth>
  );
}
