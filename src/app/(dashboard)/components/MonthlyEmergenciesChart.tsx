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

interface EmergencyData {
  month: string;
  emergencies: number;
}

interface MonthlyEmergenciesChartProps {
  data?: EmergencyData[];
}

// Function to generate last 6 months data
const generateLast6MonthsData = (): EmergencyData[] => {
  const months = [];
  const now = new Date();
  
  // Generate last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    
    months.push({
      month: monthName,
      emergencies: 0, // Set to 0 for now as requested
    });
  }
  
  return months;
};

const MonthlyEmergenciesChart = ({ data }: MonthlyEmergenciesChartProps) => {
  // Use provided data or generate default last 6 months with 0 emergencies
  const chartData = data || generateLast6MonthsData();

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
            data={chartData}
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
