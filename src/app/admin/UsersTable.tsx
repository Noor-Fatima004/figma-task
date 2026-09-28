"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

  type ModalState =
  | { type: "add" }
  | { type: "edit"; user: UserRow }
  | { type: "view"; user: UserRow }
  | { type: "delete"; user: UserRow }
  | null;

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#263238] outline-none focus:border-gray-400";

export default function UsersTable({
  users,
  showActions = true,
}: {
  users: UserRow[];
  showActions?: boolean;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ user: UserRow; top: number; right: number } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    setMenu(null);
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
  if (modal?.type === "add")
    return request("/api/admin/users", "POST", form, "User added successfully");
  if (modal?.type === "edit")
    return request(`/api/admin/users/${modal.user._id}`, "PUT", form, "User updated successfully");
}

  const colCount = showActions ? 5 : 4;

  return (
    <>
      {showActions && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => openModal({ type: "add" })}
            className="bg-[#263238] text-white text-xs sm:text-sm px-4 py-2 rounded-lg hover:opacity-90"
          >
            + Add User
          </button>
        </div>
      )}

    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm min-w-[480px]">
          <thead className="bg-[#F9FAFB] text-[#717171] uppercase text-[10px] sm:text-xs">
            <tr>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3">Name</th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3">Email</th>
              <th className="px-3 sm:px-5 py-2.5 sm:py-3">Role</th>
              <th className="hidden sm:table-cell px-3 sm:px-5 py-2.5 sm:py-3">
                Joined
              </th>
              {showActions && <th className="px-3 sm:px-5 py-2.5 sm:py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 sm:px-5 py-6 text-center text-[#717171]">
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-t border-gray-100">
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-[#263238] whitespace-nowrap">
                    {u.name}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-[#263238] max-w-[160px] sm:max-w-none truncate">
                    {u.email}
                  </td>
                  <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                    <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-600">
                      {u.role}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-5 py-2.5 sm:py-3 text-[#717171] whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  {showActions && (
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-right">
                        <button
                          onClick={(e) => openMenu(e, u)}
                          aria-label="Actions"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-[#717171]"
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

      {menu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: menu.top, right: menu.right }}
          className="z-50 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm"
        >
          <button
            onClick={() => openModal({ type: "view", user: menu.user })}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[#263238]"
          >
            View Details
          </button>
          <button
            onClick={() => openModal({ type: "edit", user: menu.user })}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[#263238]"
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
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ADD / EDIT */}
            {(modal.type === "add" || modal.type === "edit") && (
              <form onSubmit={handleSave} className="space-y-4">
                <h3 className="text-lg font-semibold text-[#263238]">
                  {modal.type === "add" ? "Add New User" : "Edit User"}
                </h3>
                <div>
                  <label className="block text-xs text-[#717171] mb-1">Name</label>
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#717171] mb-1">Email</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#717171] mb-1">
                    Password {modal.type === "edit" && "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    className={inputCls}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={modal.type === "add"}
                    minLength={modal.type === "add" ? 6 : undefined}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-[#263238]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-lg bg-[#263238] text-white disabled:opacity-60"
                  >
                    {loading ? "Saving..." : modal.type === "add" ? "Add User" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* VIEW */}
            {modal.type === "view" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#263238]">User Details</h3>
                <dl className="text-sm space-y-3">
                  {[
                    ["Name", modal.user.name],
                    ["Email", modal.user.email],
                    ["Role", modal.user.role],
                    ["Joined", new Date(modal.user.createdAt).toLocaleString()],
                    ...(modal.user.updatedAt
                      ? [["Last updated", new Date(modal.user.updatedAt).toLocaleString()]]
                      : []),
                    ["User ID", modal.user._id],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-[#717171]">{label}</dt>
                      <dd className="text-[#263238] text-right break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm rounded-lg bg-[#263238] text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* DELETE */}
            {modal.type === "delete" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#263238]">Delete User</h3>
                <p className="text-sm text-[#717171]">
                  Are you sure you want to delete <b className="text-[#263238]">{modal.user.name}</b> (
                  {modal.user.email})? This action cannot be undone.
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-[#263238]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      request(`/api/admin/users/${modal.user._id}`, "DELETE", undefined, "User deleted successfully")
                    }
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-60"
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