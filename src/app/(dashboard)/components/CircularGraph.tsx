"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface CircularGraphProps {
  title: string;
  data: ChartData[];
  colors: string[];
  totalValue?: number;
  doneValue?: number;
}

const CircularGraph = ({ title, data, colors, totalValue, doneValue }: CircularGraphProps) => {
  const totalEntry = data.find(d => d.name.toLowerCase() === "total");
  const doneEntry = data.find(d => d.name.toLowerCase() === "done");
  
  // Use provided values or fall back to data entries
  const displayTotal = totalValue ?? totalEntry?.value ?? 0;
  const displayDone = doneValue ?? doneEntry?.value ?? 0;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      let label = data.name;
      if (label.toLowerCase() === "pending") {
        label = "Required";
      }
      return (
        <div className="bg-white p-2 rounded border border-gray-300 shadow">
          <p className="text-sm font-semibold text-gray-800">
            {label}: {data.value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-80 flex flex-col">
      <h3 className="text-lg font-semibold text-brand-blue mb-4">{title}</h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%" style={{ marginTop: '-1rem' }}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => {
                const isOverage =
                  totalEntry && doneEntry && doneEntry.value > totalEntry.value;
                const isSingleDone =
                  data.length === 1 && entry.name.toLowerCase() === "done";
                const isDone = entry.name.toLowerCase() === "done";

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      isOverage || isSingleDone
                        ? colors[1] // force orange when done exceeds total or only done slice
                        : isDone
                        ? colors[1] // orange for "Done"
                        : colors[0] // blue for "Pending" or others
                    }
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* custom legend showing Done and Required */}
        <div className="flex justify-center space-x-6" style={{ marginTop: '-1rem' }}>
          <div className="flex items-center space-x-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: colors[1] }}
            />
            <span className="text-sm text-gray-700">Done ({displayDone})</span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: colors[0] }}
            />
            <span className="text-sm text-gray-700">Required ({displayTotal})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CircularGraph;
