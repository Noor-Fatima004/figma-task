import Link from "next/link";

export default function AdminNotFound() {
  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-surface rounded-theme shadow-sm p-8 max-w-md w-full text-center">
        <p className="text-6xl font-bold text-primary mb-2">404</p>
        <h1 className="text-lg font-semibold text-text mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-muted mb-6">
          Access denied or page does not exist.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-theme hover:opacity-90 transition"
        >
          Go to Home
        </Link>
     </div>
    </div>
    </>
  );
}