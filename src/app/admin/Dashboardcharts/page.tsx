"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SignupPoint {
  date: string;
  label: string;
  count: number;
}

interface DashboardChartsProps {
  signups: SignupPoint[];
  totalUsers: number;
  totalAdmins: number;
}

const COLORS = ["var(--theme-accent)", "var(--theme-primary)"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--theme-border)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  fontSize: 12,
};

export default function DashboardCharts({
  signups,
  totalUsers,
  totalAdmins,
}: DashboardChartsProps) {
  const total = totalUsers + totalAdmins;
  const pieData = [
    { name: "Users", value: totalUsers },
    { name: "Admins", value: totalAdmins },
  ];
  const percent = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* New signups — area chart */}
      <section className="lg:col-span-2 bg-surface rounded-theme border border-theme shadow-sm p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-text">
            New signups
          </h2>
          <p className="text-xs sm:text-sm text-muted">Last 30 days</p>
        </div>

        <div className="h-64 w-full ">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={signups}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--theme-border)"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--theme-muted)" }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--theme-muted)" }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "var(--theme-accent)", strokeOpacity: 0.2 }}
                formatter={(value) => [String(value), "New users"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--theme-accent)"
                strokeWidth={2.5}
                fill="url(#signupFill)"
                activeDot={{ r: 5, strokeWidth: 0, fill: "var(--theme-accent)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Users vs admins — donut */}
      <section className="bg-surface rounded-theme border border-theme shadow-sm p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-text">
            Accounts
          </h2>
          <p className="text-xs sm:text-sm text-muted">Users vs admins</p>
        </div>

        {total === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted">
            No accounts yet
          </div>
        ) : (
          <div className="relative h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={3}
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-semibold text-text">
                {total}
              </span>
              <span className="text-xs text-muted">Total</span>
            </div>
          </div>
        )}

        <ul className="mt-4 space-y-2.5">
          {pieData.map((item, i) => (
            <li key={item.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-text">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i] }}
                />
                {item.name}
              </span>
              <span className="text-muted">
                {item.value} · {percent(item.value)}%
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}