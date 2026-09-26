import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import UsersTable from "../UsersTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await connectDB();

  const [totalUsers, totalAdmins, recentUsersRaw] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "admin" }),
    User.find({ role: "user" }) // admin explicitly excluded
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const recentUsers = recentUsersRaw.map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#717171] uppercase font-medium">
            Total Users
          </p>
          <p className="text-2xl font-semibold text-[#263238] mt-1">
            {totalUsers}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-[#717171] uppercase font-medium">
            Admins
          </p>
          <p className="text-2xl font-semibold text-[#263238] mt-1">
            {totalAdmins}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-[#263238] mb-4">
          Recent Users
        </h2>
        <UsersTable users={recentUsers} />
      </div>
    </div>
  );
}