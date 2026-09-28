import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import UsersTable from "../UsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const searchValues = await searchParams;
  const query = Array.isArray(searchValues.q)
    ? searchValues.q[0]?.trim() ?? ""
    : searchValues.q?.trim() ?? "";
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  await connectDB();

  const usersRaw = await User.find({
    role: "user",
    ...(escapedQuery
      ? {
          $or: [
            { name: { $regex: escapedQuery, $options: "i" } },
            { email: { $regex: escapedQuery, $options: "i" } },
          ],
        }
      : {}),
  })
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  const users = usersRaw.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-text mb-4 sm:mb-6">
        All Users
      </h2>
      <UsersTable users={users} />
    </div>
  );
}