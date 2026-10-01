import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { DEFAULT_LIMIT, LIMIT_OPTIONS } from "@/lib/pagination";
import UsersTable from "../UsersTable";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  // search (optional)
  const query = first(sp.q)?.trim() ?? "";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // limit: sirf allowed values
  const rawLimit = parseInt(first(sp.limit) ?? "", 10);
  const limit = (LIMIT_OPTIONS as readonly number[]).includes(rawLimit)
    ? rawLimit
    : DEFAULT_LIMIT;

  let page = Math.max(1, parseInt(first(sp.page) ?? "1", 10) || 1);

  const filter = {
    role: "user",
    ...(escaped
      ? {
          $or: [
            { name: { $regex: escaped, $options: "i" } },
            { email: { $regex: escaped, $options: "i" } },
          ],
        }
      : {}),
  };

  await connectDB();

  const total = await User.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  page = Math.min(page, totalPages);

  const usersRaw = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const users = usersRaw.map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text">Users</h1>
        <p className="text-sm text-muted">
          {query ? `Results for "${query}"` : "Manage all registered users."}
        </p>
      </div>

      <UsersTable
        users={users}
        pagination={{ page, limit, total, totalPages }}
      />
    </div>
  );
}