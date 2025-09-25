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

// Dummy data for the table
const classesData = [
  {
    courseName: "Workplace Safety Training: Pro...",
    type: "In-Person",
    duration: "15 Min",
    status: "Pending",
  },
  {
    courseName: "Workplace Safety Training: Pro...",
    type: "In-Person",
    duration: "50 Min",
    status: "Pending",
  },
  {
    courseName: "Workplace Safety Training: Pro...",
    type: "Remote",
    duration: "45 Min",
    status: "Approved",
  },
  {
    courseName: "Workplace Safety Training: Pro...",
    type: "Remote",
    duration: "45 Min",
    status: "Approved",
  },
  {
    courseName: "Workplace Safety Training: Pro...",
    type: "Remote",
    duration: "45 Min",
    status: "Approved",
  },
  {
    courseName: "Workplace Safety Training: Pro...",
    type: "Remote",
    duration: "45 Min",
    status: "Approved",
  },
];

const SafetyClassesTable = () => {
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
      <CardContent className="flex-grow">
        <Tabs defaultValue="completed">
          <TabsList>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
          <TabsContent value="completed" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classesData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.courseName}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.duration}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="upcoming">
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
