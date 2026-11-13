"use client";

import { Container } from "@mui/material";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { CustomerProductBrowser } from "@shared/components/catalog/customer-product-browser";
import { UserRole } from "@shared/enums";

export default function CustomerProductsPage() {
  return (
    <RequireAuth roles={[UserRole.CUSTOMER]}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <CustomerProductBrowser />
      </Container>
    </RequireAuth>
  );
}
