"use client";

import * as React from "react";
import { Alert, Box, Checkbox, Chip, Container, FormControlLabel, MenuItem, Pagination, Stack, TextField, Typography } from "@mui/material";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { Button } from "@shared/components/ui/button";
import { useConfirm } from "@shared/components/ui/confirm-provider";
import { Modal } from "@shared/components/ui/modal";
import { useToast } from "@shared/components/ui/toast";
import { useSocket } from "@shared/context/socket-context";
import { ordersApi, type Order } from "@shared/api/orders";
import { categoriesApi, getCategoryLeafIds, getCategoryPath, type Category } from "@shared/api/categories";
import { productsApi, type Product } from "@shared/api/products";
import { UserRole } from "@shared/enums";
import { formatCurrency } from "@shared/lib/date-utils";

const PAGE_SIZE = 10;
const STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "EXCHANGING", "RETURNING", "CANCELLED"];
const colors: Record<string, "warning" | "info" | "secondary" | "success" | "error" | "default"> = {
  PENDING: "warning", CONFIRMED: "success", PREPARING: "info", OUT_FOR_DELIVERY: "secondary", DELIVERED: "success", EXCHANGING: "info", RETURNING: "warning", CANCELLED: "error",
};

function orderStatusLabel(status: string) {
  if (status === "EXCHANGING") return "Product exchange in progress";
  return status === "RETURNING" ? "Returning — customer refused delivery" : status.replace(/_/g, " ");
}

function exchangeStatusLabel(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: "Exchange request awaiting seller review",
    REJECTED: "Exchange request rejected",
    PREPARING: "Replacement preparing",
    OUT_FOR_DELIVERY: "Replacement out for delivery",
    EXCHANGED: "Replacement delivered",
    RETURNING: "Replacement returning",
    RETURNED: "Replacement returned",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export default function CustomerOrdersPage() {
  const { notify } = useToast();
  const confirm = useConfirm();
  const { onEvent } = useSocket();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Order | null>(null);
  const [exchangeOrder, setExchangeOrder] = React.useState<Order | null>(null);
  const [exchangeCategories, setExchangeCategories] = React.useState<Category[]>([]);
  const [exchangeCategory, setExchangeCategory] = React.useState<Record<string, string>>({});
  const [exchangeProducts, setExchangeProducts] = React.useState<Record<string, Product[]>>({});
  const [exchangeSelection, setExchangeSelection] = React.useState<Record<string, string>>({});
  const [exchangeReason, setExchangeReason] = React.useState("");
  const [exchangeLoading, setExchangeLoading] = React.useState(false);
  const [exchangeSaving, setExchangeSaving] = React.useState(false);
  const exchangeLeafCategoryIds = React.useMemo(() => getCategoryLeafIds(exchangeCategories), [exchangeCategories]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setOrders(await ordersApi.listMine()); }
    catch (error: any) { notify({ variant: "danger", title: "Orders load failed", message: error?.message ?? "Failed to load orders." }); }
    finally { setLoading(false); }
  }, [notify]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => {
    const refresh = () => { void load(); };
    const unsubCreated = onEvent("order:created", refresh);
    const unsubDashboard = onEvent("dashboard:refresh:customer", refresh);
    const unsubStatus = onEvent("order:status_updated", refresh);
    return () => { unsubCreated(); unsubDashboard(); unsubStatus(); };
  }, [load, onEvent]);

  const filtered = React.useMemo(() => orders.filter((order) => {
    if (status !== "ALL" && order.status !== status) return false;
    const needle = query.trim().toLowerCase();
    if (needle && !order._id.toLowerCase().includes(needle) && !order.items.some((item) => item.name.toLowerCase().includes(needle))) return false;
    const day = new Date(order.createdAt).toISOString().slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }), [orders, query, status, from, to]);

  React.useEffect(() => { setPage(1); }, [query, status, from, to]);
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    if (id) {
      const order = orders.find((entry) => entry._id === id);
      if (order) setSelected(order);
    }
  }, [orders]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedExchangeSeller = exchangeOrder?.items.find((item) => Object.prototype.hasOwnProperty.call(exchangeSelection, item.productId))?.sellerId;

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
      const cancelled = await ordersApi.cancelMine(order._id);
      setSelected((current) => current?._id === cancelled._id ? cancelled : current);
      notify({ variant: "success", title: "Order cancelled", message: `Order #${order._id} has been cancelled.` });
      await load();
    } catch (error: any) {
      notify({ variant: "danger", title: "Cancellation failed", message: error?.message ?? "This order can no longer be cancelled." });
    }
  }

  const canRequestExchange = (order: Order) => {
    const deliveredAt = order.deliveredAt ?? order.updatedAt ?? order.createdAt;
    return order.status === "DELIVERED" && !order.exchangeRequest && Date.now() <= new Date(deliveredAt).getTime() + 3 * 24 * 60 * 60 * 1000;
  };

  async function openExchange(order: Order) {
    setSelected(null);
    setExchangeOrder(order);
    setExchangeReason("");
    setExchangeCategory({});
    setExchangeProducts({});
    setExchangeSelection({});
    try { setExchangeCategories(await categoriesApi.list()); }
    catch { notify({ variant: "danger", title: "Categories unavailable", message: "Could not load product categories." }); }
  }

  async function loadExchangeProducts(originalId: string, categoryId: string, sellerId?: string) {
    setExchangeLoading(true);
    try {
      const result = await productsApi.listCatalog({ categoryId, sellerId, inStock: true, isActive: true, limit: 100 });
      setExchangeProducts((current) => ({ ...current, [originalId]: result.items.filter((product) => product._id !== originalId) }));
    } catch (error: any) {
      notify({ variant: "danger", title: "Products unavailable", message: error?.message ?? "Could not load replacement products." });
    } finally { setExchangeLoading(false); }
  }

  async function submitExchange() {
    if (!exchangeOrder) return;
    const items = exchangeOrder.items.filter((item) => exchangeSelection[item.productId]).map((item) => ({
      originalProductId: item.productId,
      replacementProductId: exchangeSelection[item.productId],
      quantity: item.quantity,
    }));
    if (!exchangeReason.trim() || !items.length) {
      notify({ variant: "danger", title: "Complete the request", message: "Choose at least one product and enter a reason." });
      return;
    }
    setExchangeSaving(true);
    try {
      await ordersApi.requestExchange(exchangeOrder._id, { reason: exchangeReason.trim(), items });
      notify({ variant: "success", title: "Exchange requested", message: "Your exchange request was sent to the seller." });
      setExchangeOrder(null);
      await load();
    } catch (error: any) {
      notify({ variant: "danger", title: "Exchange request failed", message: error?.message ?? "Could not submit the exchange request." });
    } finally { setExchangeSaving(false); }
  }

  return (
    <RequireAuth roles={[UserRole.CUSTOMER]}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Order history</Typography>
            <Typography color="text.secondary">Search and filter all your orders.</Typography>
          </Box>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr 1fr 1fr" } }}>
            <TextField size="small" label="Search order or product" value={query} onChange={(event) => setQuery(event.target.value)} />
            <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <MenuItem value="ALL">All statuses</MenuItem>
              {STATUSES.map((value) => <MenuItem key={value} value={value}>{orderStatusLabel(value)}</MenuItem>)}
            </TextField>
            <TextField size="small" type="date" label="From" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="To" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>
          {loading ? <Typography color="text.secondary">Loading orders…</Typography> : pageOrders.length === 0 ? <Alert severity="info">No orders match these filters.</Alert> : (
            <Stack spacing={1}>
              {pageOrders.map((order) => (
                <Box key={order._id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "2fr 1fr 1fr auto" }, alignItems: "center", gap: 1.5, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Box><Typography fontWeight={700}>Order #{order._id}</Typography><Typography variant="caption" color="text.secondary">{new Date(order.createdAt).toLocaleString()}</Typography></Box>
                  <Typography fontWeight={700}>{formatCurrency(order.total)}</Typography>
                  <Chip size="small" color={colors[order.status] ?? "default"} label={order.exchangeRequest ? exchangeStatusLabel(order.exchangeRequest.status ?? "REQUESTED") : orderStatusLabel(order.status)} />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => setSelected(order)}>Details</Button>
                    {canRequestExchange(order) ? <Button size="small" variant="outlined" onClick={() => void openExchange(order)}>Request exchange</Button> : null}
                    {["PENDING", "CONFIRMED", "PREPARING"].includes(order.status) ? (
                      <Button size="small" variant="danger" onClick={() => void cancelOrder(order)}>Cancel order</Button>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">{filtered.length} orders</Typography>
            <Pagination page={page} count={totalPages} onChange={(_event, next) => setPage(next)} color="primary" />
          </Stack>
        </Stack>

        <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={`Order details #${selected?._id ?? ""}`} description={selected ? `${new Date(selected.createdAt).toLocaleString()} · ${selected.exchangeRequest ? exchangeStatusLabel(selected.exchangeRequest.status ?? "REQUESTED") : orderStatusLabel(selected.status)}` : ""} footer={<Stack direction="row" spacing={1}>
          {selected && ["PENDING", "CONFIRMED", "PREPARING"].includes(selected.status) ? <Button variant="danger" onClick={() => void cancelOrder(selected)}>Cancel order</Button> : null}
          {selected && canRequestExchange(selected) ? <Button variant="outlined" onClick={() => void openExchange(selected)}>Request exchange</Button> : null}
          <Button variant="outlined" onClick={() => setSelected(null)}>Close</Button>
        </Stack>}>
          {selected ? <Stack spacing={2}>
            <Typography><b>Delivery address:</b> {selected.deliveryAddress}</Typography>
            <Typography><b>Phone:</b> {selected.phone}</Typography>
            <Typography><b>Payment:</b> {selected.paymentMethod.replace(/_/g, " ")}</Typography>
            <Typography variant="subtitle2" fontWeight={700}>Items</Typography>
            {selected.items.map((item, index) => <Box key={`${item.productId}-${index}`} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}><Typography>{item.name} × {item.quantity}</Typography><Typography>{formatCurrency(item.price * item.quantity)}</Typography></Box>)}
            {selected.exchangeRequest ? <Alert severity={selected.exchangeRequest.status === "REJECTED" ? "warning" : "info"}>
              <b>Exchange progress:</b> {exchangeStatusLabel(selected.exchangeRequest.status ?? "REQUESTED")}<br />
              <b>Reason:</b> {selected.exchangeRequest.reason}<br />
              {selected.exchangeRequest.items.map((item) => `${item.originalName} → ${item.replacementName} × ${item.quantity}`).join("; ")}
              {selected.exchangeRequest.history?.length ? <Stack spacing={0.25} sx={{ mt: 1 }}>{selected.exchangeRequest.history.map((entry, index) => <Typography key={`${entry.status}-${index}`} variant="caption">{exchangeStatusLabel(entry.status)} · {new Date(entry.changedAt).toLocaleString()}</Typography>)}</Stack> : null}
            </Alert> : null}
            <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid", borderColor: "divider", pt: 1 }}><Typography fontWeight={800}>Total</Typography><Typography fontWeight={800}>{formatCurrency(selected.total)}</Typography></Box>
          </Stack> : null}
        </Modal>
        <Modal open={Boolean(exchangeOrder)} onClose={() => setExchangeOrder(null)} title="Request a product exchange" description="Choose replacement products and tell us why you want to exchange these items." footer={<Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => setExchangeOrder(null)}>Cancel</Button><Button onClick={() => void submitExchange()} isLoading={exchangeSaving}>Submit request</Button></Stack>}>
          {exchangeOrder ? <Stack spacing={2}>
            <TextField multiline minRows={2} label="Reason for exchange" value={exchangeReason} onChange={(event) => setExchangeReason(event.target.value)} required inputProps={{ maxLength: 1000 }} />
            {exchangeOrder.items.map((item) => <Box key={item.productId} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <FormControlLabel control={<Checkbox disabled={Boolean(selectedExchangeSeller && item.sellerId && selectedExchangeSeller !== item.sellerId && !Object.prototype.hasOwnProperty.call(exchangeSelection, item.productId))} checked={Object.prototype.hasOwnProperty.call(exchangeSelection, item.productId)} onChange={(event) => setExchangeSelection((current) => { const next = { ...current }; if (event.target.checked) next[item.productId] = ""; else delete next[item.productId]; return next; })} />} label={`${item.name} × ${item.quantity}`} />
              {Object.prototype.hasOwnProperty.call(exchangeSelection, item.productId) ? <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField select size="small" label="Replacement category" value={exchangeCategory[item.productId] ?? ""} onChange={(event) => { const categoryId = event.target.value; setExchangeCategory((current) => ({ ...current, [item.productId]: categoryId })); setExchangeProducts((current) => ({ ...current, [item.productId]: [] })); setExchangeSelection((current) => ({ ...current, [item.productId]: "" })); void loadExchangeProducts(item.productId, categoryId, item.sellerId); }}>
                  {exchangeCategories.filter((category) => exchangeLeafCategoryIds.has(category._id)).map((category) => <MenuItem key={category._id} value={category._id}>{getCategoryPath(category._id, exchangeCategories)}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Replacement product" disabled={!exchangeCategory[item.productId] || exchangeLoading} value={exchangeSelection[item.productId]} onChange={(event) => setExchangeSelection((current) => ({ ...current, [item.productId]: event.target.value }))}>
                  {(exchangeProducts[item.productId] ?? []).map((product) => <MenuItem key={product._id} value={product._id}>{product.name} · {formatCurrency(product.price)} · {product.stock} in stock</MenuItem>)}
                </TextField>
                {exchangeCategory[item.productId] && !(exchangeProducts[item.productId]?.length) ? <Typography variant="caption" color="text.secondary">No available products in this category.</Typography> : null}
              </Stack> : null}
            </Box>)}
            <Alert severity="info">The seller will review your request. Choose original and replacement products from the same seller. Replacement stock is reserved if the seller accepts.</Alert>
          </Stack> : null}
        </Modal>
      </Container>
    </RequireAuth>
  );
}
