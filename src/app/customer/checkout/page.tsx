"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Box, Card, CardContent, Container, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { UserRole } from "@/enums";
import { PaymentMethod } from "@/enums/payment-method";
import { useSession } from "@/context/session-context";
import { useTranslations } from "@/context/locale-context";
import { ordersApi, type Order } from "@/api/orders";
import { ApiFetchError } from "@/api/clients";
import { paymentsApi } from "@shared/api/payments";
import { formatCurrency } from "@shared/lib/date-utils";

type CartLine = { product: { _id: string; name: string; price: number; stock: number }; quantity: number };
type CardDetails = { holder: string; number: string; expiry: string; cvv: string };
const emptyCardDetails: CardDetails = { holder: "", number: "", expiry: "", cvv: "" };

export default function CustomerCheckoutPage() {
  const t = useTranslations();
  const router = useRouter();
  const session = useSession();
  const cartStorageKey = `nextshop-cart-v2-${session.user?.email ?? "customer"}`;
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartReady, setCartReady] = React.useState(false);
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.CASH_ON_DELIVERY);
  const [cardDetails, setCardDetails] = React.useState<CardDetails>(emptyCardDetails);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [placedOrder, setPlacedOrder] = React.useState<Order | null>(null);
  const [paymentReference, setPaymentReference] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(cartStorageKey);
      setCart(stored ? JSON.parse(stored) as CartLine[] : []);
    } catch {
      setCart([]);
    }
    setCartReady(true);
  }, [cartStorageKey]);

  React.useEffect(() => {
    if (!cartReady) return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("nextshop:cart-changed"));
  }, [cart, cartReady, cartStorageKey]);

  React.useEffect(() => {
    setAddress(session.user?.address ?? "");
    setPhone(session.user?.phone ?? "");
  }, [session.user]);

  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const deliveryCost = 7;
  const total = subtotal + deliveryCost;

  function updateQuantity(productId: string, amount: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.product._id !== productId) return [line];
      const quantity = Math.min(line.quantity + amount, line.product.stock);
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }));
  }

  function cancelCheckout() {
    window.localStorage.removeItem(cartStorageKey);
    setCart([]);
    window.dispatchEvent(new Event("nextshop:cart-changed"));
    router.push("/customer");
  }

  async function finalizeOrder() {
    setLoading(true);
    setError("");
    try {
      if (paymentMethod === PaymentMethod.BANK_CARD) {
        const [expiryMonth, expiryYear] = cardDetails.expiry.split("/").map(Number);
        const result = await paymentsApi.simulateCardPayment({
          items: cart.map(({ product, quantity }) => ({ productId: product._id, quantity })),
          deliveryAddress: address.trim(),
          phone: phone.trim(),
          paymentMethod: PaymentMethod.BANK_CARD,
          cardholder: cardDetails.holder.trim(),
          cardNumber: cardDetails.number,
          expiryMonth,
          expiryYear: expiryYear < 100 ? 2000 + expiryYear : expiryYear,
          cvv: cardDetails.cvv,
        });
        if (!result.approved) {
          setError(result.message);
          return;
        }
        window.localStorage.removeItem(cartStorageKey);
        window.dispatchEvent(new Event("nextshop:cart-changed"));
        setCart([]);
        setPaymentReference(result.reference);
        setPlacedOrder(result.order);
        return;
      }
      const order = await ordersApi.create({
        items: cart.map(({ product, quantity }) => ({ productId: product._id, quantity })),
        deliveryAddress: address.trim(),
        phone: phone.trim(),
        paymentMethod,
      });
      window.localStorage.removeItem(cartStorageKey);
      window.dispatchEvent(new Event("nextshop:cart-changed"));
      setCart([]);
      setPlacedOrder(order);
    } catch (cause) {
      setError(cause instanceof ApiFetchError ? cause.message : t("ORDER_PAGE.SUBMIT_ERROR"));
    } finally {
      if (paymentMethod === PaymentMethod.BANK_CARD) setCardDetails(emptyCardDetails);
      setLoading(false);
    }
  }

  return (
    <RequireAuth roles={[UserRole.CUSTOMER]}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>{t("ORDER_PAGE.TITLE")}</Typography>
            <Typography color="text.secondary">{t("ORDER_PAGE.SUBTITLE")}</Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {placedOrder ? (
            <Card variant="outlined"><CardContent>
              <Stack spacing={2}>
                <Alert severity="success">{t("ORDER_PAGE.SUCCESS")}</Alert>
                {paymentReference ? <Alert severity="info">{t("ORDER_PAGE.SIMULATED_PAYMENT_NOTICE")}<br />{t("ORDER_PAGE.PAYMENT_REFERENCE")}: {paymentReference}</Alert> : null}
                <Typography>{t("ORDER_PAGE.ORDER_NUMBER")}: {placedOrder._id}</Typography>
                <Typography>{t("ORDER_PAGE.SUBTOTAL")}: {(placedOrder.total - (placedOrder.deliveryCost ?? deliveryCost)).toFixed(2)} DT</Typography>
                <Typography>{t("ORDER_PAGE.DELIVERY_COST")}: {(placedOrder.deliveryCost ?? deliveryCost).toFixed(2)} DT</Typography>
                <Typography fontWeight={700}>{t("ORDER_PAGE.TOTAL")}: {placedOrder.total.toFixed(2)} DT</Typography>
                <Button component={Link} href="/customer#orders">{t("ORDER_PAGE.VIEW_ORDERS")}</Button>
              </Stack>
            </CardContent></Card>
          ) : !cartReady ? (
            <Typography>{t("ADMIN_PAGE.LOADING")}</Typography>
          ) : cart.length === 0 ? (
            <Card variant="outlined"><CardContent><Stack spacing={2}>
              <Typography>{t("ORDER_PAGE.EMPTY_CART")}</Typography>
              <Button component={Link} href="/customer#products">{t("ORDER_PAGE.CONTINUE_SHOPPING")}</Button>
            </Stack></CardContent></Card>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" }, gap: 2, alignItems: "start" }}>
              <Card variant="outlined"><CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>{t("ORDER_PAGE.DELIVERY")}</Typography>
                  <TextField label={t("ORDER_PAGE.ADDRESS")} value={address} onChange={(event) => setAddress(event.target.value)} required multiline minRows={2} fullWidth />
                  <TextField label={t("ORDER_PAGE.PHONE")} value={phone} onChange={(event) => setPhone(event.target.value)} required fullWidth inputMode="tel" />
                  <TextField select label={t("ORDER_PAGE.PAYMENT_METHOD")} value={paymentMethod} onChange={(event) => {
                    const nextPaymentMethod = event.target.value as PaymentMethod;
                    setPaymentMethod(nextPaymentMethod);
                    setError("");
                  }} fullWidth>
                    <MenuItem value={PaymentMethod.CASH_ON_DELIVERY}>{t("ORDER_PAGE.CASH_ON_DELIVERY")}</MenuItem>
                    <MenuItem value={PaymentMethod.BANK_CARD}>{t("ORDER_PAGE.BANK_CARD")}</MenuItem>
                  </TextField>
                  {paymentMethod === PaymentMethod.BANK_CARD ? (
                    <Stack spacing={2}>
                      <Typography variant="subtitle1" fontWeight={700}>{t("ORDER_PAGE.SIMULATOR_TITLE")}</Typography>
                      <TextField
                        label={t("ORDER_PAGE.CARDHOLDER_NAME")}
                        value={cardDetails.holder}
                        onChange={(event) => setCardDetails((current) => ({ ...current, holder: event.target.value }))}
                        autoComplete="cc-name"
                        required
                        fullWidth
                      />
                      <TextField
                        label={t("ORDER_PAGE.CARD_NUMBER")}
                        value={cardDetails.number}
                        onChange={(event) => setCardDetails((current) => ({ ...current, number: event.target.value.replace(/[^\d ]/g, "").slice(0, 23) }))}
                        inputProps={{ inputMode: "numeric", autoComplete: "cc-number", maxLength: 23 }}
                        placeholder="4242 4242 4242 4242"
                        required
                        fullWidth
                      />
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          label={t("ORDER_PAGE.EXPIRY_DATE")}
                          value={cardDetails.expiry}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                            setCardDetails((current) => ({ ...current, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits }));
                          }}
                          inputProps={{ inputMode: "numeric", autoComplete: "cc-exp", maxLength: 5 }}
                          placeholder="MM/YY"
                          required
                          fullWidth
                        />
                        <TextField
                          label={t("ORDER_PAGE.SECURITY_CODE")}
                          type="password"
                          value={cardDetails.cvv}
                          onChange={(event) => setCardDetails((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                          inputProps={{ inputMode: "numeric", autoComplete: "cc-csc", maxLength: 4 }}
                          required
                          fullWidth
                        />
                      </Stack>
                      <Alert severity="info">
                        {t("ORDER_PAGE.SIMULATOR_NOTICE")}<br />
                        {t("ORDER_PAGE.SIMULATOR_APPROVED_CARD")}<br />
                        {t("ORDER_PAGE.SIMULATOR_LOW_BALANCE_CARD")}<br />
                        {t("ORDER_PAGE.SIMULATOR_DECLINED_CARD")}
                      </Alert>
                    </Stack>
                  ) : null}
                </Stack>
              </CardContent></Card>

              <Card variant="outlined"><CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={700}>{t("ORDER_PAGE.SUMMARY")}</Typography>
                  {cart.map((line) => <Stack key={line.product._id} direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
                    <Typography>{line.product.name} × {line.quantity}</Typography>
                    <IconButton size="small" aria-label={`Decrease ${line.product.name} quantity`} onClick={() => updateQuantity(line.product._id, -1)}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label={`Increase ${line.product.name} quantity`} disabled={line.quantity >= line.product.stock} onClick={() => updateQuantity(line.product._id, 1)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                    <Typography>{(line.product.price * line.quantity).toFixed(2)}</Typography>
                  </Stack>)}
                  <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
                    <Typography>{t("ORDER_PAGE.SUBTOTAL")}</Typography>
                    <Typography>{subtotal.toFixed(2)} DT</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>{t("ORDER_PAGE.DELIVERY_COST")}</Typography>
                    <Typography>{deliveryCost.toFixed(2)} DT</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
                    <Typography fontWeight={800}>{t("ORDER_PAGE.TOTAL")}</Typography>
                    <Typography fontWeight={800}>{total.toFixed(2)} DT</Typography>
                  </Stack>
                  <Button onClick={() => void finalizeOrder()} disabled={loading || !address.trim() || !phone.trim()} isLoading={loading}>
                    {paymentMethod === PaymentMethod.BANK_CARD ? `${t("ORDER_PAGE.PAY_NOW")} · ${formatCurrency(total)}` : t("ORDER_PAGE.PLACE_ORDER")}
                  </Button>
                  <Button variant="outlined" color="inherit" onClick={cancelCheckout} disabled={loading}>
                    Cancel checkout
                  </Button>
                </Stack>
              </CardContent></Card>
            </Box>
          )}
        </Stack>
      </Container>
    </RequireAuth>
  );
}
