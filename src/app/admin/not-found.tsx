export default function AdminNotFound() {
  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <p className="text-6xl font-bold text-[#263238] mb-2">404</p>
        <h1 className="text-lg font-semibold text-[#263238] mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-[#717171] mb-6">
          Access denied or page does not exist.
        </p>
        <a
          href="/"
          className="inline-block bg-[#263238] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition"
        >
          Go to Home
        </a>
     </div>
    </div>
    </>
  );
}