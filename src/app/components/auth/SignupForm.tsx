"use client";
export const dynamic = "force-dynamic";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUser } from "react-icons/fa";
import { signupSchema, type SignupFormValues } from "@/lib/validations/auth";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (original file)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Image ko center-crop karke 256x256 JPEG me convert karta hai (chhota size, DB ke liye safe)
const resizeImage = (file: File, size = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Image processing is not supported"));
        return;
      }

      ctx.fillStyle = "#ffffff"; // transparent PNG ke liye white background
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image file"));
    };

    img.src = url;
  });

export default function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null); // optional profile image
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema) as Resolver<SignupFormValues>,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirm: "",
      agree: false,
    },
    mode: "onBlur",
  });

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG or WEBP images are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be smaller than 5MB");
      e.target.value = "";
      return;
    }

    try {
      const resized = await resizeImage(file);
      setAvatar(resized);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read image");
    } finally {
      e.target.value = ""; // same file dobara select ho sake
    }
  };

  const onSubmit = async (data: SignupFormValues): Promise<void> => {
    setServerError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          image: avatar ?? undefined, // optional
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const msg = result.error || "Something went wrong";
        setServerError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Account created successfully! Please login.");
      router.replace("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean): string =>
    `w-full px-3.5 sm:px-4 md:px-5 py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl border bg-[#F9FAFB] text-sm sm:text-[15px] md:text-base text-[#263238] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 transition ${
      hasError
        ? "border-red-400 focus:ring-red-400"
        : "border-gray-200 focus:ring-[#4CAF4F] focus:border-transparent"
    }`;

  const labelClass =
    "block text-xs sm:text-sm md:text-[15px] font-medium text-[#263238] mb-1.5 sm:mb-2";

  const errorClass =
    "text-[11px] sm:text-xs md:text-sm text-red-500 mt-1.5 sm:mt-2 leading-snug";

  return (
    <>
      {/* HEADER */}
      <div className="mb-6 sm:mb-8 md:mb-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-semibold text-[#263238] leading-tight">
          Create your account
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[#717171] mt-1.5 sm:mt-2 leading-relaxed">
          Start managing your community in minutes.
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
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm px-3.5 sm:px-4 py-3 rounded-lg">
            {serverError}
          </div>
        )}

        {/* Profile photo (optional) */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#F5F7FA] border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <FaUser className="w-7 h-7 text-[#9CA3AF]" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs sm:text-sm md:text-[15px] font-medium text-[#263238]">
              Profile photo <span className="text-[#9CA3AF] font-normal">(optional)</span>
            </p>
            <p className="text-[11px] sm:text-xs text-[#717171] mt-0.5">
              JPG, PNG or WEBP, up to 5MB
            </p>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs sm:text-sm font-medium text-[#4CAF4F] hover:text-[#388E3C] transition-colors"
              >
                {avatar ? "Change photo" : "Upload photo"}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="text-xs sm:text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Tim Smith"
            {...register("name")}
            className={inputClass(!!errors.name)}
          />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            className={inputClass(!!errors.email)}
          />
          {errors.email && <p className={errorClass}>{errors.email.message}</p>}
        </div>

        {/* Password + Confirm — stacked on mobile, side-by-side on larger */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 md:gap-5">
          {/* Password */}
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("password")}
                className={inputClass(!!errors.password) + " pr-14 sm:pr-16"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs md:text-sm font-medium text-[#4CAF4F] hover:text-[#388E3C] transition-colors"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className={errorClass}>{errors.password.message}</p>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label htmlFor="confirm" className={labelClass}>
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("confirm")}
                className={inputClass(!!errors.confirm) + " pr-14 sm:pr-16"}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs md:text-sm font-medium text-[#4CAF4F] hover:text-[#388E3C] transition-colors"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirm && (
              <p className={errorClass}>{errors.confirm.message}</p>
            )}
          </div>
        </div>

        {/* Terms */}
        <div>
          <label className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm md:text-[15px] text-[#717171] cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              {...register("agree")}
              className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border-gray-300 text-[#4CAF4F] focus:ring-[#4CAF4F] cursor-pointer"
            />
            <span className="leading-relaxed">
              I agree to the{" "}
              <a
                href="#"
                className="text-[#4CAF4F] hover:underline font-medium"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-[#4CAF4F] hover:underline font-medium"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {errors.agree && <p className={errorClass}>{errors.agree.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#4CAF4F] hover:bg-[#388E3C] active:scale-[0.99] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed text-white font-medium text-sm sm:text-[15px] md:text-base py-3 sm:py-3.5 md:py-4 px-4 rounded-lg sm:rounded-xl transition-all duration-300 shadow-md shadow-[#4CAF4F]/20"
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
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>

        {/* Switch to login */}
        <p className="text-center text-xs sm:text-sm md:text-[15px] text-[#717171] pt-1 sm:pt-2">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#4CAF4F] font-semibold hover:underline whitespace-nowrap"
          >
            Login
          </Link>
        </p>
      </form>
    </>
  );
}