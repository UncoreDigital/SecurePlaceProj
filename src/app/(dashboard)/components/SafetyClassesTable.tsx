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
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
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
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
          <TabsContent value="completed" className="mt-4 flex-grow overflow-hidden">
            {data.length > 0 ? (
              <div className="h-full overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Mode</TableHead>
                      {/* <TableHead>Status</TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.safety_class ? item.safety_class.title : item.title}</TableCell>
                        <TableCell>{item.safety_class ? item.safety_class.type : item.type}</TableCell>
                        <TableCell>{item.safety_class ? item.safety_class.duration_minutes: item.duration_minutes} Min</TableCell>
                        <TableCell>
                          {/* {getStatusBadge(item.status)} */}
                          <Badge variant={(item?.safety_class?.mode === "Remote" || item.mode) ? "secondary" : "default"}>
                            {item?.safety_class ? item?.safety_class?.mode : item?.mode}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-slate-500 p-8">
                No classes found.
              </p>
            )}
          </TabsContent>
          <TabsContent value="upcoming" className="mt-4 flex-grow">
            <p className="text-center text-slate-500 p-8">
              No upcoming classes scheduled.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SafetyClassesTable;
