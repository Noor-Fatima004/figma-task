export default function AdminFooter() {
  return (
    <footer className="h-14 bg-white border-t border-gray-100 flex items-center justify-center px-4 sm:px-6 text-[11px] sm:text-xs text-[#717171] text-center">
      © {new Date().getFullYear()} Nextcent. All rights reserved.
    </footer>
  );
}