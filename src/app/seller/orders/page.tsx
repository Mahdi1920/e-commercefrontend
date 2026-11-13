"use client";

import * as React from "react";
import { Alert, Box, Card, CardContent, Chip, Container, MenuItem, Pagination, Stack, TextField, Typography } from "@mui/material";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { Button } from "@shared/components/ui/button";
import { useToast } from "@shared/components/ui/toast";
import { useSocket } from "@shared/context/socket-context";
import { ordersApi, type SellerOrder } from "@shared/api/orders";
import { UserRole } from "@shared/enums";
import { formatCurrency } from "@shared/lib/date-utils";

const PAGE_SIZE = 10;
const STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "EXCHANGING", "RETURNING", "CANCELLED"];
const STATUS_COLORS: Record<string, "warning" | "info" | "secondary" | "success" | "error" | "default"> = {
  PENDING: "warning", CONFIRMED: "success", PREPARING: "info", OUT_FOR_DELIVERY: "secondary", DELIVERED: "success", EXCHANGING: "info", RETURNING: "warning", CANCELLED: "error",
};
const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ["CONFIRMED"],
  CONFIRMED: ["PREPARING"],
  PREPARING: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNING"],
  DELIVERED: ["RETURNING"],
  EXCHANGING: [],
  RETURNING: [],
  CANCELLED: [],
};
const NEXT_EXCHANGE_STATUSES: Record<string, string[]> = {
  REQUESTED: ["PREPARING", "REJECTED"],
  PREPARING: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["EXCHANGED", "RETURNING"],
  RETURNING: ["RETURNED"],
  REJECTED: [], EXCHANGED: [], RETURNED: [],
};

function normalizeStatus(status: string) {
  if (status === "SHIPPED") return "OUT_FOR_DELIVERY";
  if (status === "RETURNIG") return "RETURNING";
  return status;
}

function statusLabel(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "EXCHANGING") return "PRODUCT EXCHANGE IN PROGRESS";
  return normalized === "RETURNING" ? "RETURNING — customer refused delivery" : normalized.replace(/_/g, " ");
}

function exchangeStatusLabel(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: "Request awaiting review",
    REJECTED: "Request rejected",
    PREPARING: "Replacement preparing",
    OUT_FOR_DELIVERY: "Replacement out for delivery",
    EXCHANGED: "Replacement delivered",
    RETURNING: "Replacement returning",
    RETURNED: "Replacement returned",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export default function SellerOrdersPage() {
  const { notify } = useToast();
  const { onEvent } = useSocket();
  const [orders, setOrders] = React.useState<SellerOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = React.useState<Record<string, string>>({});
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState("");

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await ordersApi.listSellerOrders();
      setOrders(result);
      setStatusDrafts(Object.fromEntries(result.map((order) => [order._id, normalizeStatus(order.status)])));
    } catch (cause: any) {
      setError(cause?.message ?? "Could not load store orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void loadOrders(); }, [loadOrders]);
  React.useEffect(() => {
    const refresh = () => { void loadOrders(); };
    const unsubCreated = onEvent("order:created", refresh);
    const unsubDashboard = onEvent("dashboard:refresh:seller", refresh);
    const unsubStatus = onEvent("order:status_updated", refresh);
    return () => { unsubCreated(); unsubDashboard(); unsubStatus(); };
  }, [loadOrders, onEvent]);

  const filtered = React.useMemo(() => orders.filter((order) => {
    if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
    const needle = query.trim().toLowerCase();
    if (needle && !order._id.toLowerCase().includes(needle) && !order.items.some((item) => item.name.toLowerCase().includes(needle))) return false;
    const orderDay = new Date(order.createdAt).toISOString().slice(0, 10);
    if (from && orderDay < from) return false;
    if (to && orderDay > to) return false;
    return true;
  }), [from, orders, query, statusFilter, to]);

  React.useEffect(() => { setPage(1); }, [from, query, statusFilter, to]);

  async function saveStatus(order: SellerOrder) {
    const nextStatus = statusDrafts[order._id] ?? normalizeStatus(order.status);
    if (nextStatus === normalizeStatus(order.status)) return;
    setSavingId(order._id);
    try {
      await ordersApi.updateStatus(order._id, nextStatus);
      notify({ variant: "success", title: "Order updated", message: `Order #${order._id} is now ${nextStatus.replace(/_/g, " ")}.` });
      await loadOrders();
    } catch (cause: any) {
      notify({ variant: "danger", title: "Update failed", message: cause?.message ?? "Could not update this order." });
    } finally {
      setSavingId(null);
    }
  }

  async function saveExchangeStatus(order: SellerOrder, status: string) {
    setSavingId(order._id);
    try {
      await ordersApi.updateExchangeStatus(order._id, status);
      notify({ variant: "success", title: "Exchange updated", message: `Order #${order._id}: ${exchangeStatusLabel(status)}.` });
      await loadOrders();
    } catch (cause: any) {
      notify({ variant: "danger", title: "Exchange update failed", message: cause?.message ?? "Could not update this exchange." });
    } finally { setSavingId(null); }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <RequireAuth roles={[UserRole.SELLER]} unauthorizedRedirectTo="/auth/sign-in">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Store orders</Typography>
            <Typography color="text.secondary">Review orders containing your products and update their status.</Typography>
          </Box>
          <Alert severity="info">Updating an order changes the status shown to the customer. Choose Delivered when the customer receives it or Returning if they refuse delivery. Review and track product exchanges in the exchange request below.</Alert>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr 1fr 1fr" } }}>
            <TextField size="small" label="Search order or product" value={query} onChange={(event) => setQuery(event.target.value)} />
            <TextField select size="small" label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <MenuItem value="ALL">All statuses</MenuItem>
              {STATUSES.map((value) => <MenuItem key={value} value={value}>{statusLabel(value)}</MenuItem>)}
            </TextField>
            <TextField size="small" type="date" label="From" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="To" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {loading ? <Typography color="text.secondary">Loading orders…</Typography> : pageOrders.length === 0 ? <Alert severity="info">No store orders match these filters.</Alert> : (
            <Stack spacing={1.5}>
              {pageOrders.map((order) => (
                <Card key={order._id} variant="outlined">
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
                        <Box>
                          <Typography fontWeight={800}>Order #{order._id}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(order.createdAt).toLocaleString()}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Chip size="small" color={STATUS_COLORS[normalizeStatus(order.status)] ?? "default"} label={statusLabel(order.status)} />
                          <Typography fontWeight={800}>{formatCurrency(order.total)}</Typography>
                        </Stack>
                      </Stack>
                      <Typography variant="body2"><b>Customer delivery:</b> {order.deliveryAddress} · {order.phone}</Typography>
                      <Stack spacing={0.5}>
                        {order.items.map((item, index) => (
                          <Typography key={`${item.productId}-${index}`} variant="body2" color="text.secondary">
                            {item.name} × {item.quantity} · {formatCurrency(item.price * item.quantity)}
                          </Typography>
                        ))}
                      </Stack>
                      {order.exchangeRequest ? <Alert severity={order.exchangeRequest.status === "REJECTED" ? "warning" : "info"}>
                        <b>Customer exchange request:</b> {order.exchangeRequest.reason}<br />
                        <b>Exchange progress:</b> {exchangeStatusLabel(order.exchangeRequest.status ?? "REQUESTED")}<br />
                        {order.exchangeRequest.items.map((item) => `${item.originalName} → ${item.replacementName} × ${item.quantity}`).join("; ")}
                        {NEXT_EXCHANGE_STATUSES[order.exchangeRequest.status ?? "REQUESTED"]?.length ? <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          {NEXT_EXCHANGE_STATUSES[order.exchangeRequest.status ?? "REQUESTED"].map((nextStatus) => <Button key={nextStatus} size="small" variant={nextStatus === "REJECTED" ? "danger" : "outlined"} disabled={savingId === order._id} isLoading={savingId === order._id} onClick={() => void saveExchangeStatus(order, nextStatus)}>{exchangeStatusLabel(nextStatus)}</Button>)}
                        </Stack> : null}
                      </Alert> : null}
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                        <TextField select size="small" label="Update status" disabled={Boolean(order.exchangeRequest) || normalizeStatus(order.status) === "CANCELLED"} value={statusDrafts[order._id] ?? normalizeStatus(order.status)} onChange={(event) => setStatusDrafts((current) => ({ ...current, [order._id]: event.target.value }))} sx={{ minWidth: 220 }}>
                          {[normalizeStatus(order.status), ...(NEXT_STATUSES[normalizeStatus(order.status)] ?? [])].map((value) => <MenuItem key={value} value={value}>{statusLabel(value)}</MenuItem>)}
                        </TextField>
                        <Button size="small" variant="outlined" disabled={Boolean(order.exchangeRequest) || savingId === order._id || normalizeStatus(order.status) === "CANCELLED" || (statusDrafts[order._id] ?? normalizeStatus(order.status)) === normalizeStatus(order.status)} isLoading={savingId === order._id} onClick={() => void saveStatus(order)}>
                          Save status
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">{filtered.length} orders</Typography>
            <Pagination page={page} count={totalPages} onChange={(_event, next) => setPage(next)} color="primary" />
          </Stack>
        </Stack>
      </Container>
    </RequireAuth>
  );
}
