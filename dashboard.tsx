import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Users,
  Clock,
  ListIcon,
  LayoutGrid,
  PenLine,
  FileText
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval, eachDayOfInterval } from "date-fns";
import { Node, InsertNode } from "@shared/schema";
import { useCreateNode } from "@/hooks/use-nodes";
import { queryClient } from "@/lib/queryClient";
import UniversalNodeCreator from "@/components/universal-node-creator";

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  nodeId?: number;
  attendees?: { id: number; name: string; avatar?: string }[];
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isViewNodeDialogOpen, setIsViewNodeDialogOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createNodeMutation = useCreateNode(queryClient);
  
  // Debug logging for dialog state
  console.log('Calendar render - isEventDetailsOpen:', isEventDetailsOpen, 'selectedEvent:', selectedEvent);
  
  // Query for calendar events
  const { data: calendarEvents, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar-events'],
    queryFn: async () => {
      // In a real app, this would fetch calendar events from the API
      return [
        {
          id: 4,
          title: "1:1 with Sarah",
          start: new Date(addDays(new Date(), 1).setHours(11, 0, 0, 0)),
          end: new Date(addDays(new Date(), 1).setHours(11, 30, 0, 0)),
          nodeId: 6,
          attendees: [
            { id: 1, name: "Sarah Johnson", avatar: undefined },
            { id: 2, name: "Alex Smith", avatar: undefined }
          ]
        },
        {
          id: 5,
          title: "Team Standup",
          start: new Date(new Date().setHours(9, 0, 0, 0)),
          end: new Date(new Date().setHours(9, 30, 0, 0)),
          attendees: [
            { id: 1, name: "Sarah Johnson" },
            { id: 2, name: "Alex Smith" },
            { id: 3, name: "Mike Brown" }
          ]
        }
      ];
    }
  });

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>
      
      <div className="flex-1 p-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Today's Events</h2>
            <div className="space-y-2">
              {calendarEvents?.map(event => (
                <div 
                  key={event.id}
                  className="p-3 border rounded cursor-pointer hover:bg-accent"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Event Details Dialog */}
      <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              <div>
                <strong>Date:</strong> {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
              </div>
              <div>
                <strong>Time:</strong> {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
              </div>
              {selectedEvent.attendees && (
                <div>
                  <strong>Attendees:</strong>
                  <ul className="list-disc list-inside">
                    {selectedEvent.attendees.map(attendee => (
                      <li key={attendee.id}>{attendee.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setIsEventDetailsOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}