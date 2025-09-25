import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  change?: string; // e.g., "+5.2%"
  changeType?: "positive" | "negative";
  href: string; // The URL to navigate to on click
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  href,
}: StatCardProps) => {
  return (
    <Link href={href} className="group">
      <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-brand-blue">
            {title}
          </CardTitle>
          <div className="p-2 bg-slate-100 rounded-full group-hover:bg-brand-orange">
            <Icon className="h-5 w-5 text-brand-orange group-hover:text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-brand-blue">{value}</div>
          {change && (
            <p
              className={`text-xs mt-1 ${
                changeType === "positive" ? "text-green-600" : "text-red-600"
              }`}
            >
              {change} from last month
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default StatCard;
