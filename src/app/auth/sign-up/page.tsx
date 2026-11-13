"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Link as MuiLink,
} from "@mui/material";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { AlertBanner } from "@/components/ui/alert-banner";
import { ApiFetchError } from "@/api/clients";
import { authApi, type SellerProfileInput } from "@/api/auth";
import { IdentityDocumentType, UserRole } from "@/enums";
import { cloudinaryApi } from "@/api/cloudinary";
import { signupSchema } from "@/validators/auth.schema";
import { sellerSchema } from "@/validators/seller.schema";
import { useTranslations, type TranslationKey } from "@/context/locale-context";

const PUBLIC_SIGNUP_ROLES = [UserRole.CUSTOMER, UserRole.SELLER] as const;
const SIGNUP_ERROR_TRANSLATIONS: Record<string, TranslationKey> = {
  "Full name is required": "SIGNUP.ERRORS.FULL_NAME_REQUIRED",
  "Full name must be 100 characters or fewer": "SIGNUP.ERRORS.FULL_NAME_TOO_LONG",
  "Full name can contain only alphabetic characters and spaces": "SIGNUP.ERRORS.FULL_NAME_CHARACTERS",
  "Username must contain at least 3 characters": "SIGNUP.ERRORS.USERNAME_TOO_SHORT",
  "Username must be 30 characters or fewer": "SIGNUP.ERRORS.USERNAME_TOO_LONG",
  "Username can contain only letters and numbers": "SIGNUP.ERRORS.USERNAME_CHARACTERS",
  "Email is required": "SIGNUP.ERRORS.EMAIL_REQUIRED",
  "Business email is required": "SIGNUP.ERRORS.EMAIL_REQUIRED",
  "Email is too long": "SIGNUP.ERRORS.EMAIL_TOO_LONG",
  "Business email is too long": "SIGNUP.ERRORS.EMAIL_TOO_LONG",
  "Enter a valid email address": "SIGNUP.ERRORS.EMAIL_INVALID",
  "Enter a valid business email address": "SIGNUP.ERRORS.EMAIL_INVALID",
  "Email must use English characters": "SIGNUP.ERRORS.EMAIL_CHARACTERS",
  "Business email must use English characters": "SIGNUP.ERRORS.EMAIL_CHARACTERS",
  "Enter an email address with a recognized domain (for example, name@example.com)": "SIGNUP.ERRORS.EMAIL_DOMAIN",
  "Password must contain at least 6 characters": "SIGNUP.ERRORS.PASSWORD_TOO_SHORT",
  "Password must be 72 characters or fewer": "SIGNUP.ERRORS.PASSWORD_TOO_LONG",
  "Password must use English characters and include an uppercase letter, a number, and a special character": "SIGNUP.ERRORS.PASSWORD_RULES",
  "At least one address is required": "SIGNUP.ERRORS.ADDRESS_LIST_REQUIRED",
  "At least one business address is required": "SIGNUP.ERRORS.BUSINESS_ADDRESS_LIST_REQUIRED",
  "Address is required": "ADDRESS.ACCOUNT.REQUIRED",
  "Each address is required": "ADDRESS.ACCOUNT.EACH_REQUIRED",
  "Address must be 1000 characters or fewer": "ADDRESS.ACCOUNT.TOO_LONG",
  "Business address is required": "ADDRESS.BUSINESS.REQUIRED",
  "Each business address is required": "ADDRESS.BUSINESS.EACH_REQUIRED",
  "Business address must be 1000 characters or fewer": "ADDRESS.BUSINESS.TOO_LONG",
  "You can add up to 10 addresses": "ADDRESS.ACCOUNT.LIMIT",
  "You can add up to 10 business addresses": "ADDRESS.BUSINESS.LIMIT",
  "Phone must contain only digits (8 to 15 digits)": "SIGNUP.ERRORS.PHONE_DIGITS",
  "Avatar must be a valid URL": "SIGNUP.ERRORS.AVATAR_URL",
  "Avatar URL must use HTTP or HTTPS": "SIGNUP.ERRORS.AVATAR_PROTOCOL",
  "Shop name is required": "SIGNUP.ERRORS.SHOP_NAME_REQUIRED",
  "Shop name is too long": "SIGNUP.ERRORS.SHOP_NAME_TOO_LONG",
  "Business phone must contain only digits (8 to 15 digits)": "SIGNUP.ERRORS.BUSINESS_PHONE_DIGITS",
  "Registration number is required": "SIGNUP.ERRORS.REGISTRATION_REQUIRED",
  "Registration number must be 100 characters or fewer": "SIGNUP.ERRORS.REGISTRATION_TOO_LONG",
  "Bank name is too long": "SIGNUP.ERRORS.BANK_NAME_TOO_LONG",
  "Account holder is required": "SIGNUP.ERRORS.ACCOUNT_HOLDER_REQUIRED",
  "Account holder must be 100 characters or fewer": "SIGNUP.ERRORS.ACCOUNT_HOLDER_TOO_LONG",
  "Enter a valid IBAN": "SIGNUP.ERRORS.IBAN_INVALID",
  "Enter a valid 8 or 11 character SWIFT/BIC code": "SIGNUP.ERRORS.SWIFT_INVALID",
  "Business email must be different from the account email": "SIGNUP.ERRORS.BUSINESS_EMAIL_DIFFERENT",
  "Invalid value": "SIGNUP.ERRORS.INVALID_VALUE",
  "Something went wrong": "SIGNUP.ERRORS.UNKNOWN_ERROR",
  "fullname can contain only alphabetic characters and spaces": "SIGNUP.ERRORS.FULL_NAME_CHARACTERS",
  "username can contain only letters and numbers": "SIGNUP.ERRORS.USERNAME_CHARACTERS",
  "email must use English characters": "SIGNUP.ERRORS.EMAIL_CHARACTERS",
  "businessEmail must use English characters": "SIGNUP.ERRORS.EMAIL_CHARACTERS",
  "password must use English characters and contain at least 6 characters, one uppercase letter, one number, and one special character": "SIGNUP.ERRORS.PASSWORD_RULES",
  "each address must not be empty": "ADDRESS.ACCOUNT.EACH_REQUIRED",
  "phone must contain only digits (8 to 15 digits)": "SIGNUP.ERRORS.PHONE_DIGITS",
  "businessPhone must contain only digits (8 to 15 digits)": "SIGNUP.ERRORS.BUSINESS_PHONE_DIGITS",
  "registrationNumber must not be empty": "SIGNUP.ERRORS.REGISTRATION_REQUIRED",
  "iban must be a valid IBAN": "SIGNUP.ERRORS.IBAN_INVALID",
  "swift must be a valid 8 or 11 character SWIFT/BIC code": "SIGNUP.ERRORS.SWIFT_INVALID",
  "shopName must not be empty": "SIGNUP.ERRORS.SHOP_NAME_REQUIRED",
  "businessAddress must not be empty": "ADDRESS.BUSINESS.REQUIRED",
  "each business address must not be empty": "ADDRESS.BUSINESS.EACH_REQUIRED",
};

function normalizeApiError(err: unknown): string {
  if (err instanceof ApiFetchError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
} 

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations();
  const translateValidationMessage = (message?: string) => {
    if (!message) return t("SIGNUP.ERRORS.INVALID_VALUE");
    const key = SIGNUP_ERROR_TRANSLATIONS[message];
    return key ? t(key) : message;
  };
  const [fullname, setFullname] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(UserRole.CUSTOMER);
  const [addresses, setAddresses] = React.useState([""]);
  const [phone, setPhone] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string>("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string>("");
  const [avatarFileName, setAvatarFileName] = React.useState<string>("");
  const [avatarUploading, setAvatarUploading] = React.useState(false);

  const [seller, setSeller] = React.useState<SellerProfileInput>({
    shopName: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
    businessAddresses: [""],
    identityDocument: {
      type: IdentityDocumentType.ID_CARD,
    },
    businessRegistration: {
      registrationNumber: "",
    },
    bankInfo: {
      bankName: "",
      accountHolder: "",
      iban: "",
      swift: ""
      //paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    },
  });

  const [identityDocumentFile, setIdentityDocumentFile] = React.useState<File | null>(null);
  const [businessRegistrationFile, setBusinessRegistrationFile] = React.useState<File | null>(null);
  const [companyRegistrationCertificateFile, setCompanyRegistrationCertificateFile] =
    React.useState<File | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [success, setSuccess] = React.useState<string | null>(null);
  const [activeStep, setActiveStep] = React.useState(0);

  const needsSeller = role === UserRole.SELLER;
  const sellerSteps = [
    t("SIGNUP.STEP_ACCOUNT"),
    t("SIGNUP.STEP_STORE"),
    t("SIGNUP.STEP_DOCUMENTS"),
    t("SIGNUP.STEP_BANK"),
  ];

  function updateFieldError(field: string, value: unknown) {
    const accountField = signupSchema.shape[field as keyof typeof signupSchema.shape];
    const sellerField = sellerSchema.shape[field as keyof typeof sellerSchema.shape];
    const validator = accountField ?? sellerField;
    if (!validator) return;
    const result = validator.safeParse(value);
    const businessEmailMatchesAccount =
      field === "businessEmail" &&
      result.success &&
      typeof value === "string" &&
      value.trim().toLowerCase() === email.trim().toLowerCase();
    setFieldErrors((current) => {
      const next = { ...current };
      if (businessEmailMatchesAccount) next[field] = t("SIGNUP.ERRORS.BUSINESS_EMAIL_DIFFERENT");
      else if (result.success) delete next[field];
      else next[field] = translateValidationMessage(result.error.issues[0]?.message);

      if (field === "email" && needsSeller) {
        const businessEmailMatches =
          seller.businessEmail.trim().toLowerCase() === String(value).trim().toLowerCase();
        if (businessEmailMatches && sellerSchema.shape.businessEmail.safeParse(seller.businessEmail).success) {
          next.businessEmail = t("SIGNUP.ERRORS.BUSINESS_EMAIL_DIFFERENT");
        } else if (next.businessEmail === t("SIGNUP.ERRORS.BUSINESS_EMAIL_DIFFERENT")) {
          delete next.businessEmail;
        }
      }
      return next;
    });
  }

  function addressValidationMessage(scope: "address" | "businessAddress", value: string) {
    const text = value.trim();
    if (!text) return scope === "address" ? t("ADDRESS.ACCOUNT.REQUIRED") : t("ADDRESS.BUSINESS.REQUIRED");
    if (text.length > 1000) return scope === "address" ? t("ADDRESS.ACCOUNT.TOO_LONG") : t("ADDRESS.BUSINESS.TOO_LONG");
    return "";
  }

  function updateAddressError(scope: "address" | "businessAddress", index: number, value: string) {
    const key = `${scope}.${index}`;
    const message = addressValidationMessage(scope, value);
    setFieldErrors((current) => {
      const next = { ...current };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  function validateAddressList(scope: "address" | "businessAddress", values: string[]) {
    const prefix = `${scope}.`;
    const errors = values.reduce<Record<string, string>>((result, value, index) => {
      const message = addressValidationMessage(scope, value);
      if (message) result[`${prefix}${index}`] = message;
      return result;
    }, {});
    setFieldErrors((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(prefix))),
      ...errors,
    }));
    return Object.values(errors)[0] ?? "";
  }

  function removeAddress(scope: "address" | "businessAddress", index: number) {
    if (scope === "address") {
      setAddresses((current) => current.filter((_, itemIndex) => itemIndex !== index));
    } else {
      setSeller((current) => ({
        ...current,
        businessAddresses: current.businessAddresses.filter((_, itemIndex) => itemIndex !== index),
      }));
    }
    setFieldErrors((current) => {
      const prefix = `${scope}.`;
      const kept = Object.entries(current).filter(([key]) => !key.startsWith(prefix));
      return Object.fromEntries(kept);
    });
  }

  function updateBankFieldError(field: "accountHolder" | "iban", value: string) {
    const result = sellerSchema.shape.bankInfo.shape[field].safeParse(value);
    setFieldErrors((current) => {
      const next = { ...current };
      const key = `bankInfo.${field}`;
      if (result.success) delete next[key];
      else next[key] = translateValidationMessage(result.error.issues[0]?.message);
      return next;
    });
  }

  const canSubmit =
    fullname.trim() &&
    username.trim() &&
    email.trim() &&
    password.trim().length >= 6 &&
    !avatarUploading &&
    (!needsSeller ||
      (seller.shopName.trim() &&
        seller.businessEmail.trim() &&
        seller.businessPhone.trim() &&
        seller.businessAddresses.some((value) => value.trim()) &&
        seller.identityDocument.type &&
        Boolean(identityDocumentFile) &&
        seller.businessRegistration.registrationNumber.trim() &&
        Boolean(businessRegistrationFile) &&
        Boolean(companyRegistrationCertificateFile) &&
        seller.bankInfo.accountHolder.trim() &&
        seller.bankInfo.iban.trim()));

  React.useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  React.useEffect(() => {
    if (!needsSeller) {
      setIdentityDocumentFile(null);
      setBusinessRegistrationFile(null);
      setCompanyRegistrationCertificateFile(null);

      setSeller({
        shopName: "",
        businessEmail: "",
        businessPhone: "",
        businessAddress: "",
        businessAddresses: [""],
        identityDocument: { type: IdentityDocumentType.ID_CARD },
        businessRegistration: { registrationNumber: "" },
        bankInfo: {
          bankName: "",
          accountHolder: "",
          iban: "",
          swift: "",
          //paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        },
      });
    }
  }, [needsSeller]);

  React.useEffect(() => {
    setActiveStep(0);
  }, [role]);

  function validateStep(step: number): boolean {
    if (step === 0) {
      if (addresses.length > 10) { setError(t("ADDRESS.ACCOUNT.LIMIT")); return false; }
      const addressError = validateAddressList("address", addresses);
      if (addressError) { setError(t("SIGNUP.ERRORS.FIX_ADDRESS_FIELDS")); return false; }
      const result = signupSchema.pick({ fullname: true, username: true, email: true, password: true, role: true, address: true, addresses: true, phone: true, avatar: true }).safeParse({
        fullname, username, email, password, role, address: addresses[0], addresses, phone, avatar: avatarUrl,
      });
      if (!result.success) {
        setError(translateValidationMessage(result.error.issues[0]?.message ?? t("SIGNUP.ERRORS.CHECK_ACCOUNT")));
        return false;
      }
    }

    if (step === 1) {
      if (seller.businessAddresses.length > 10) { setError(t("ADDRESS.BUSINESS.LIMIT")); return false; }
      const addressError = validateAddressList("businessAddress", seller.businessAddresses);
      if (addressError) { setError(t("SIGNUP.ERRORS.FIX_BUSINESS_ADDRESS_FIELDS")); return false; }
      const result = sellerSchema.pick({ shopName: true, businessEmail: true, businessPhone: true, businessAddress: true, businessAddresses: true }).safeParse(seller);
      if (!result.success) {
        setError(translateValidationMessage(result.error.issues[0]?.message ?? t("SIGNUP.ERRORS.CHECK_STORE")));
        return false;
      }
      if (seller.businessEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
        const message = t("SIGNUP.ERRORS.BUSINESS_EMAIL_DIFFERENT");
        setFieldErrors((current) => ({ ...current, businessEmail: message }));
        setError(message);
        return false;
      }
    }

    if (step === 2) {
      const result = sellerSchema.pick({ identityDocument: true, businessRegistration: true }).safeParse(seller);
      if (!result.success || !identityDocumentFile || !businessRegistrationFile || !companyRegistrationCertificateFile) {
        setError(result.success ? t("SIGNUP.ERRORS.REQUIRED_DOCUMENTS") : translateValidationMessage(result.error.issues[0]?.message ?? t("SIGNUP.ERRORS.CHECK_DOCUMENTS")));
        return false;
      }
    }

    if (step === 3) {
      const result = sellerSchema.shape.bankInfo.safeParse(seller.bankInfo);
      if (!result.success) {
        setError(translateValidationMessage(result.error.issues[0]?.message ?? t("SIGNUP.ERRORS.CHECK_BANK")));
        return false;
      }
    }

    setError(null);
    return true;
  }

  function goToNextStep() {
    if (validateStep(activeStep)) setActiveStep((step) => Math.min(step + 1, sellerSteps.length - 1));
  }

  function goToPreviousStep() {
    setError(null);
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function isAllowedDocumentType(file: File): boolean {
    return file.type.startsWith("image/") || file.type === "application/pdf";
  }

  function pickSingleDoc(
    file: File | null,
    setFile: (f: File | null) => void,
    label: string,
  ) {
    if (!file) {
      setFile(null);
      return;
    }
    if (!isAllowedDocumentType(file)) {
      setError(t("SIGNUP.ERRORS.FILE_TYPE"));
      setFile(null);
      return;
    }
    setError(null);
    setFile(file);
  }

  async function onPickAvatar(file: File | null) {
    if (!file) {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl("");
      setAvatarUrl("");
      setAvatarFileName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(t("SIGNUP.ERRORS.AVATAR_IMAGE"));
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl("");
      setAvatarUrl("");
      setAvatarFileName("");
      return;
    }

    setAvatarUploading(true);
    setError(null);
    setSuccess(null);
    setAvatarFileName(file.name);
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(URL.createObjectURL(file));

    try {
      const res = await cloudinaryApi.uploadAvatar(file);
      setAvatarUrl(res.url);
    } catch (e) {
      setAvatarUrl("");
      setError(normalizeApiError(e));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function onSubmit() {
    const accountResult = signupSchema.safeParse({
      fullname, username, email, password, role, address: addresses[0], addresses, phone, avatar: avatarUrl,
    });
    if (!accountResult.success) {
      const addressError = validateAddressList("address", addresses);
      setError(addressError ? t("SIGNUP.ERRORS.FIX_ADDRESS_FIELDS") : translateValidationMessage(accountResult.error.issues[0]?.message ?? t("SIGNUP.ERRORS.CHECK_ACCOUNT")));
      return;
    }
    if (needsSeller) {
      const sellerResult = sellerSchema.safeParse({ ...seller, businessAddress: seller.businessAddresses[0], businessAddresses: seller.businessAddresses });
      if (!sellerResult.success) {
        const addressError = validateAddressList("businessAddress", seller.businessAddresses);
        setError(addressError ? t("SIGNUP.ERRORS.FIX_BUSINESS_ADDRESS_FIELDS") : translateValidationMessage(sellerResult.error.issues[0]?.message ?? t("SIGNUP.ERRORS.CHECK_SELLER")));
        return;
      }
      if (seller.businessEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
        const message = t("SIGNUP.ERRORS.BUSINESS_EMAIL_DIFFERENT");
        setFieldErrors((current) => ({ ...current, businessEmail: message }));
        setError(message);
        return;
      }
      if (!identityDocumentFile || !businessRegistrationFile || !companyRegistrationCertificateFile) {
        setError(t("SIGNUP.ERRORS.REQUIRED_DOCUMENTS"));
        return;
      }
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = needsSeller
        ? await authApi.registerFormData(
            (() => {
              const formData = new FormData();
              formData.set("fullname", fullname);
              formData.set("username", username);
              formData.set("email", email);
              formData.set("password", password);
              formData.set("role", role);
              formData.set("address", addresses[0]);
              formData.set("addresses", JSON.stringify(addresses));
              formData.set("phone", phone);
              formData.set("avatar", avatarUrl);
              formData.set("sellerProfile", JSON.stringify(seller));

              if (identityDocumentFile) {
                formData.set("identityDocumentFile", identityDocumentFile);
              }
              if (businessRegistrationFile) {
                formData.set("businessRegistrationFile", businessRegistrationFile);
              }
              if (companyRegistrationCertificateFile) {
                formData.set(
                  "companyRegistrationCertificateFile",
                  companyRegistrationCertificateFile,
                );
              }

              return formData;
            })(),
          )
        : await authApi.register({
            fullname,
            username,
            email,
            password,
            role: role as UserRole,
            address: addresses[0],
            addresses,
            phone,
            avatar: avatarUrl,
          });
      setSuccess(res.message);

      const qp = new URLSearchParams({ registered: "1" });
      if (email.trim()) qp.set("email", email.trim());
      router.replace(`/auth/sign-in?${qp.toString()}`);
    } catch (e) {
      setError(translateValidationMessage(normalizeApiError(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        maxHeight: {
          xs: "calc(100vh - 240px)",
          sm: "calc(100vh - 260px)",
          md: "calc(100vh - 280px)",
        },
        overflowY: "auto",
        pr: 1,
        scrollbarGutter: "stable",
        overscrollBehavior: "contain",
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6">{t("SIGNUP.TITLE")}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t("SIGNUP.REQUIRED_FIELDS")}
        </Typography>

        {needsSeller ? (
          <Stepper activeStep={activeStep} alternativeLabel>
            {sellerSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        ) : null}

      {error ? <AlertBanner severity="error" dismissible={true}>{error}</AlertBanner> : null}
      {success ? <AlertBanner severity="success" dismissible={true}>{success}</AlertBanner> : null}

      {!needsSeller || activeStep === 0 ? <>
      <FormField fullWidth id="signup-fullname" label={t("SIGNUP.FULL_NAME")} value={fullname} onChange={(e: any) => { setFullname(e.target.value); updateFieldError("fullname", e.target.value); }} onBlur={(e: any) => updateFieldError("fullname", e.target.value)} error={!!fieldErrors.fullname} helperText={fieldErrors.fullname} required />
      <FormField fullWidth id="signup-username" label={t("SIGNUP.USERNAME")} value={username} onChange={(e: any) => { setUsername(e.target.value); updateFieldError("username", e.target.value); }} onBlur={(e: any) => updateFieldError("username", e.target.value)} error={!!fieldErrors.username} helperText={fieldErrors.username} required />
      <FormField fullWidth id="signup-email" label={t("SIGNUP.EMAIL")} value={email} onChange={(e: any) => { setEmail(e.target.value); updateFieldError("email", e.target.value); }} onBlur={(e: any) => updateFieldError("email", e.target.value)} error={!!fieldErrors.email} helperText={fieldErrors.email} inputMode="email" type="email" required />
      <FormField fullWidth id="signup-password" label={t("SIGNUP.PASSWORD")} value={password} onChange={(e: any) => { setPassword(e.target.value); updateFieldError("password", e.target.value); }} onBlur={(e: any) => updateFieldError("password", e.target.value)} error={!!fieldErrors.password} helperText={fieldErrors.password} type="password" required />

      <FormField
        select
        label={t("SIGNUP.ROLE")}
        value={role}
        onChange={(e: any) => setRole(e.target.value as UserRole)}
      >
        {PUBLIC_SIGNUP_ROLES.map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </FormField>

      <PhoneNumberInput
        id="signup-phone"
        label={t("SIGNUP.PHONE")}
        onChange={(value) => { setPhone(value); updateFieldError("phone", value); }}
        error={!!fieldErrors.phone}
        helperText={fieldErrors.phone}
        required
      />
      <Stack spacing={1}>
        <Typography variant="body2">{t("ADDRESS.ACCOUNT.TITLE")}</Typography>
      {addresses.map((value, index) => <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
          <FormField fullWidth id={`signup-address-${index}`} label={`${t("ADDRESS.ACCOUNT.LABEL")} ${index + 1}`} value={value} onChange={(e: any) => { setAddresses((current) => current.map((item, i) => i === index ? e.target.value : item)); updateAddressError("address", index, e.target.value); }} onBlur={(e: any) => updateAddressError("address", index, e.target.value)} error={!!fieldErrors[`address.${index}`]} helperText={fieldErrors[`address.${index}`]} required />
          {addresses.length > 1 ? <Button variant="secondary" onClick={() => removeAddress("address", index)}>{t("ADDRESS.ACCOUNT.REMOVE")}</Button> : null}
        </Stack>)}
        {addresses.length < 10 ? <Button variant="secondary" onClick={() => setAddresses((current) => [...current, ""])}>{t("ADDRESS.ACCOUNT.ADD")}</Button> : null}
      </Stack>
      
      <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t("SIGNUP.AVATAR_TITLE")}
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={avatarPreviewUrl || undefined}
            alt={fullname || t("SIGNUP.AVATAR_TITLE")}
            sx={{ width: 56, height: 56, bgcolor: "grey.200" }}
          />

          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Button
              variant="secondary"
              onClick={() => document.getElementById("signup-avatar-input")?.click()}
              disabled={avatarUploading}
              isLoading={avatarUploading}
            >
              {t("SIGNUP.CHOOSE_IMAGE")}
            </Button>

            <input
              id="signup-avatar-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e: any) => {
                void onPickAvatar(e.target.files?.[0] ?? null);
              }}
            />

            <Typography variant="caption" color="text.secondary">
              {avatarUploading
                ? t("SIGNUP.UPLOADING")
                : avatarFileName
                  ? `${t("SIGNUP.SELECTED")} ${avatarFileName}`
                  : t("SIGNUP.IMAGE_FORMATS")}
            </Typography>
            {avatarUrl ? (
              <Typography variant="caption" color="text.secondary">
                {t("SIGNUP.UPLOADED")}
              </Typography>
            ) : null}
          </Stack>

          {avatarUrl || avatarPreviewUrl ? (
            <Button
              variant="secondary"
              disabled={avatarUploading}
              onClick={() => {
                if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                setAvatarPreviewUrl("");
                setAvatarUrl("");
                setAvatarFileName("");
                const el = document.getElementById("signup-avatar-input") as HTMLInputElement | null;
                if (el) el.value = "";
              }}
            >
              {t("ADDRESS.ACCOUNT.REMOVE")}
            </Button>
          ) : null}
        </Stack>
      </Box>
      </> : null}

      {needsSeller && activeStep > 0 ? (
        <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {sellerSteps[activeStep]}
          </Typography>
          {activeStep === 1 ? <Stack spacing={2}>
            <FormField
              id="seller-shop-name"
              label={t("SIGNUP.SHOP_NAME")}
              value={seller.shopName}
              onChange={(e: any) => { setSeller((s) => ({ ...s, shopName: e.target.value })); updateFieldError("shopName", e.target.value); }}
              onBlur={(e: any) => updateFieldError("shopName", e.target.value)}
              error={!!fieldErrors.shopName} helperText={fieldErrors.shopName}
              required
            />
            <FormField
              id="seller-business-email"
              label={t("SIGNUP.BUSINESS_EMAIL")}
              value={seller.businessEmail}
              onChange={(e: any) => { setSeller((s) => ({ ...s, businessEmail: e.target.value })); updateFieldError("businessEmail", e.target.value); }}
              onBlur={(e: any) => updateFieldError("businessEmail", e.target.value)}
              error={!!fieldErrors.businessEmail} helperText={fieldErrors.businessEmail}
              type="email"
              required
            />
            <PhoneNumberInput
              id="seller-business-phone"
              label={t("SIGNUP.BUSINESS_PHONE")}
              onChange={(value) => { setSeller((s) => ({ ...s, businessPhone: value })); updateFieldError("businessPhone", value); }}
              error={!!fieldErrors.businessPhone} helperText={fieldErrors.businessPhone}
              required
            />
            <FormField
              id="seller-business-address"
              label={`${t("ADDRESS.BUSINESS.LABEL")} *`}
              value={seller.businessAddress}
              onChange={(e: any) => { setSeller((s) => ({ ...s, businessAddress: e.target.value, businessAddresses: s.businessAddresses.map((item, i) => i === 0 ? e.target.value : item) })); updateAddressError("businessAddress", 0, e.target.value); }}
              onBlur={(e: any) => updateAddressError("businessAddress", 0, e.target.value)}
              error={!!fieldErrors["businessAddress.0"]} helperText={fieldErrors["businessAddress.0"]}
              required
            />
            <Stack spacing={1}>
              <Typography variant="body2">{t("ADDRESS.BUSINESS.TITLE")}</Typography>
              {seller.businessAddresses.slice(1).map((value, offset) => { const index = offset + 1; return <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
                <FormField fullWidth id={`seller-business-address-${index}`} label={`${t("ADDRESS.BUSINESS.LABEL")} ${index + 1}`} value={value} onChange={(e: any) => { setSeller((s) => ({ ...s, businessAddresses: s.businessAddresses.map((item, i) => i === index ? e.target.value : item) })); updateAddressError("businessAddress", index, e.target.value); }} onBlur={(e: any) => updateAddressError("businessAddress", index, e.target.value)} error={!!fieldErrors[`businessAddress.${index}`]} helperText={fieldErrors[`businessAddress.${index}`]} required />
                <Button variant="secondary" onClick={() => removeAddress("businessAddress", index)}>{t("ADDRESS.ACCOUNT.REMOVE")}</Button>
              </Stack>; })}
              {seller.businessAddresses.length < 10 ? <Button variant="secondary" onClick={() => setSeller((s) => ({ ...s, businessAddresses: [...s.businessAddresses, ""] }))}>{t("ADDRESS.BUSINESS.ADD")}</Button> : null}
            </Stack>

          </Stack> : null}

          {activeStep === 2 ? <Box sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("SIGNUP.REQUIRED_DOCUMENTS")}
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t("SIGNUP.IDENTITY_DOCUMENT")}
                  </Typography>

                  <FormField
                    select
                    label={t("SIGNUP.IDENTITY_DOCUMENT_TYPE")}
                    value={seller.identityDocument.type}
                    onChange={(e: any) =>
                      setSeller((s) => ({
                        ...s,
                        identityDocument: {
                          ...s.identityDocument,
                          type: e.target.value as IdentityDocumentType,
                        },
                      }))
                    }
                    sx={{ mb: 1 }}
                  >
                    {Object.values(IdentityDocumentType).map((documentType) => (
                      <MenuItem key={documentType} value={documentType}>{documentType}</MenuItem>
                    ))}
                  </FormField>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        document.getElementById("signup-identity-doc")?.click()
                      }
                    >
                      {t("SIGNUP.CHOOSE_FILE")}
                    </Button>
                    <input
                      id="signup-identity-doc"
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      onChange={(e: any) =>
                        pickSingleDoc(
                          e.target.files?.[0] ?? null,
                          setIdentityDocumentFile,
                          "Identity document",
                        )
                      }
                    />
                    {identityDocumentFile ? (
                      <Button variant="secondary" onClick={() => setIdentityDocumentFile(null)}>
                        {t("SIGNUP.CLEAR")}
                      </Button>
                    ) : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {identityDocumentFile ? `${t("SIGNUP.SELECTED")} ${identityDocumentFile.name}` : t("SIGNUP.NO_FILE_SELECTED")}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t("SIGNUP.BUSINESS_REGISTRATION")}
                  </Typography>

                  <FormField
                    id="seller-registration-number"
                    label={t("SIGNUP.REGISTRATION_NUMBER")}
                    value={seller.businessRegistration.registrationNumber}
                    onChange={(e: any) =>
                      {
                        setSeller((s) => ({ ...s, businessRegistration: { ...s.businessRegistration, registrationNumber: e.target.value } }));
                        const result = sellerSchema.shape.businessRegistration.shape.registrationNumber.safeParse(e.target.value);
                        setFieldErrors((current) => ({ ...current, registrationNumber: result.success ? "" : translateValidationMessage(result.error.issues[0]?.message) }));
                      }
                    }
                    onBlur={(e: any) => {
                      const result = sellerSchema.shape.businessRegistration.shape.registrationNumber.safeParse(e.target.value);
                      setFieldErrors((current) => ({ ...current, registrationNumber: result.success ? "" : translateValidationMessage(result.error.issues[0]?.message) }));
                    }}
                    error={!!fieldErrors.registrationNumber} helperText={fieldErrors.registrationNumber}
                    sx={{ mb: 1 }}
                    required
                  />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        document.getElementById("signup-business-reg")?.click()
                      }
                    >
                      {t("SIGNUP.CHOOSE_DOCUMENT")}
                    </Button>
                    <input
                      id="signup-business-reg"
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      onChange={(e: any) =>
                        pickSingleDoc(
                          e.target.files?.[0] ?? null,
                          setBusinessRegistrationFile,
                          "Business registration document",
                        )
                      }
                    />
                    {businessRegistrationFile ? (
                      <Button variant="secondary" onClick={() => setBusinessRegistrationFile(null)}>
                        {t("SIGNUP.CLEAR")}
                      </Button>
                    ) : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {businessRegistrationFile ? `${t("SIGNUP.SELECTED")} ${businessRegistrationFile.name}` : t("SIGNUP.NO_FILE_SELECTED")}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t("SIGNUP.COMPANY_CERTIFICATE")}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        document.getElementById("signup-company-cert")?.click()
                      }
                    >
                      {t("SIGNUP.CHOOSE_DOCUMENT")}
                    </Button>
                    <input
                      id="signup-company-cert"
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      onChange={(e: any) =>
                        pickSingleDoc(
                          e.target.files?.[0] ?? null,
                          setCompanyRegistrationCertificateFile,
                          "Company registration certificate",
                        )
                      }
                    />
                    {companyRegistrationCertificateFile ? (
                      <Button
                        variant="secondary"
                        onClick={() => setCompanyRegistrationCertificateFile(null)}
                      >
                        {t("SIGNUP.CLEAR")}
                      </Button>
                    ) : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {companyRegistrationCertificateFile
                      ? `${t("SIGNUP.SELECTED")} ${companyRegistrationCertificateFile.name}`
                      : t("SIGNUP.NO_FILE_SELECTED")}
                  </Typography>
                </Box>
              </Stack>
          </Box> : null}

          {activeStep === 3 ? <Box sx={{ p: 1.5, border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("SIGNUP.BANK_SECTION_TITLE")}
              </Typography>
              <Stack spacing={2}>
                <FormField
                  id="seller-bank-name"
                  label={t("SIGNUP.BANK_NAME")}
                  value={seller.bankInfo.bankName ?? ""}
                  onChange={(e: any) =>
                    setSeller((s) => ({
                      ...s,
                      bankInfo: { ...s.bankInfo, bankName: e.target.value },
                    }))
                  }
                />
                <FormField
                  id="seller-account-holder"
                  label={t("SIGNUP.ACCOUNT_HOLDER")}
                  value={seller.bankInfo.accountHolder}
                  onChange={(e: any) =>
                    {
                      setSeller((s) => ({ ...s, bankInfo: { ...s.bankInfo, accountHolder: e.target.value } }));
                      updateBankFieldError("accountHolder", e.target.value);
                    }
                  }
                  onBlur={(e: any) => updateBankFieldError("accountHolder", e.target.value)}
                  error={!!fieldErrors["bankInfo.accountHolder"]} helperText={fieldErrors["bankInfo.accountHolder"]}
                  required
                />
                <FormField
                  id="seller-iban"
                  label={t("SIGNUP.IBAN")}
                  value={seller.bankInfo.iban}
                  onChange={(e: any) =>
                    {
                      setSeller((s) => ({ ...s, bankInfo: { ...s.bankInfo, iban: e.target.value } }));
                      updateBankFieldError("iban", e.target.value);
                    }
                  }
                  error={!!fieldErrors["bankInfo.iban"]} helperText={fieldErrors["bankInfo.iban"]}
                  onBlur={(e: any) => updateBankFieldError("iban", e.target.value)}
                  required
                />
                <FormField
                  id="seller-swift"
                  label={t("SIGNUP.SWIFT")}
                  value={seller.bankInfo.swift ?? ""}
                  onChange={(e: any) =>
                    setSeller((s) => ({
                      ...s,
                      bankInfo: { ...s.bankInfo, swift: e.target.value },
                    }))
                  }
                />
                {/* <FormField
                  select
                  id="seller-payment-method"
                  label={t("SIGNUP.PAYMENT_METHOD")}
                  value={seller.bankInfo.paymentMethod ?? ""}
                  onChange={(e: any) =>
                    setSeller((s) => ({
                      ...s,
                      bankInfo: {
                        ...s.bankInfo,
                        paymentMethod: e.target.value as PaymentMethod,
                      },
                    }))
                  }
                  >
                    <MenuItem value={PaymentMethod.BANK_CARD}>{PaymentMethod.BANK_CARD}</MenuItem>
                    <MenuItem value={PaymentMethod.CASH_ON_DELIVERY}>{PaymentMethod.CASH_ON_DELIVERY}</MenuItem>
                  </FormField> */}
              </Stack>
          </Box> : null}
        </Box>
      ) : null}

      {needsSeller ? (
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Button variant="secondary" onClick={goToPreviousStep} disabled={activeStep === 0 || loading}>
            {t("SIGNUP.BACK")}
          </Button>
          {activeStep < sellerSteps.length - 1 ? (
            <Button onClick={goToNextStep}>{t("SIGNUP.NEXT")}</Button>
          ) : (
            <Button onClick={onSubmit} disabled={!canSubmit} isLoading={loading}>
              {t("AUTH.CREATE_ACCOUNT")}
            </Button>
          )}
        </Stack>
      ) : (
        <Button onClick={onSubmit} disabled={!canSubmit} isLoading={loading}>
          {t("AUTH.CREATE_ACCOUNT")}
        </Button>
      )}
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
        <Typography variant="body2">{t("SIGNUP.HAVE_ACCOUNT")}</Typography>
        <MuiLink component={Link} href="/auth/sign-in" variant="body2" fontWeight={600}>
          {t("AUTH.SIGN_IN")}
        </MuiLink>
      </Stack>
        <Typography variant="caption" color="text.secondary">
          {needsSeller
            ? t("SIGNUP.SELLER_APPROVAL_NOTE")
            : t("SIGNUP.EMAIL_ACTIVATION_NOTE")}
        </Typography>
      </Stack>
    </Box>
  );
}
