import { useState } from "react";
import { Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Event {
  id: string;
  number: number;
  name: string;
  description: string;
  points: number;
  participants: number;
}

interface AdminEventsTableProps {
  events: Event[];
}

export function AdminEventsTable({ events }: AdminEventsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = events.filter(
    (event) =>
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasData = events.length > 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Recent Events</h3>
          <p className="text-slate-400 text-sm">Latest events recorded for this show</p>
        </div>
        {hasData && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400"
            />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-slate-600 font-semibold text-xs uppercase tracking-wider">No#</TableHead>
              <TableHead className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Event Name</TableHead>
              <TableHead className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Description</TableHead>
              <TableHead className="text-slate-600 font-semibold text-xs uppercase tracking-wider text-center">Points</TableHead>
              <TableHead className="text-slate-600 font-semibold text-xs uppercase tracking-wider text-center">Participants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasData ? (
              filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="text-slate-700 font-medium">{event.number}</TableCell>
                    <TableCell className="text-slate-900 font-medium">{event.name}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">{event.description}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                        {event.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                        {event.participants}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    No events match your search
                  </TableCell>
                </TableRow>
              )
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center text-slate-400">
                    <Calendar className="h-10 w-10 mb-3 text-slate-300" />
                    <p className="text-sm font-medium">No events recorded yet</p>
                    <p className="text-xs">Events will appear here once they are created</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
