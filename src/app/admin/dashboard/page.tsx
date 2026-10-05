import type { IconType } from "react-icons";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaUserPlus,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { LIMIT_OPTIONS } from "@/lib/pagination";
import UsersTable from "../UsersTable";
import DashboardCharts from "../Dashboardcharts/page";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 30;
const DASHBOARD_DEFAULT_LIMIT = 5;

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  trend,
  caption,
}: {
  label: string;
  value: number;
  icon: IconType;
  iconClass: string;
  trend?: number;
  caption?: string;
}) {
  const up = (trend ?? 0) >= 0;

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-muted font-medium">{label}</p>
          <p className="text-2xl sm:text-3xl font-semibold text-text mt-1.5">
            {value.toLocaleString()}
          </p>
        </div>
        <span
          className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconClass}`}
        >
          <Icon className="w-5 h-5" />
        </span>
      </div>

      <div className="flex items-center gap-2 mt-4 text-xs">
        {trend !== undefined && (
          <span
            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
              up ? "bg-primary-hover/10 text-primary-hover" : "bg-red-50 text-red-500"
            }`}
          >
            {up ? (
              <FaArrowUp className="w-2.5 h-2.5" />
            ) : (
              <FaArrowDown className="w-2.5 h-2.5" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
        {caption && <span className="text-muted">{caption}</span>}
      </div>
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  // search
  const query = first(sp.q)?.trim() ?? "";
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // pagination params
  const rawLimit = parseInt(first(sp.limit) ?? "", 10);
  const limit = (LIMIT_OPTIONS as readonly number[]).includes(rawLimit)
    ? rawLimit
    : DASHBOARD_DEFAULT_LIMIT;
  let page = Math.max(1, parseInt(first(sp.page) ?? "1", 10) || 1);

  // Chart window: last 30 days (UTC), including today
  const now = new Date();
  const startOfToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const since = new Date(startOfToday - (CHART_DAYS - 1) * DAY_MS);

  const usersFilter = {
    role: "user",
    ...(escapedQuery
      ? {
          $or: [
            { name: { $regex: escapedQuery, $options: "i" } },
            { email: { $regex: escapedQuery, $options: "i" } },
          ],
        }
      : {}),
  };

  await connectDB();

  const [totalUsers, totalAdmins, filteredTotal, signupRows] =
    await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments(usersFilter),
      User.aggregate<{ _id: string; count: number }>([
        { $match: { role: "user", createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));
  page = Math.min(page, totalPages);

  const recentUsersRaw = await User.find(usersFilter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const recentUsers = recentUsersRaw.map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));

  // Fill days with no signups with 0 so the chart line is continuous
  const countsByDay = new Map(signupRows.map((r) => [r._id, r.count]));
  const signups = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date(startOfToday - (CHART_DAYS - 1 - i) * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: countsByDay.get(key) ?? 0,
    };
  });

  const sum = (arr: { count: number }[]) =>
    arr.reduce((total, p) => total + p.count, 0);

  const newThisWeek = sum(signups.slice(-7));
  const prevWeek = sum(signups.slice(-14, -7));
  const newLast30Days = sum(signups);
  const weekTrend =
    prevWeek === 0
      ? newThisWeek > 0
        ? 100
        : 0
      : Math.round(((newThisWeek - prevWeek) / prevWeek) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text">
          Overview
        </h1>
        <p className="text-sm text-muted mt-1">
          Here&apos;s what&apos;s happening with your users.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Total users"
          value={totalUsers}
          icon={FaUsers}
          iconClass="bg-primary-hover/10 text-primary-hover"
          caption="All registered users"
        />
        <StatCard
          label="Admins"
          value={totalAdmins}
          icon={FaUserShield}
          iconClass="bg-secondary/10 text-secondary"
          caption="With admin access"
        />
        <StatCard
          label="New this week"
          value={newThisWeek}
          icon={FaUserPlus}
          iconClass="bg-background text-icon"
          trend={weekTrend}
          caption="vs previous 7 days"
        />
        <StatCard
          label="Last 30 days"
          value={newLast30Days}
          icon={FaCalendarAlt}
          iconClass="bg-accent/10 text-accent"
          caption="New signups"
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        signups={signups}
        totalUsers={totalUsers}
        totalAdmins={totalAdmins}
      />

      {/* Recent users */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-text">
            Recent users
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            {query ? `Results for "${query}"` : "Latest signups"}
          </p>
        </div>
        <UsersTable
          users={recentUsers}
          showActions={false}
          pagination={{ page, limit, total: filteredTotal, totalPages }}
        />
      </div>
    </div>
  );
}