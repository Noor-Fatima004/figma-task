"use client";

// Rakho: app/(front-store)/checkout/page.tsx
// Login zaroori hai. Cart cartStore se aata hai.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FiArrowRight,
  FiCheck,
  FiChevronRight,
  FiLock,
  FiShoppingBag,
  FiUser,
} from "react-icons/fi";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  TAX_RATE,
  useCart,
  type CartItem,
} from "@/app/components/storefront/cartStore";

const formatMoney = (n: number) =>
  `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Guest ko yahan bheja jata hai. Apne routes ke hisaab se badlo.
const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";
const CHECKOUT_PATH = "/checkout";

// Navbar jis endpoint se login status dekhta hai, wahi yahan bhi (200 = logged in)
async function isLoggedIn(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

const COUNTRIES = ["Pakistan", "United Arab Emirates", "United Kingdom", "United States"];

const CONFIDENCE = [
  "Secure checkout",
  "Encrypted payments",
  "Easy returns within 30 days",
  "Complimentary shipping on qualifying orders",
];

type PaymentMethod = "cod" | "card";

type FormState = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
  payment: PaymentMethod;
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvc: string;
  terms: boolean;
};

const INITIAL: FormState = {
  email: "",
  phone: "",
  firstName: "",
  lastName: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Pakistan",
  notes: "",
  payment: "cod",
  cardNumber: "",
  cardName: "",
  cardExpiry: "",
  cardCvc: "",
  terms: false,
};

// Validation ke time errors isi tarteeb se check hote hain (pehli galti par focus jata hai)
const FIELD_ORDER = [
  "email",
  "phone",
  "firstName",
  "lastName",
  "address",
  "city",
  "state",
  "postalCode",
  "cardNumber",
  "cardName",
  "cardExpiry",
  "cardCvc",
  "terms",
] as const;

type Errors = Partial<Record<(typeof FIELD_ORDER)[number], string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (f.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number.";
  if (!f.firstName.trim()) e.firstName = "First name is required.";
  if (!f.lastName.trim()) e.lastName = "Last name is required.";
  if (!f.address.trim()) e.address = "Street address is required.";
  if (!f.city.trim()) e.city = "City is required.";
  if (!f.state.trim()) e.state = "Province / state is required.";
  if (!f.postalCode.trim()) e.postalCode = "Postal code is required.";
  if (f.payment === "card") {
    const digits = f.cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) e.cardNumber = "Enter a valid card number.";
    if (!f.cardName.trim()) e.cardName = "Name on card is required.";
    const m = /^(\d{2})\/(\d{2})$/.exec(f.cardExpiry);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) e.cardExpiry = "Use MM/YY.";
    if (!/^\d{3,4}$/.test(f.cardCvc)) e.cardCvc = "Enter the security code.";
  }
  if (!f.terms) e.terms = "Please accept the terms to place your order.";
  return e;
}

// Card ka brand sirf number ke shuru ke digits se pehchana jata hai
function detectCardBrand(digits: string) {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  return "Card";
}

/**
 * ORDER SUBMIT: /api/orders ko call karta hai.
 * Payload backend ke zod schema se match karta hai:
 *   customer: { name, email, phone }
 *   address:  { name, phone, line1, line2, city, state, postalCode, country }
 *   payment:  { method, cardHolder?, cardBrand?, cardLast4? }
 *   items:    [{ productId, variationIds, quantity }]
 * Card ka poora number / CVC kabhi server par nahi jata, sirf aakhri 4 digits.
 * Real card payment ke liye payment gateway (Stripe, etc.) ka hosted field / redirect use karo.
 * Total/tax/shipping server par dobara calculate hote hain.
 */
async function submitOrder(payload: {
  customer: { name: string; email: string; phone: string };
  address: {
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  payment: {
    method: PaymentMethod;
    cardHolder?: string;
    cardBrand?: string;
    cardLast4?: string;
  };
  items: { id: unknown; qty: number; variations: string[] }[];
}): Promise<{ orderNumber: string }> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: payload.customer,
      address: payload.address,
      payment: payload.payment,
      items: payload.items.map((i) => ({
        productId: String(i.id),
        variationIds: i.variations,
        quantity: i.qty,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const errorObj = new Error(err.error || "Order could not be placed.") as Error & {
      productId?: string;
    };
    if (err.productId) errorObj.productId = String(err.productId);
    throw errorObj;
  }
  const data = await res.json();
  return { orderNumber: data.orderNumber };
}

/* ───────── chhote components ───────── */

function Field({
  id,
  label,
  error,
  optional,
  className = "",
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[#4d453f]">
        {label}
        {optional && <span className="ml-1 font-normal text-[#9a9087]">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-[#b3402f]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (error?: string) =>
  `w-full min-w-0 rounded-lg border bg-white px-3.5 py-3 text-sm text-[#2a231f] outline-none transition placeholder:text-[#b8afa6] focus:border-[#8b5e3c] ${
    error ? "border-[#b3402f]" : "border-[#e6e0d8]"
  }`;

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e6e0d8] bg-white/60 p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-base font-semibold text-[#2a231f] sm:text-lg">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2d221c] text-xs font-medium text-white">
          {step}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ───────── page ───────── */

export default function CheckoutPage() {
  const router = useRouter();
  const { items, count, subtotal, clearCart, removeItem } = useCart();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Login status: guest order place nahi kar sakta
  const [authStatus, setAuthStatus] = useState<"loading" | "guest" | "user">("loading");
  useEffect(() => {
    let cancelled = false;
    isLoggedIn().then((ok) => {
      if (!cancelled) setAuthStatus(ok ? "user" : "guest");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginHref = `${LOGIN_PATH}?redirect=${encodeURIComponent(CHECKOUT_PATH)}&reason=checkout`;
  const registerHref = `${REGISTER_PATH}?redirect=${encodeURIComponent(CHECKOUT_PATH)}&reason=checkout`;

  const goToLogin = () => {
    toast.error("Please create an account first to place your order.");
    router.push(loginHref);
  };

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [failingProductId, setFailingProductId] = useState<string | null>(null);
  const [done, setDone] = useState<{
    orderNumber: string;
    email: string;
    total: number;
    items: CartItem[];
  } | null>(null);

  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShipping ? 0 : SHIPPING_FLAT;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shipping + tax;

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const text =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key)(e.target.value as never);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || items.length === 0) return;

    // Guest ho to order nahi: account banane ko kaho aur login page par bhejo
    if (authStatus !== "user") {
      const ok = await isLoggedIn(); // taaza check (ho sakta hai abhi login hua ho)
      if (!ok) {
        setAuthStatus("guest");
        goToLogin();
        return;
      }
      setAuthStatus("user");
    }

    const found = validate(form);
    setErrors(found);
    const firstBad = FIELD_ORDER.find((k) => found[k]);
    if (firstBad) {
      const el = document.getElementById(`f-${firstBad}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setFailingProductId(null);
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const phone = form.phone.trim();
      const cardDigits = form.cardNumber.replace(/\D/g, "");

      const res = await submitOrder({
        customer: { name: fullName, email: form.email.trim(), phone },
        address: {
          name: fullName,
          phone,
          line1: form.address.trim(),
          line2: form.apartment.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country,
        },
        payment:
          form.payment === "card"
            ? {
                method: "card",
                cardHolder: form.cardName.trim(),
                cardBrand: detectCardBrand(cardDigits),
                cardLast4: cardDigits.slice(-4), // sirf aakhri 4 digits, poora number kabhi nahi
              }
            : { method: "cod" },
        items: items.map((i) => ({
          id: i.id,
          qty: i.qty,
          variations: i.variations, // selected variation _id's (simple product ke liye [])
        })),
      });
      setDone({ orderNumber: res.orderNumber, email: form.email.trim(), total, items });
      clearCart();
      setForm(INITIAL);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "We could not place your order. Please try again.";
      setSubmitError(msg);
      if (
        err &&
        typeof err === "object" &&
        "productId" in err &&
        typeof (err as { productId?: unknown }).productId === "string"
      ) {
        setFailingProductId((err as { productId: string }).productId);
      } else {
        setFailingProductId(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = mounted && !done && items.length > 0;
  const showEmpty = mounted && !done && items.length === 0;

  return (
    <section className="bg-[#f5f1ea] py-6 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px] 2xl:px-12">
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6b625a] sm:mb-6 sm:text-sm"
        >
          <Link href="/home" className="underline-offset-4 hover:text-[#2a231f] hover:underline">
            Home
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <Link href="/cart" className="underline-offset-4 hover:text-[#2a231f] hover:underline">
            Your bag
          </Link>
          <FiChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-[#2a231f]">Checkout</span>
        </nav>

        {/* ORDER CONFIRMATION */}
        {done && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-[#e6e0d8] bg-white/60 p-6 text-center sm:p-10">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8b5e3c] text-white">
              <FiCheck className="h-7 w-7" />
            </span>
            <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.25em] text-[#8b5e3c] sm:text-[11px]">
              Order confirmed
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2a231f] sm:text-4xl">
              Thank you for your order
            </h1>
            <p className="mt-3 text-sm text-[#6b625a] sm:text-base">
              Your order <strong className="text-[#2a231f]">{done.orderNumber}</strong> has been
              placed. A confirmation will be sent to{" "}
              <strong className="text-[#2a231f]">{done.email}</strong>.
            </p>

            <ul className="mt-6 divide-y divide-[#e6e0d8] border-y border-[#e6e0d8] text-left">
              {done.items.map((i) => (
                <li key={i.key} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate text-[#2a231f]">
                    {i.name}
                    {i.note && <span className="text-[#9a9087]"> ({i.note})</span>}{" "}
                    <span className="text-[#9a9087]">× {i.qty}</span>
                  </span>
                  <span className="shrink-0 font-medium text-[#2a231f]">
                    {formatMoney(i.price * i.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between text-[15px] font-semibold text-[#2a231f]">
              <span>Total</span>
              <span>{formatMoney(done.total)}</span>
            </div>

            <Link
              href="/shop"
              className="mt-8 flex w-full items-center justify-center gap-2 bg-[#2d221c] py-4 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#8b5e3c]"
            >
              Continue shopping
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* HEADING */}
        {!done && (
          <>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#8b5e3c] sm:text-[11px]">
              Secure checkout
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#2a231f] sm:text-5xl 2xl:text-6xl">
              Complete your order
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6b625a] sm:mt-4 sm:text-base">
              Review your details with confidence. Every step is encrypted, and your selection is
              reserved while you complete checkout.
            </p>
          </>
        )}

        {/* LOADING */}
        {!mounted && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]" aria-busy="true">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-[#efe9e1]" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-[#efe9e1]" />
          </div>
        )}

        {/* EMPTY BAG */}
        {showEmpty && (
          <div className="mt-8 rounded-2xl border border-[#e6e0d8] bg-white/60 p-6 sm:p-8">
            <p className="flex flex-wrap items-center gap-2 text-sm text-[#4d453f] sm:text-base">
              <FiShoppingBag className="h-5 w-5 text-[#9a9087]" />
              Your bag is empty.
              <Link
                href="/cart"
                className="font-medium text-[#8b5e3c] underline underline-offset-4 hover:text-[#6f4a2e]"
              >
                Return to shopping bag
              </Link>
            </p>

            <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#2a231f]">
              Why shop with confidence
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {CONFIDENCE.map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-sm text-[#4d453f]">
                  <FiCheck className="h-4 w-4 shrink-0 text-[#8b5e3c]" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FORM + SUMMARY */}
        {showForm && (
          <form
            id="checkout-form"
            onSubmit={onSubmit}
            noValidate
            className="mt-8 grid items-start gap-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10"
          >
            <div className="space-y-5">
              {/* GUEST NOTICE */}
              {authStatus === "guest" && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-[#e8d9c9] bg-[#faf3ea] p-4 sm:p-5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8b5e3c]">
                    <FiUser className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2a231f]">Account required</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#4d453f]">
                      You are browsing as a guest. Please create an account or log in to place
                      your order. Your bag will be saved.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium uppercase tracking-[0.18em]">
                      <Link href={registerHref} className="text-[#8b5e3c] underline underline-offset-4 hover:text-[#6f4a2e]">
                        Create account
                      </Link>
                      <Link href={loginHref} className="text-[#2a231f] underline underline-offset-4 hover:text-[#8b5e3c]">
                        Log in
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. CONTACT */}
              <Section step={1} title="Contact">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="f-email" label="Email address" error={errors.email}>
                    <input
                      id="f-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={text("email")}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "f-email-error" : undefined}
                      className={inputCls(errors.email)}
                    />
                  </Field>
                  <Field id="f-phone" label="Phone number" error={errors.phone}>
                    <input
                      id="f-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="03XX XXXXXXX"
                      value={form.phone}
                      onChange={text("phone")}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "f-phone-error" : undefined}
                      className={inputCls(errors.phone)}
                    />
                  </Field>
                </div>
              </Section>

              {/* 2. SHIPPING ADDRESS */}
              <Section step={2} title="Shipping address">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="f-firstName" label="First name" error={errors.firstName}>
                    <input
                      id="f-firstName"
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={text("firstName")}
                      aria-invalid={!!errors.firstName}
                      className={inputCls(errors.firstName)}
                    />
                  </Field>
                  <Field id="f-lastName" label="Last name" error={errors.lastName}>
                    <input
                      id="f-lastName"
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={text("lastName")}
                      aria-invalid={!!errors.lastName}
                      className={inputCls(errors.lastName)}
                    />
                  </Field>
                  <Field id="f-address" label="Street address" error={errors.address} className="sm:col-span-2">
                    <input
                      id="f-address"
                      autoComplete="address-line1"
                      value={form.address}
                      onChange={text("address")}
                      aria-invalid={!!errors.address}
                      className={inputCls(errors.address)}
                    />
                  </Field>
                  <Field id="f-apartment" label="Apartment, suite, etc." optional className="sm:col-span-2">
                    <input
                      id="f-apartment"
                      autoComplete="address-line2"
                      value={form.apartment}
                      onChange={text("apartment")}
                      className={inputCls()}
                    />
                  </Field>
                  <Field id="f-city" label="City" error={errors.city}>
                    <input
                      id="f-city"
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={text("city")}
                      aria-invalid={!!errors.city}
                      className={inputCls(errors.city)}
                    />
                  </Field>
                  <Field id="f-state" label="Province / state" error={errors.state}>
                    <input
                      id="f-state"
                      autoComplete="address-level1"
                      value={form.state}
                      onChange={text("state")}
                      aria-invalid={!!errors.state}
                      className={inputCls(errors.state)}
                    />
                  </Field>
                  <Field id="f-postalCode" label="Postal code" error={errors.postalCode}>
                    <input
                      id="f-postalCode"
                      autoComplete="postal-code"
                      value={form.postalCode}
                      onChange={text("postalCode")}
                      aria-invalid={!!errors.postalCode}
                      className={inputCls(errors.postalCode)}
                    />
                  </Field>
                  <Field id="f-country" label="Country">
                    <select
                      id="f-country"
                      autoComplete="country-name"
                      value={form.country}
                      onChange={text("country")}
                      className={`${inputCls()} cursor-pointer`}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* 3. PAYMENT */}
              <Section step={3} title="Payment">
                <div role="radiogroup" aria-label="Payment method" className="grid gap-3">
                  {(
                    [
                      { v: "cod", title: "Cash on delivery", sub: "Pay when your order arrives." },
                      { v: "card", title: "Credit / debit card", sub: "Encrypted card payment." },
                    ] as const
                  ).map((o) => {
                    const on = form.payment === o.v;
                    return (
                      <label
                        key={o.v}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                          on ? "border-[#8b5e3c] bg-white" : "border-[#e6e0d8] bg-white/60 hover:border-[#d9d0c6]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={o.v}
                          checked={on}
                          onChange={() => set("payment")(o.v)}
                          className="mt-1 h-4 w-4 cursor-pointer accent-[#8b5e3c]"
                        />
                        <span>
                          <span className="block text-sm font-medium text-[#2a231f]">{o.title}</span>
                          <span className="mt-0.5 block text-xs text-[#6b625a]">{o.sub}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {form.payment === "card" && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field id="f-cardNumber" label="Card number" error={errors.cardNumber} className="sm:col-span-2">
                      <input
                        id="f-cardNumber"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="1234 5678 9012 3456"
                        value={form.cardNumber}
                        onChange={(e) =>
                          set("cardNumber")(
                            e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 19)
                              .replace(/(.{4})/g, "$1 ")
                              .trim()
                          )
                        }
                        aria-invalid={!!errors.cardNumber}
                        className={inputCls(errors.cardNumber)}
                      />
                    </Field>
                    <Field id="f-cardName" label="Name on card" error={errors.cardName} className="sm:col-span-2">
                      <input
                        id="f-cardName"
                        autoComplete="cc-name"
                        value={form.cardName}
                        onChange={text("cardName")}
                        aria-invalid={!!errors.cardName}
                        className={inputCls(errors.cardName)}
                      />
                    </Field>
                    <Field id="f-cardExpiry" label="Expiry (MM/YY)" error={errors.cardExpiry}>
                      <input
                        id="f-cardExpiry"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        value={form.cardExpiry}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                          set("cardExpiry")(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                        }}
                        aria-invalid={!!errors.cardExpiry}
                        className={inputCls(errors.cardExpiry)}
                      />
                    </Field>
                    <Field id="f-cardCvc" label="Security code" error={errors.cardCvc}>
                      <input
                        id="f-cardCvc"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="CVC"
                        value={form.cardCvc}
                        onChange={(e) => set("cardCvc")(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        aria-invalid={!!errors.cardCvc}
                        className={inputCls(errors.cardCvc)}
                      />
                    </Field>
                  </div>
                )}
              </Section>

              {/* 4. NOTES */}
              <Section step={4} title="Order notes">
                <Field id="f-notes" label="Delivery instructions" optional>
                  <textarea
                    id="f-notes"
                    rows={3}
                    placeholder="Floor, gate code, preferred delivery time…"
                    value={form.notes}
                    onChange={text("notes")}
                    className={`${inputCls()} resize-y`}
                  />
                </Field>
              </Section>
            </div>

            {/* ORDER SUMMARY */}
            <aside className="rounded-2xl border border-[#e6e0d8] bg-white/60 p-5 sm:p-6 lg:sticky lg:top-28">
              <h2 className="text-xl font-semibold text-[#2a231f] sm:text-2xl">Order summary</h2>

              <ul className="mt-5 max-h-72 divide-y divide-[#e6e0d8] overflow-y-auto">
                {items.map((i) => (
                  <li key={i.key} className="flex items-center gap-3 py-3">
                    <span className="relative block h-16 w-14 shrink-0 bg-[#f1ebe3]">
                      {i.image && (
                        <Image
                          src={i.image}
                          alt={i.name}
                          fill
                          unoptimized
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2d221c] px-1 text-[10px] font-medium text-white">
                        {i.qty}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-[#2a231f]">{i.name}</span>
                      {i.note && (
                        <span className="mt-0.5 block truncate text-xs text-[#6b625a]">{i.note}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-[#2a231f]">
                      {formatMoney(i.price * i.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl border border-[#efe9e1] bg-[#fdfcfa] p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-[#2a231f]">
                  {freeShipping && <FiCheck className="h-4 w-4 shrink-0" />}
                  {freeShipping
                    ? "Complimentary shipping unlocked"
                    : `Add ${formatMoney(FREE_SHIPPING_THRESHOLD - subtotal)} more for complimentary shipping`}
                </p>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#efe9e1]">
                  <div
                    className="h-full rounded-full bg-[#8b5e3c] transition-[width] duration-500"
                    style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>

              <dl className="mt-5 space-y-3.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#6b625a]">
                    Subtotal ({count} {count === 1 ? "piece" : "pieces"})
                  </dt>
                  <dd className="font-semibold text-[#2a231f]">{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#6b625a]">Estimated shipping</dt>
                  <dd className={freeShipping ? "text-[#2a231f]" : "font-semibold text-[#2a231f]"}>
                    {freeShipping ? "Complimentary" : formatMoney(shipping)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#6b625a]">Estimated tax</dt>
                  <dd className="text-[#2a231f]">{formatMoney(tax)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e6e0d8] pt-5">
                <span className="text-[15px] font-semibold text-[#2a231f]">Estimated total</span>
                <span className="text-lg font-semibold text-[#2a231f] sm:text-xl">
                  {formatMoney(total)}
                </span>
              </div>

              {/* Terms */}
              <div className="mt-5">
                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-[#4d453f] sm:text-[13px]">
                  <input
                    id="f-terms"
                    type="checkbox"
                    checked={form.terms}
                    onChange={(e) => set("terms")(e.target.checked)}
                    aria-invalid={!!errors.terms}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#8b5e3c]"
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/legal/terms" className="underline underline-offset-4 hover:text-[#8b5e3c]">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-[#8b5e3c]">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1.5 text-xs text-[#b3402f]" role="alert">
                    {errors.terms}
                  </p>
                )}
              </div>

              {submitError && (
                <div
                  className="mt-4 rounded-lg border border-[#e8c9c2] bg-[#fbf0ee] px-3.5 py-3 text-xs text-[#b3402f]"
                  role="alert"
                >
                  <p className="font-medium">{submitError}</p>
                  {failingProductId && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-[#e8c9c2]/60 pt-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const bad = items.find(
                            (i) =>
                              String(i.id).toLowerCase() ===
                              failingProductId.toLowerCase()
                          );
                          if (bad) {
                            removeItem(bad.key);
                            setSubmitError("");
                            setFailingProductId(null);
                            toast.info(`Removed "${bad.name}" from your bag.`);
                          }
                        }}
                        className="cursor-pointer font-semibold underline underline-offset-2 hover:text-[#8b5e3c]"
                      >
                        Remove item from bag
                      </button>
                      <Link
                        href={`/product/${failingProductId}`}
                        className="font-semibold underline underline-offset-2 hover:text-[#8b5e3c]"
                      >
                        Choose variations
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 bg-[#2d221c] py-4 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#8b5e3c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  "Placing order…"
                ) : (
                  <>
                    <FiLock className="h-4 w-4" />
                    Place order
                    <FiArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <Link
                href="/cart"
                className="mt-4 block text-center text-xs font-medium uppercase tracking-[0.2em] text-[#2a231f] transition hover:text-[#8b5e3c]"
              >
                Return to shopping bag
              </Link>

              <ul className="mt-6 space-y-2 border-t border-[#e6e0d8] pt-5">
                {CONFIDENCE.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-xs text-[#6b625a]">
                    <FiCheck className="h-3.5 w-3.5 shrink-0 text-[#8b5e3c]" />
                    {c}
                  </li>
                ))}
              </ul>
            </aside>
          </form>
        )}
      </div>
    </section>
  );
}