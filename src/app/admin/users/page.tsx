import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import UsersTable from "../UsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await connectDB();

  const usersRaw = await User.find({ role: "user" }) // admin explicitly excluded
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  const users = usersRaw.map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#263238] mb-4 sm:mb-6">
        All Users
      </h2>
      <UsersTable users={users} />
    </div>
  );
}