"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dummy data for the bar chart
const data = [
  { month: "Mar", emergencies: 5 },
  { month: "Apr", emergencies: 7 },
  { month: "May", emergencies: 4 },
  { month: "Jun", emergencies: 8 },
  { month: "Jul", emergencies: 6 },
  { month: "Aug", emergencies: 10 },
];

const MonthlyEmergenciesChart = () => {
  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-brand-blue">
          Monthly Emergencies
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(241, 245, 249, 0.5)" }} />
            <Bar dataKey="emergencies" fill="#001D49" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlyEmergenciesChart;
