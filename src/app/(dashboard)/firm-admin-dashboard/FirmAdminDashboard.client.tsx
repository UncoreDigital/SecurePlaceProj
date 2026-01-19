"use client";

import { useState } from "react";
import StatCard from "../components/StatCard";
import CircularGraph from "../components/CircularGraph";
import { Users, UserCheck, Siren } from "lucide-react";
import MonthlyEmergenciesChart from "../components/MonthlyEmergenciesChart";
import SafetyClassesTable from "../components/SafetyClassesTable";

// Define the colors for our charts
const COLORS = ["#001D49", "#FF5F15", "#F1F5F9", "#64748B"]; // Brand Blue, Orange, Slates

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ChartState {
  drills: ChartDataPoint[];
  workshops: ChartDataPoint[];
  compliance: ChartDataPoint[];
}

interface DashboardStats {
  employees: number;
  volunteers: number;
  emergencies: number;
}

interface DashboardData {
  stats: DashboardStats;
  chartData: ChartState;
  safetyClasses: any[];
  userFullName: string;
}

interface FirmAdminDashboardClientProps {
  initialDashboardData: DashboardData;
}

export default function FirmAdminDashboardClient({ 
  initialDashboardData
}: FirmAdminDashboardClientProps) {
  const [dashboardData] = useState<DashboardData>(initialDashboardData);

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-blue mb-6">
        Welcome, {dashboardData.userFullName}!
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Employees"
          value={dashboardData.stats.employees}
          icon={Users}
          href="/employees"
          change="+15"
          changeType="positive"
        />
        <StatCard
          title="Total Volunteers"
          value={dashboardData.stats.volunteers}
          icon={UserCheck}
          href="#"
          change="+2"
          changeType="positive"
        />
        <StatCard
          title="Total Emergencies"
          value={dashboardData.stats.emergencies}
          icon={Siren}
          href="/dashboard/emergencies"
          change="-1"
          changeType="negative"
        />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <CircularGraph
          title="Drill Alerts Status"
          data={dashboardData.chartData.drills}
          colors={COLORS}
        />
        <CircularGraph
          title="Workshop Types"
          data={dashboardData.chartData.workshops}
          colors={COLORS}
        />
        <CircularGraph
          title="Compliance Overview"
          data={dashboardData.chartData.compliance}
          colors={COLORS}
        />
      </div>

      <div className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <MonthlyEmergenciesChart />
        </div>
        <div className="lg:col-span-3">
          <SafetyClassesTable data={dashboardData.safetyClasses} />
        </div>
      </div>
    </div>
  );
}