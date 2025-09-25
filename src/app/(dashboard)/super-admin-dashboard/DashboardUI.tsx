"use client";

import StatCard from "../components/StatCard";
import CircularGraph from "../components/CircularGraph";
import MonthlyEmergenciesChart from "../components/MonthlyEmergenciesChart";
import SafetyClassesTable from "../components/SafetyClassesTable";
import { Users, UserCheck, Siren } from "lucide-react";

const COLORS = ["#001D49", "#FF5F15", "#F1F5F9", "#64748B"];

// This component receives the data fetched on the server as props
export function DashboardUI({
  stats,
  chartData,
  userName,
}: {
  stats: any;
  chartData: any;
  userName: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-blue mb-6">
        Welcome, {userName}!
      </h1>
      {/* Stat Cards Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Employees"
          value={stats.employees}
          icon={Users}
          href="/dashboard/employees"
          change="+15"
          changeType="positive"
        />
        <StatCard
          title="Total Volunteers"
          value={stats.volunteers}
          icon={UserCheck}
          href="#"
          change="+2"
          changeType="positive"
        />
        <StatCard
          title="Total Emergencies"
          value={stats.emergencies}
          icon={Siren}
          href="/dashboard/emergencies"
          change="-1"
          changeType="negative"
        />
      </div>
      {/* Charts Section */}
      <div className="mt-8 grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <CircularGraph
          title="Drill Alerts Status"
          data={chartData.drills}
          colors={COLORS}
        />
        <CircularGraph
          title="Workshop Types"
          data={chartData.workshops}
          colors={COLORS}
        />
        <CircularGraph
          title="Compliance Overview"
          data={chartData.compliance}
          colors={COLORS}
        />
      </div>
      {/* Bottom Row Section */}
      <div className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <MonthlyEmergenciesChart />
        </div>
        <div className="lg:col-span-3">
          <SafetyClassesTable />
        </div>
      </div>
    </div>
  );
}
