"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { addUserSchema, editUserSchema } from "@/lib/validations/auth";
import { LIMIT_OPTIONS } from "@/lib/pagination";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ModalState =
  | { type: "add" }
  | { type: "edit"; user: UserRow }
  | { type: "view"; user: UserRow }
  | { type: "adminAuth"; user: UserRow; from: "view" | "edit" }
  | { type: "delete"; user: UserRow }
  | null;

const inputCls =
  "w-full border border-border rounded-theme px-3 py-2 text-sm text-text bg-surface outline-none transition-colors hover:border-border-hover focus:border-primary-hover focus:ring-0";

const inputErrCls =
  "w-full border border-red-500 rounded-theme px-3 py-2 text-sm text-text bg-surface outline-none transition-colors hover:border-red-500 focus:border-red-500 focus:ring-0";

const selectCls =
  "border border-border rounded-theme px-2.5 py-1.5 text-xs sm:text-sm text-text bg-surface outline-none transition-colors hover:border-border-hover focus:border-primary-hover focus:ring-0 cursor-pointer";

const pageBtnCls =
  "px-3 py-1.5 text-xs sm:text-sm rounded-theme border border-border text-text bg-surface hover:bg-surface-hover hover:text-text-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-text transition-colors";

const smallBtnCls =
  "shrink-0 px-2.5 py-1 text-xs rounded-theme border border-border text-text hover:bg-surface-hover hover:text-text-hover transition-colors";

const iconBtnCls =
  "shrink-0 p-1.5 rounded-theme border border-border text-muted hover:text-text-hover hover:bg-surface-hover transition-colors";

function EyeIcon({ off = false }: { off?: boolean }) {
  return off ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function UsersTable({
  users,
  showActions = true,
  pagination,
}: {
  users: UserRow[];
  showActions?: boolean;
  pagination?: PaginationInfo;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [menu, setMenu] = useState<{ user: UserRow; top: number; right: number } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // password reveal states
  const [adminPw, setAdminPw] = useState("");
  const [revealedHash, setRevealedHash] = useState<string | null>(null); // verified hash (modal band hone tak yaad rahega)
  const [showHash, setShowHash] = useState(false); // sirf show/hide toggle
  const [showChange, setShowChange] = useState(false);
  const [newPw, setNewPw] = useState("");

  function resetPwState() {
    setAdminPw("");
    setRevealedHash(null);
    setShowHash(false);
    setShowChange(false);
    setNewPw("");
  }

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, user: UserRow) {
    e.stopPropagation();
    if (menu?.user._id === user._id) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ user, top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  function openModal(m: ModalState) {
    setError("");
    setFieldErrors({});
    setMenu(null);
    resetPwState();
    if (m?.type === "add") setForm({ name: "", email: "", password: "" });
    if (m?.type === "edit") setForm({ name: m.user.name, email: m.user.email, password: "" });
    setModal(m);

    // view details: latest data fetch (updatedAt ke saath)
    if (m?.type === "view") {
      fetch(`/api/admin/users/${m.user._id}`)
        .then((r) => r.json())
        .then((d) => d.user && setModal({ type: "view", user: d.user }))
        .catch(() => toast.error("Failed to load user details"));
    }
  }

  function closeModal() {
    if (loading) return;
    setModal(null);
    setError("");
    setFieldErrors({});
    resetPwState();
  }

  function askAdminPassword(user: UserRow, from: "view" | "edit") {
    setError("");
    setAdminPw("");
    setModal({ type: "adminAuth", user, from });
  }

  function handleEyeClick(user: UserRow, from: "view" | "edit") {
    if (revealedHash) {
      setShowHash(true);
    } else {
      askAdminPassword(user, from);
    }
  }

  // sirf hide karta hai, verified hash memory mein rehta hai
  function hidePassword() {
    setShowHash(false);
    setError("");
  }

  async function request(url: string, method: string, body?: object, successMsg?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Something went wrong";
        setError(msg);
        toast.error(msg);
        return false;
      }
      setModal(null);
      resetPwState();
      toast.success(successMsg || "Done successfully");
      router.refresh();
      return true;
    } catch {
      setError("Network error, please try again");
      toast.error("Network error, please try again");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const schema = modal?.type === "edit" ? editUserSchema : addUserSchema;
    const result = schema.safeParse(form);

    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message; // pehla error hi dikhao
      }
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    const data = result.data;
    if (modal?.type === "add")
      return request("/api/admin/users", "POST", data, "User added successfully");
    if (modal?.type === "edit")
      return request(`/api/admin/users/${modal.user._id}`, "PUT", data, "User updated successfully");
  }

  async function verifyAdminAndReveal(user: UserRow, from: "view" | "edit") {
    if (!adminPw.trim()) return setError("Enter your admin password");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user._id}/reveal-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: adminPw }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Incorrect admin password");
      if (!data.passwordHash) return setError("Password hash not available");
      setRevealedHash(data.passwordHash);
      setShowHash(true);
      setAdminPw("");
      setModal({ type: from, user });
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  function changePassword(user: UserRow) {
    const result = editUserSchema.safeParse({
      name: user.name,
      email: user.email,
      password: newPw,
    });
    if (!result.success) return setError(result.error.issues[0].message);
    request(`/api/admin/users/${user._id}`, "PUT", result.data, "Password updated successfully");
  }

  function setField(key: "name" | "email" | "password", value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((p) => ({ ...p, [key]: "" }));
  }

  function updateParams(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([k, v]) => params.set(k, v));
    router.push(`${pathname}?${params.toString()}`,{ scroll: false });
  }

  const colCount = showActions ? 5 : 4;
  const startIndex = pagination ? (pagination.page - 1) * pagination.limit : 0;

  return (
    <>
      {(pagination || showActions) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {pagination ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted">
              <span>Show</span>
              <select
                className={selectCls}
                value={pagination.limit}
                onChange={(e) => updateParams({ limit: e.target.value, page: "1" })}
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>rows</span>
            </div>
          ) : (
            <span />
          )}

          {showActions && (
            <button
              onClick={() => openModal({ type: "add" })}
              className="bg-primary text-white text-xs sm:text-sm px-4 py-2 rounded-theme hover:bg-primary-hover transition-colors"
            >
              + Add User
            </button>
          )}
        </div>
      )}

      <div className="bg-surface rounded-theme border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[480px]">
            <thead className="bg-background text-muted uppercase text-[10px] sm:text-xs">
              <tr>
                <th className="px-3 sm:px-5 py-2.5 sm:py-3 w-12">#</th>
                <th className="px-3 sm:px-5 py-2.5 sm:py-3">Name</th>
                <th className="px-3 sm:px-5 py-2.5 sm:py-3">Email</th>
                <th className="px-3 sm:px-5 py-2.5 sm:py-3">Role</th>
                <th className="hidden sm:table-cell px-3 sm:px-5 py-2.5 sm:py-3">Joined</th>
                {showActions && (
                  <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 sm:px-5 py-6 text-center text-muted">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((u,i) => (
                  <tr key={u._id} className="border-t border-border">
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-muted whitespace-nowrap">
                      {startIndex + i + 1}
                    </td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-text whitespace-nowrap">
                      {u.name}
                    </td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-text max-w-[160px] sm:max-w-none truncate">
                      {u.email}
                    </td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                      <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap bg-accent/10 text-primary">
                        {u.role}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-5 py-2.5 sm:py-3 text-muted whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    {showActions && (
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right">
                        <button
                          onClick={(e) => openMenu(e, u)}
                          aria-label="Actions"
                          className="p-1.5 rounded-theme hover:bg-background text-muted"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination footer */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
          <p className="text-xs sm:text-sm text-muted">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>

          <div className="flex items-center gap-2">
            <button
              className={`${pageBtnCls} !bg-primary !text-white !border-border hover:!bg-primary-hover disabled:!bg-background disabled:!text-muted disabled:!border-border`}
              disabled={pagination.page <= 1}
              onClick={() => updateParams({ page: String(pagination.page - 1) })}
            >
              Prev
            </button>
            <span className="text-xs sm:text-sm text-text px-1">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              className={`${pageBtnCls} !bg-primary !text-white !border-border hover:!bg-primary-hover disabled:!bg-background disabled:!text-muted disabled:!border-border`}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParams({ page: String(pagination.page + 1) })}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {menu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: menu.top, right: menu.right }}
          className="z-50 w-40 bg-surface rounded-theme shadow-lg border border-border py-1 text-sm"
        >
          <button
            onClick={() => openModal({ type: "view", user: menu.user })}
            className="w-full text-left px-4 py-2 hover:bg-background text-text"
          >
            View Details
          </button>
          <button
            onClick={() => openModal({ type: "edit", user: menu.user })}
            className="w-full text-left px-4 py-2 hover:bg-background text-text"
          >
            Edit
          </button>
          <button
            onClick={() => openModal({ type: "delete", user: menu.user })}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
          >
            Delete
          </button>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ADD / EDIT */}
            {(modal.type === "add" || modal.type === "edit") && (
              <form onSubmit={handleSave} noValidate className="space-y-4">
                <h3 className="text-lg font-semibold text-text">
                  {modal.type === "add" ? "Add New User" : "Edit User"}
                </h3>

                <div>
                  <label className="block text-xs text-muted mb-1">Name</label>
                  <input
                    className={fieldErrors.name ? inputErrCls : inputCls}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">Email</label>
                  <input
                    type="email"
                    className={fieldErrors.email ? inputErrCls : inputCls}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {/* ADD: normal password input */}
                {modal.type === "add" && (
                <div>
                  <label className="block text-xs text-muted mb-1">Password</label>
                  <input
                    type="password"
                    className={fieldErrors.password ? inputErrCls : inputCls}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>
              )}

                {/* EDIT: password locked behind admin verification */}
                {modal.type === "edit" && (
                  <div>
                    <label className="block text-xs text-muted mb-1">
                      Password {showHash && revealedHash && "(hashed)"}
                    </label>

                    <div className="flex items-start gap-2">
                      <div className="relative flex-1 min-w-0 border border-border rounded-theme px-3 py-2 pr-10 text-xs bg-background text-text font-mono break-all select-none">
                        {showHash && revealedHash ? revealedHash : "••••••••••"}
                        {showHash ? (
                          <button
                            type="button"
                            aria-label="Hide password"
                            title="Hide"
                            onClick={hidePassword}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-theme text-muted hover:text-text-hover hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <EyeIcon off />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Show password"
                            title={revealedHash ? "Show" : "Show (admin password required)"}
                            onClick={() => handleEyeClick(modal.user, "edit")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-theme text-muted hover:text-text-hover hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <EyeIcon />
                          </button>
                        )}
                      </div>

                      {showHash && revealedHash && (
                        <button
                          type="button"
                          aria-label="Copy hash"
                          onClick={() => {
                            navigator.clipboard.writeText(revealedHash);
                            toast.success("Hash copied");
                          }}
                          className={smallBtnCls + " !py-2"}
                        >
                          Copy
                        </button>
                      )}
                    </div>

                    {!revealedHash ? (
                      <p className="text-[11px] text-muted mt-1">
                        Password change karne ke liye eye icon dabao aur admin password do.
                      </p>
                    ) : (
                      <div className="mt-3">
                        <label className="block text-xs text-muted mb-1">
                          New password (leave blank to keep current)
                        </label>
                        <input
                          type="password"
                          className={fieldErrors.password ? inputErrCls : inputCls}
                          value={form.password}
                          onChange={(e) => setField("password", e.target.value)}
                        />
                        {fieldErrors.password && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm rounded-theme border border-border text-text hover:bg-surface-hover hover:text-text-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-theme bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
                  >
                    {loading ? "Saving..." : modal.type === "add" ? "Add User" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* VIEW */}
            {modal.type === "view" && (
              <div>
                {/* Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold uppercase">
                    {modal.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-text truncate">{modal.user.name}</h3>
                    <p className="text-xs text-muted truncate">{modal.user.email}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-accent/10 text-primary">
                    {modal.user.role}
                  </span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-theme border border-border bg-background p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted">Joined</p>
                    <p className="text-sm font-medium text-text mt-1">
                      {new Date(modal.user.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(modal.user.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="rounded-theme border border-border bg-background p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted">Last updated</p>
                    {modal.user.updatedAt ? (
                      <>
                        <p className="text-sm font-medium text-text mt-1">
                          {new Date(modal.user.updatedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted">
                          {new Date(modal.user.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted mt-1">—</p>
                    )}
                  </div>
                </div>

                {/* Password (hashed) */}
                <div className="mt-3 rounded-theme border border-border bg-background p-3">
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        Password {showHash && revealedHash && "(hashed)"}
                      </p>
                      <div className="relative mt-1 border border-border rounded-theme bg-surface px-3 py-2 pr-10">
                        <p className="text-xs text-text font-mono break-all">
                          {showHash && revealedHash ? revealedHash : "••••••••••"}
                        </p>
                        {showHash ? (
                          <button
                            type="button"
                            aria-label="Hide password"
                            title="Hide"
                            onClick={hidePassword}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-theme text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <EyeIcon off />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Show password"
                            title={revealedHash ? "Show" : "Show (admin password required)"}
                            onClick={() => handleEyeClick(modal.user, "view")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-theme text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <EyeIcon />
                          </button>
                        )}
                      </div>
                    </div>
                    {showHash && revealedHash && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(revealedHash);
                          toast.success("Hash copied");
                        }}
                        className={smallBtnCls}
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  {revealedHash && (
                    <div className="mt-3 pt-3 border-t border-border">
                      {!showChange ? (
                        <button
                          type="button"
                          onClick={() => setShowChange(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Change password
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="password"
                            placeholder="New password"
                            className={error ? inputErrCls : inputCls}
                            value={newPw}
                            onChange={(e) => {
                              setNewPw(e.target.value);
                              setError("");
                            }}
                          />
                          {error && <p className="text-xs text-red-600">{error}</p>}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowChange(false);
                                setNewPw("");
                                setError("");
                              }}
                              className="px-3 py-1.5 text-xs rounded-theme border border-border text-text"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => changePassword(modal.user)}
                              className="px-3 py-1.5 text-xs rounded-theme bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
                            >
                              {loading ? "Saving..." : "Update"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User ID */}
                <div className="mt-3 rounded-theme border border-border bg-background p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted">User ID</p>
                    <p className="text-xs text-text mt-1 font-mono truncate">{modal.user._id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(modal.user._id);
                      toast.success("User ID copied");
                    }}
                    className={smallBtnCls}
                  >
                    Copy
                  </button>
                </div>

                <div className="flex justify-end pt-5">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm rounded-theme bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* ADMIN AUTH (View aur Edit dono ke liye) */}
            {modal.type === "adminAuth" && (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyAdminAndReveal(modal.user, modal.from);
                }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-text">Confirm it's you</h3>
                <p className="text-sm text-muted">
                  Enter your admin password to view the password of{" "}
                  <b className="text-text">{modal.user.name}</b>.
                </p>
                <input
                  type="password"
                  autoFocus
                  placeholder="Admin password"
                  className={error ? inputErrCls : inputCls}
                  value={adminPw}
                  onChange={(e) => {
                    setAdminPw(e.target.value);
                    setError("");
                  }}
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPw("");
                      setError("");
                      setModal({ type: modal.from, user: modal.user });
                    }}
                    className="px-4 py-2 text-sm rounded-theme border border-border text-text hover:bg-surface-hover hover:text-text-hover transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-theme bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </form>
            )}

            {/* DELETE */}
            {modal.type === "delete" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text">Delete User</h3>
                <p className="text-sm text-muted">
                  Are you sure you want to delete{" "}
                  <b className="text-text">{modal.user.name}</b> ({modal.user.email})? This
                  action cannot be undone.
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm rounded-theme border border-border text-text hover:bg-surface-hover hover:text-text-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      request(
                        `/api/admin/users/${modal.user._id}`,
                        "DELETE",
                        undefined,
                        "User deleted successfully"
                      )
                    }
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-theme bg-red-600 text-white disabled:opacity-60"
                  >
                    {loading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}