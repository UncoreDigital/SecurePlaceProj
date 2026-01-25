"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SafetyClassesTableProps {
  data?: any[];
}

const SafetyClassesTable = ({ data = [] }: SafetyClassesTableProps) => {
  // Helper function to determine if a class is completed based on scheduled date
  const isClassCompleted = (scheduledDate: string | Date) => {
    if (!scheduledDate) return false;
    
    const classDate = new Date(scheduledDate);
    const today = new Date();
    
    // Set time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    classDate.setHours(0, 0, 0, 0);
    
    return classDate < today;
  };

  // Filter data into completed and upcoming based on scheduled date
  const completedClasses = data.filter(item => {
    const scheduledDate = item.scheduled_date || item.start_time || item.date;
    return isClassCompleted(scheduledDate);
  });

  const upcomingClasses = data.filter(item => {
    const scheduledDate = item.scheduled_date || item.start_time || item.date;
    return !isClassCompleted(scheduledDate);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
            {status}
          </Badge>
        );
      case "Approved":
        return (
          <Badge className="bg-green-500 text-white hover:bg-green-500">
            {status}
          </Badge>
        );
      case "Completed":
        return (
          <Badge className="bg-blue-500 text-white hover:bg-blue-500">
            {status}
          </Badge>
        );
      case "Upcoming":
        return (
          <Badge className="bg-orange-500 text-white hover:bg-orange-500">
            {status}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Helper function to render table content
  const renderTableContent = (classes: any[], showDateStatus = false) => (
    <div className="h-full overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10">
          <TableRow>
            <TableHead>Course Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Mode</TableHead>
            {showDateStatus && <TableHead>Date</TableHead>}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((item) => {
            const scheduledDate = item.scheduled_date || item.start_time || item.date;
            const isCompleted = isClassCompleted(scheduledDate);
            const dateStatus = isCompleted ? "Completed" : "Upcoming";
            
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.safety_class ? item.safety_class.title : item.title}
                </TableCell>
                <TableCell>
                  {item.safety_class ? item.safety_class.type : item.type}
                </TableCell>
                <TableCell>
                  {item.safety_class ? item.safety_class.duration_minutes : item.duration_minutes} Min
                </TableCell>
                <TableCell>
                  <Badge variant={(item?.safety_class?.mode === "Remote" || item.mode === "Remote") ? "secondary" : "default"}>
                    {item?.safety_class ? item?.safety_class?.mode : item?.mode}
                  </Badge>
                </TableCell>
                {showDateStatus && (
                  <TableCell>
                    {scheduledDate ? new Date(scheduledDate).toLocaleDateString() : '-'}
                  </TableCell>
                )}
                <TableCell>
                  {getStatusBadge(dateStatus)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-brand-blue">
          Safety Classes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <Tabs defaultValue="completed" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="completed">
              Completed ({completedClasses.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingClasses.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="completed" className="mt-4 flex-grow overflow-hidden">
            {completedClasses.length > 0 ? (
              renderTableContent(completedClasses, true)
            ) : (
              <p className="text-center text-slate-500 p-8">
                No completed classes found.
              </p>
            )}
          </TabsContent>
          <TabsContent value="upcoming" className="mt-4 flex-grow overflow-hidden">
            {upcomingClasses.length > 0 ? (
              renderTableContent(upcomingClasses, true)
            ) : (
              <p className="text-center text-slate-500 p-8">
                No upcoming classes scheduled.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SafetyClassesTable;
