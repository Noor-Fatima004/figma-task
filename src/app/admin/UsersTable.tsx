interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | Date;
}

export default function UsersTable({ users }: { users: UserRow[] }) {
  return (
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
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 sm:px-5 py-6 text-center text-[#717171]">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}