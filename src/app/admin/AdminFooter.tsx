export default function AdminFooter() {
  return (
    <footer className="h-14 mt-2 mb-3 bg-surface border-t border-border flex items-center justify-center px-4 sm:px-6 text-[11px] sm:text-xs text-muted text-center rounded-b-xl">
      © {new Date().getFullYear()} Nextcent. All rights reserved.
    </footer>
  );
}