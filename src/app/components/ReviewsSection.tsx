"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaStar } from "react-icons/fa";

type PublicReview = {
  _id: string;
  name: string;
  productName: string;
  rating: number;
  review: string;
};

type FormState = {
  name: string;
  email: string;
  productName: string;
  rating: number;
  review: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  productName: "",
  rating: 0,
  review: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Website ka green (#4CAF4F) filled star, grey empty star
function Stars({ value, className = "h-3.5 w-3.5" }: { value: number; className?: string }) {
  return (
    <div className="flex items-center justify-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar
          key={n}
          className={`${className} ${n <= value ? "text-[#4CAF4F]" : "text-[#D9DBE1]"}`}
        />
      ))}
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-md border border-[#D9DBE1] bg-white px-3 py-2 text-xs sm:text-sm text-[#263238] placeholder-[#89939E] outline-none transition-colors focus:border-[#4CAF4F]";
const labelCls = "block text-xs sm:text-sm font-medium text-[#4D4D4D]";

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  // Approved reviews load
  useEffect(() => {
    fetch("/api/reviews", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setReviews(data.items ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email";
    if (!form.productName.trim()) e.productName = "Product name is required";
    if (!form.rating) e.rating = "Please select a rating";
    if (form.review.trim().length < 5) e.review = "Review must be at least 5 characters";
    return e;
  };

  const submit = async () => {
    if (saving) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fill all required fields correctly");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit review");
      toast.success("Thank you! Your review will appear after approval.");
      setForm(emptyForm);
      setErrors({});
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSaving(false);
    }
  };

  const err = (k: keyof FormState) =>
    errors[k] ? <p className="mt-1 text-xs text-red-500">{errors[k]}</p> : null;

  return (
    <section
      id="reviews"
      className="mx-auto my-6 flex w-full max-w-[1140px] h-auto flex-col gap-6 px-4 sm:px-8 md:px-12 lg:my-[33px] lg:px-0"
    >
      {/* Heading — Blog / Community section jaisa */}
      <div className="mx-auto my-3 flex w-full max-w-[600px] flex-col gap-2 text-center">
        <h2 className="h-auto w-full text-center text-lg font-semibold leading-snug text-[#4D4D4D] sm:text-xl md:text-2xl">
          What our customers say
        </h2>
        <p className="mx-auto h-auto w-full max-w-[437px] text-center text-xs font-normal leading-relaxed text-[#717171] sm:max-w-[637px] sm:text-sm">
          Read honest reviews from our community, or share your own experience with us.
        </p>
      </div>

      {/* Approved reviews — Community cards jaise white cards */}
      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:px-[100px]">
        {loading ? (
          <p className="col-span-full text-center text-xs text-[#717171] sm:text-sm">
            Loading reviews...
          </p>
        ) : reviews.length === 0 ? (
          <p className="col-span-full text-center text-xs text-[#717171] sm:text-sm">
            No reviews yet. Be the first to review!
          </p>
        ) : (
          reviews.map((r) => (
            <div
              key={r._id}
              className="mx-auto flex h-auto w-[85%] flex-col items-center gap-3 rounded-md bg-white px-5 py-5 shadow-[0px_2px_4px_0px_#ABBED133] transition-shadow duration-300 hover:shadow-[0px_4px_10px_0px_#ABBED180] sm:w-full"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4CAF4F] text-base font-semibold text-white sm:h-14 sm:w-14">
                {r.name.trim().charAt(0).toUpperCase() || "U"}
              </span>

              <Stars value={r.rating} />

              <p className="h-auto w-full break-words text-center text-xs font-normal leading-relaxed text-[#717171] sm:text-sm">
                {r.review}
              </p>

              <div className="mt-auto flex w-full flex-col items-center gap-1 pt-1">
                <h3 className="w-full truncate text-center text-sm font-semibold leading-[19px] text-[#4CAF4F]">
                  {r.name}
                </h3>
                <p className="w-full truncate text-center text-xs font-normal leading-[17px] text-[#89939E]">
                  {r.productName}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review form — Blog ke overlay card jaisa #F5F7FA card */}
      <div className=" mt-4 w-full rounded-md bg-[#F5F7FA] p-5 shadow-[0px_5.57px_11.14px_0px_#ABBED166] sm:p-6">
        <h3 className="text-base font-bold leading-snug text-[#4D4D4D] sm:text-lg">
          Write a review
        </h3>
        <p className="mt-1 text-xs font-normal leading-relaxed text-[#717171] sm:text-sm">
          Your review will appear on the website after approval.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Your Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter your name"
              maxLength={80}
              className={inputCls}
            />
            {err("name")}
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Enter your email"
              maxLength={120}
              className={inputCls}
            />
            {err("email")}
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Product Name</label>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => set("productName", e.target.value)}
              placeholder="Which product are you reviewing?"
              maxLength={120}
              className={inputCls}
            />
            {err("productName")}
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Rating</label>
            <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => set("rating", n)}
                  className="p-0.5"
                >
                  <FaStar
                    className={`h-5 w-5 transition-colors sm:h-6 sm:w-6 ${
                      n <= (hover || form.rating) ? "text-[#4CAF4F]" : "text-[#D9DBE1]"
                    }`}
                  />
                </button>
              ))}
            </div>
            {err("rating")}
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Your Review</label>
            <textarea
              value={form.review}
              onChange={(e) => set("review", e.target.value)}
              placeholder="Write your review"
              rows={4}
              maxLength={1000}
              className={inputCls}
            />
            {err("review")}
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="mt-5 w-fit rounded-[3px] bg-[#4CAF4F] px-6 py-2 text-sm text-white transition-colors hover:bg-[#388E3C] disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </section>
  );
}