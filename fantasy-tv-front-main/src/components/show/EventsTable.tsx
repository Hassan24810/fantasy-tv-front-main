import { useState } from "react";
import { Search, ArrowUpDown } from "lucide-react";
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

interface EventsTableProps {
  events: Event[];
}

export function EventsTable({ events }: EventsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = events.filter(
    (event) =>
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-xl bg-sidebar p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-sidebar-foreground">Events</h3>
          <p className="text-xs text-sidebar-foreground/60">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/40" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 w-48 bg-sidebar-accent border-sidebar-border text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40"
          />
        </div>
      </div>
      <div className="rounded-lg border border-sidebar-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent/50">
              <TableHead className="text-xs text-sidebar-foreground/60 font-medium">
                <div className="flex items-center gap-1 cursor-pointer">
                  No# <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs text-sidebar-foreground/60 font-medium">
                <div className="flex items-center gap-1 cursor-pointer">
                  Event Name <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs text-sidebar-foreground/60 font-medium">
                <div className="flex items-center gap-1 cursor-pointer">
                  Description <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs text-sidebar-foreground/60 font-medium">
                <div className="flex items-center gap-1 cursor-pointer">
                  Points <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-xs text-sidebar-foreground/60 font-medium">
                <div className="flex items-center gap-1 cursor-pointer">
                  Participants <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <TableRow key={event.id} className="border-sidebar-border hover:bg-sidebar-accent/30">
                  <TableCell className="text-sm text-sidebar-foreground">{event.number}</TableCell>
                  <TableCell className="text-sm text-sidebar-foreground">{event.name}</TableCell>
                  <TableCell className="text-sm text-sidebar-foreground/60 max-w-xs truncate">
                    {event.description}
                  </TableCell>
                  <TableCell className="text-sm text-sidebar-foreground">{event.points}</TableCell>
                  <TableCell className="text-sm text-sidebar-foreground">{event.participants}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sidebar-foreground/60 py-8">
                  No events found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
