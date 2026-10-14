"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { toast } from "sonner";
import { endGuestSession, startGuest } from "@/lib/guest";

// ?redirect= sirf apni site ke path par jaane do (//evil.com jaisa nahi)
const getSafeRedirect = (): string | null => {
  if (typeof window === "undefined") return null;
  const r = new URLSearchParams(window.location.search).get("redirect");
  return r && r.startsWith("/") && !r.startsWith("//") ? r : null;
};

// / aur khaali redirect ko /home bana do
const resolveTarget = (): string => {
  const safe = getSafeRedirect();
  return safe && safe !== "/" && safe !== "" ? safe : "/home";
};

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormValues>,
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginFormValues): Promise<void> => {
    setServerError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.remember,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const msg = result.error || "Invalid email or password";
        setServerError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Login successful");

      // Guest mode khatam (guest ka saved data merge ke liye bacha rehta hai)
      endGuestSession();

      // Guest order ke liye bheja gaya tha to wapas wahin (?redirect=), warna /home
      if (result.user?.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace(resolveTarget());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean): string =>
    `w-full px-3.5 sm:px-4 md:px-5 py-3 sm:py-3.5 md:py-4 rounded-sm border bg-[#F9FAFB] text-sm sm:text-[15px] md:text-base text-[#263238] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 transition ${
      hasError
        ? "border-red-300 focus:ring-red-400"
        : "border-gray-200 focus:ring-[#a17d62] focus:border-transparent"
    }`;

  return (
    <>
      {/* HEADER */}
      <div className="mb-6 sm:mb-8 md:mb-10">
        <p className="text-[#7f756c]">Welcome Back</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-[#263238] leading-tight">
          Sign in to your account
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[#7f756c] mt-1.5 sm:mt-2 leading-relaxed">
          Access your orders, saved pieces, and personal preferences.
        </p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 sm:space-y-5 md:space-y-6"
        noValidate
      >
        {/* Server error banner */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm px-3.5 sm:px-4 py-3 rounded-sm">
            {serverError}
          </div>
        )}

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs sm:text-sm md:text-[15px] font-medium text-[#263238] mb-1.5 sm:mb-2"
          >
            Email address <span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            className={`${inputClass(!!errors.email)} text-[#7f756c]`}
          />
          {errors.email && (
            <p className="text-[11px] sm:text-xs md:text-sm text-red-500 mt-1.5 sm:mt-2 leading-snug">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs sm:text-sm md:text-[15px] font-medium text-[#263238] mb-1.5 sm:mb-2"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className={`${inputClass(!!errors.password)} pr-14 sm:pr-16 text-[#7f756c]`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs md:text-sm font-medium text-[#896142] hover:text-[#a17d62] transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] sm:text-xs md:text-sm text-red-500 mt-1.5 sm:mt-2 leading-snug">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember + Forgot */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-3 text-xs sm:text-sm">
          <label className="flex items-center gap-2 text-[#717171] cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("remember")}
              className="w-4 h-4 rounded border-gray-300 text-[#4CAF4F] focus:ring-[#4CAF4F] cursor-pointer"
            />
            <span>
              Remember me
              <span className="block text-[10px] sm:text-xs text-[#896142]">
                Unchecked sessions end when all browser windows close, not when one tab closes.
              </span>
            </span>
          </label>
          <a
            href="#"
            className="text-[#896142] hover:underline font-medium w-fit"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#896142] hover:bg-[#915e37] active:scale-[0.99] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed text-white font-medium text-sm sm:text-[15px] md:text-base py-3 sm:py-3.5 md:py-4 px-4 rounded-lg sm:rounded-xl transition-all duration-300 shadow-md shadow-[#4CAF4F]/20"
        >
          {isLoading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              SIGNING IN...
            </span>
          ) : (
            "SIGN IN"
          )}
        </button>

        {/* Switch to signup */}
        <p className="text-center text-xs sm:text-sm md:text-[15px] text-[#717171] pt-1 sm:pt-2">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[#896142] font-semibold hover:underline whitespace-nowrap"
          >
            Sign up
          </Link>
        </p>

        {/* Continue as guest */}
        <p className="text-center text-xs sm:text-sm md:text-[15px]">
          <button
            type="button"
            onClick={() => {
              startGuest();
              router.replace(resolveTarget());
            }}
            className="cursor-pointer font-medium text-[#7f756c] underline underline-offset-4 transition-colors hover:text-[#896142]"
          >
            Continue as a guest
          </button>
        </p>
      </form>
    </>
  );
}