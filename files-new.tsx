import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  FileText,
  Link
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval, eachDayOfInterval } from "date-fns";
import { Node, InsertNode } from "@shared/schema";
import { useCreateNode, useNodes } from "@/hooks/use-nodes";
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
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isViewNodeDialogOpen, setIsViewNodeDialogOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createAsNode, setCreateAsNode] = useState(false);
  const [linkToNode, setLinkToNode] = useState(false);
  const [selectedNodeToLink, setSelectedNodeToLink] = useState<number | null>(null);
  const [meetingPlatform, setMeetingPlatform] = useState<string>("");
  const [meetingLink, setMeetingLink] = useState<string>("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createNodeMutation = useCreateNode(queryClient);
  
  // Query for meeting nodes using proper useNodes hook
  const { data: meetingNodes, isLoading } = useNodes({ type: 'meeting' });
  
  // Query for users to map participant IDs to names
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users']
  });
  
  // Convert meeting nodes to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!meetingNodes) return [];
    
    const events: CalendarEvent[] = meetingNodes.map((node: any) => {
      // Parse dates from node properties or use defaults
      const baseDate = node.scheduledFor ? new Date(node.scheduledFor) : new Date();
      const startTime = node.properties?.startTime || "09:00";
      const endTime = node.properties?.endTime || "10:00";
      
      // Parse time strings into hours and minutes
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startDate = new Date(baseDate);
      startDate.setHours(startHour, startMin, 0, 0);
      
      const endDate = new Date(baseDate);
      endDate.setHours(endHour, endMin, 0, 0);
      
      // Map participant IDs to user objects with names
      const participantIds = node.properties?.participants || node.properties?.invitees || [];
      const attendees = participantIds.map((userId: number) => {
        const user = users.find(u => u.id === userId);
        return {
          id: userId,
          name: user?.username || user?.email || `User ${userId}`,
          avatar: user?.avatar
        };
      });
      
      return {
        id: node.id,
        title: node.title,
        start: startDate,
        end: endDate,
        nodeId: node.id,
        attendees: attendees
      };
    });
        
        // Add some default demo events for better UI
        const demoEvents: CalendarEvent[] = [
          {
            id: 1001,
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
            id: 1002,
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
        
        return [...events, ...demoEvents];
  }, [meetingNodes, users]);
  
  // Query for all nodes to enable linking
  const { data: allNodes } = useNodes();
  
  // Query for nodes associated with the selected date
  const { data: dateNodes, isLoading: isLoadingNodes } = useQuery<Node[]>({
    queryKey: ['/api/nodes', 'date', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        const response = await fetch('/api/nodes');
        if (!response.ok) {
          throw new Error('Failed to fetch nodes');
        }
        
        const allNodes = await response.json();
        
        return allNodes.filter((node: Node) => {
          if (!node.scheduledFor) return false;
          const nodeDate = new Date(node.scheduledFor).toISOString().split('T')[0];
          const selectedDateStr = selectedDate.toISOString().split('T')[0];
          return nodeDate === selectedDateStr;
        });
      } catch (error) {
        console.error('Error fetching nodes for date:', error);
        return [];
      }
    }
  });

  const selectedDayEvents = calendarEvents?.filter(event => 
    isSameDay(event.start, selectedDate)
  );

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i)
  );

  const weekHours = Array.from({ length: 24 }, (_, i) => i);

  const fetchNodeDetails = async (nodeId: number) => {
    try {
      const response = await fetch(`/api/nodes/${nodeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch node details');
      }
      const node = await response.json();
      setSelectedNode(node);
      setIsViewNodeDialogOpen(true);
    } catch (error) {
      console.error('Error fetching node details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch node details",
        variant: "destructive",
      });
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        {/* Mobile: Stack vertically, Desktop: Original layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 gap-4">
          {/* Title and Navigation Row (Mobile: Row, Desktop: Left side) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Calendar</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Manage your schedule and events
              </p>
            </div>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-2 sm:ml-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (viewMode === 'week') setSelectedDate(addDays(selectedDate, -7));
                  else if (viewMode === 'month') setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
                  else setSelectedDate(addDays(selectedDate, -1));
                }}
                className="h-9 px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-9 px-3 min-w-[60px]">
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (viewMode === 'week') setSelectedDate(addDays(selectedDate, 7));
                  else if (viewMode === 'month') setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
                  else setSelectedDate(addDays(selectedDate, 1));
                }}
                className="h-9 px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:block">
              {viewMode === 'week'
                ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`
                : viewMode === 'day'
                ? format(selectedDate, 'MMMM d, yyyy')
                : format(selectedDate, 'MMMM yyyy')}
            </span>
          </div>

          {/* View Tabs and New Event Button - Mobile: Full width row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "day" | "week" | "month")} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="day" className="px-4 py-2">Day</TabsTrigger>
                <TabsTrigger value="week" className="px-4 py-2">Week</TabsTrigger>
                <TabsTrigger value="month" className="px-4 py-2">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button onClick={() => setIsCreateEventOpen(true)} className="w-full sm:w-auto h-10">
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 p-6">
          <Tabs value={viewMode} className="h-full">
            <TabsContent value="day" className="h-full mt-0">
              <div className="h-full flex gap-4">
                {/* Main Day View */}
                <div className="flex-1 bg-card rounded-md border flex flex-col min-w-0">
                  {/* Day header */}
                  <div className="p-3 sm:p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-semibold">
                          <span className="hidden sm:inline">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                          <span className="sm:hidden">{format(selectedDate, 'MMM d, yyyy')}</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedDayEvents?.length || 0} scheduled events
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsCreateEventOpen(true)} className="w-full sm:w-auto">
                          <Plus className="h-4 w-4 mr-1" />
                          <span className="sm:hidden">Add</span>
                          <span className="hidden sm:inline">New Event</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Day view grid with scrollable timeline */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ height: 'calc(100% - 80px)' }}>
                    <div className="relative">
                      {/* Current time indicator */}
                      {isSameDay(selectedDate, new Date()) && (() => {
                        const now = new Date();
                        const currentHour = now.getHours();
                        const currentMinutes = now.getMinutes();
                        const totalMinutes = currentHour * 60 + currentMinutes;
                        const topPosition = (totalMinutes / (24 * 60)) * 100;
                        
                        return (
                          <div 
                            className="absolute left-0 right-0 z-30 pointer-events-none"
                            style={{ top: `${topPosition}%` }}
                          >
                            <div className="flex items-center">
                              <div className="w-12 sm:w-16 flex justify-end pr-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              </div>
                              <div className="flex-1 h-0.5 bg-red-500"></div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Time labels and grid */}
                      {weekHours.map(hour => (
                        <div key={hour} className="flex border-t border-border/50 hover:bg-accent/10 transition-colors">
                          <div className="w-12 sm:w-16 p-1 sm:p-2 text-[10px] sm:text-xs text-muted-foreground text-right border-r border-border flex-shrink-0">
                            <span className="font-medium">
                              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </span>
                          </div>
                          <div className="flex-1 h-16 sm:h-20 relative touch-manipulation">
                            {/* Events for this hour */}
                            {selectedDayEvents
                              ?.filter(event => {
                                const eventHour = event.start.getHours();
                                return eventHour === hour;
                              })
                              .map(event => {
                                const startMinutes = event.start.getMinutes();
                                const endHour = event.end.getHours();
                                const endMinutes = event.end.getMinutes();
                                const duration = (endHour - hour) * 60 + (endMinutes - startMinutes);
                                
                                const topPercent = (startMinutes / 60) * 100;
                                const heightInHours = duration / 60;
                                const heightPercent = heightInHours * 100;
                                
                                return (
                                  <div 
                                    key={event.id}
                                    className="absolute bg-blue-500/20 border-l-4 border-blue-500 rounded-md px-2 sm:px-3 py-2 overflow-hidden shadow-md hover:shadow-lg hover:bg-blue-500/30 transition-all cursor-pointer touch-manipulation z-20 backdrop-blur-sm"
                                    style={{
                                      top: `${topPercent}%`,
                                      height: `${Math.max(heightPercent, 25)}%`,
                                      width: 'calc(100% - 8px)',
                                      left: '4px'
                                    }}
                                    onClick={() => handleEventClick(event)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs sm:text-sm font-semibold truncate text-foreground">{event.title}</div>
                                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                          {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                                        </div>
                                      </div>
                                      {event.attendees && event.attendees.length > 0 && (
                                        <div className="flex-shrink-0">
                                          <div className="flex -space-x-1">
                                            {event.attendees.slice(0, 2).map((attendee, idx) => (
                                              <div
                                                key={idx}
                                                className="w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium"
                                                title={attendee.name || ''}
                                              >
                                                {attendee.name ? attendee.name.charAt(0) : '?'}
                                              </div>
                                            ))}
                                            {event.attendees.length > 2 && (
                                              <div className="w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium">
                                                +{event.attendees.length - 2}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Event List Sidebar */}
                <div className="hidden md:flex md:w-80 bg-card rounded-md border flex-col">
                  <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="font-semibold text-sm mb-1">Events for {format(selectedDate, 'MMM d')}</h3>
                    <p className="text-xs text-muted-foreground">{selectedDayEvents?.length || 0} total</p>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
                      {selectedDayEvents && selectedDayEvents.length > 0 ? (
                        selectedDayEvents
                          .sort((a, b) => a.start.getTime() - b.start.getTime())
                          .map(event => (
                            <Card 
                              key={event.id} 
                              className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-500"
                              onClick={() => handleEventClick(event)}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm truncate">{event.title}</h4>
                                  
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                    <span>{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</span>
                                  </div>
                                  
                                  {event.attendees && event.attendees.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <div className="flex -space-x-1">
                                        {event.attendees.slice(0, 3).map((attendee, idx) => (
                                          <div
                                            key={idx}
                                            className="w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium"
                                            title={attendee.name || ''}
                                          >
                                            {attendee.name ? attendee.name.charAt(0) : '?'}
                                          </div>
                                        ))}
                                        {event.attendees.length > 3 && (
                                          <div className="text-xs text-muted-foreground ml-2">
                                            +{event.attendees.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {event.nodeId && (
                                    <Badge variant="outline" className="text-[10px] bg-primary/10">
                                      <FileText className="h-2.5 w-2.5 mr-1" />
                                      Linked Node
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No events scheduled</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4"
                            onClick={() => setIsCreateEventOpen(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Event
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="week" className="h-full mt-0">
              <div className="h-full bg-card rounded-xl border border-border flex flex-col overflow-hidden">

                {/* ── Day column headers (time gutter + 7 days) ── */}
                <div className="flex-shrink-0 border-b border-border bg-muted/20" style={{ display: 'grid', gridTemplateColumns: '3rem repeat(7, 1fr)' }}>
                  {/* Time gutter spacer */}
                  <div className="border-r border-border" />
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={i} className={`py-3 px-1 text-center border-r last:border-r-0 border-border ${isToday ? 'bg-primary/5' : ''}`}>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {format(day, 'EEE')}
                        </p>
                        <div className={`text-sm font-bold h-7 w-7 flex items-center justify-center rounded-full mx-auto mt-1 ${
                          isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Scrollable time grid ── */}
                <div className="flex-1 overflow-y-auto">
                  <div style={{ display: 'grid', gridTemplateColumns: '3rem repeat(7, 1fr)' }}>

                    {/* Time labels column */}
                    <div className="border-r border-border bg-card sticky left-0 z-10">
                      {weekHours.map(hour => (
                        <div key={hour} className="h-16 border-t border-border/40 flex items-start justify-end pr-2 pt-1">
                          <span className="text-[10px] font-medium text-muted-foreground/60 -mt-[0.5em]">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day, dayIndex) => {
                      const isToday = isSameDay(day, new Date());
                      const dayEvents = (calendarEvents || []).filter(e => isSameDay(e.start, day));

                      return (
                        <div key={dayIndex} className={`border-r last:border-r-0 border-border relative ${isToday ? 'bg-primary/[0.025]' : ''}`}>
                          {/* Hour slots */}
                          {weekHours.map(hour => (
                            <div key={hour} className="h-16 border-t border-border/30 hover:bg-accent/20 transition-colors" />
                          ))}

                          {/* Events – absolutely positioned, pixel-perfect */}
                          {dayEvents.map((event, ei) => {
                            const startH = event.start.getHours();
                            const startM = event.start.getMinutes();
                            const endH   = event.end.getHours();
                            const endM   = event.end.getMinutes();
                            const topPx      = (startH * 60 + startM) / 60 * 64;
                            const durationM  = Math.max((endH * 60 + endM) - (startH * 60 + startM), 15);
                            const heightPx   = Math.max(durationM / 60 * 64, 28);

                            // Simple side-by-side overlap detection
                            const overlaps = dayEvents.filter((e2, ei2) =>
                              ei2 !== ei && e2.start < event.end && e2.end > event.start
                            );
                            const totalCols = overlaps.length + 1;
                            const colIdx = dayEvents.filter((e2, ei2) =>
                              ei2 < ei && e2.start < event.end && e2.end > event.start
                            ).length;
                            const pctW = 100 / totalCols;
                            const pctL = colIdx * pctW;

                            return (
                              <div
                                key={event.id}
                                className="absolute rounded-r-md border-l-[3px] border-primary bg-primary/15 hover:bg-primary/25 transition-colors cursor-pointer px-2 pt-1 pb-0.5 overflow-hidden"
                                style={{ top: `${topPx}px`, height: `${heightPx}px`, left: `${pctL}%`, width: `calc(${pctW}% - 3px)`, zIndex: 10 }}
                                onClick={() => handleEventClick(event)}
                              >
                                <p className="text-[11px] font-semibold text-primary truncate leading-tight">{event.title}</p>
                                {heightPx > 36 && (
                                  <p className="text-[9px] text-primary/70 truncate mt-0.5">{format(event.start, 'h:mm a')} – {format(event.end, 'h:mm a')}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </TabsContent>
            
            <TabsContent value="month" className="h-full mt-0">
              <div className="h-full flex flex-col">
                {/* Month header */}
                <div className="p-3 sm:p-4 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-semibold">
                        {format(selectedDate, 'MMMM yyyy')}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {calendarEvents?.filter(event => 
                          event.start.getMonth() === selectedDate.getMonth() && 
                          event.start.getFullYear() === selectedDate.getFullYear()
                        ).length || 0} events this month
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsCreateEventOpen(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-1" />
                        <span className="sm:hidden">Add</span>
                        <span className="hidden sm:inline">Add Event</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Calendar grid */}
                <div className="flex-1 overflow-auto">
                  <div className="h-full min-h-[600px]">
                    {/* Days of week header */}
                    <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                        <div key={day} className="p-2 sm:p-3 text-center border-r border-border last:border-r-0">
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                            <span className="hidden sm:inline">{day.slice(0, 3)}</span>
                            <span className="sm:hidden">{day.slice(0, 1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 h-full">
                      {eachDayOfInterval({
                        start: startOfWeek(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), { weekStartsOn: 1 }),
                        end: endOfWeek(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0), { weekStartsOn: 1 })
                      }).map((day, index) => {
                        const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                        const isToday = isSameDay(day, new Date());
                        const isSelected = isSameDay(day, selectedDate);
                        const dayEvents = calendarEvents?.filter(event => isSameDay(event.start, day)) || [];
                        
                        return (
                          <div
                            key={day.toISOString()}
                            className={`border-r border-b border-border last:border-r-0 min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 cursor-pointer transition-colors hover:bg-accent/30 touch-manipulation ${
                              !isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
                            } ${isSelected ? 'bg-primary/10 border-primary/20' : ''}`}
                            onClick={() => setSelectedDate(day)}
                          >
                            {/* Day number */}
                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                              <div
                                className={`text-xs sm:text-sm font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                                  isToday
                                    ? 'bg-primary text-primary-foreground'
                                    : isSelected
                                    ? 'bg-accent text-accent-foreground'
                                    : ''
                                }`}
                              >
                                {day.getDate()}
                              </div>
                              {dayEvents.length > 0 && (
                                <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-3 sm:h-4 px-1 py-0">
                                  {dayEvents.length}
                                </Badge>
                              )}
                            </div>

                            {/* Events */}
                            <div className="space-y-0.5 sm:space-y-1">
                              {dayEvents.slice(0, 3).map((event, eventIndex) => (
                                <div
                                  key={event.id}
                                  className={`text-[9px] sm:text-[10px] p-0.5 sm:p-1 rounded truncate cursor-pointer transition-colors touch-manipulation ${
                                    event.allDay
                                      ? 'bg-primary/20 text-primary-foreground/90 border border-primary/30'
                                      : 'bg-accent/60 text-accent-foreground hover:bg-accent'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                  title={`${event.title} ${!event.allDay ? `(${format(event.start, 'h:mm a')})` : ''}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="truncate">
                                      {!event.allDay && (
                                        <span className="font-medium mr-1 hidden sm:inline">
                                          {format(event.start, 'h:mm')}
                                        </span>
                                      )}
                                      {event.title}
                                    </span>
                                    {event.attendees && event.attendees.length > 0 && (
                                      <Users className="h-2 w-2 sm:h-2.5 sm:w-2.5 ml-0.5 sm:ml-1 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {dayEvents.length > 3 && (
                                <div className="text-[9px] sm:text-[10px] text-muted-foreground text-center py-0.5 sm:py-1">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right sidebar - Hidden on mobile, collapsible on tablet */}
        <div className="w-80 border-l border-border overflow-hidden hidden lg:flex flex-col bg-muted/20">
          {/* Mini Calendar Section */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">Calendar</h3>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs h-6 px-2">
                Today
              </Button>
            </div>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md w-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">Upcoming Events</h3>
              <Badge variant="secondary" className="text-xs">
                {calendarEvents?.filter(event => event.start >= new Date()).length || 0}
              </Badge>
            </div>
            
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-2">
                {calendarEvents
                  ?.filter(event => event.start >= new Date())
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .slice(0, 8)
                  .map(event => (
                    <Card 
                      key={event.id} 
                      className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] border-l-4 border-l-primary/20"
                      onClick={() => handleEventClick(event)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate mb-1">{event.title}</h4>
                            
                            <div className="flex items-center text-xs text-muted-foreground mb-1">
                              <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">
                                {format(event.start, 'MMM d, EEE')}
                              </span>
                            </div>
                            
                            {!event.allDay && (
                              <div className="flex items-center text-xs text-muted-foreground mb-2">
                                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span>{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</span>
                              </div>
                            )}
                            
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center">
                                <div className="flex -space-x-1 mr-2">
                                  {event.attendees.slice(0, 3).map((attendee, idx) => (
                                    <div
                                      key={attendee.id}
                                      className="w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium overflow-hidden"
                                      style={{ 
                                        backgroundImage: attendee.avatar ? `url(${attendee.avatar})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                      }}
                                    >
                                      {!attendee.avatar && (attendee.name ? attendee.name.charAt(0) : '?')}
                                    </div>
                                  ))}
                                </div>
                                {event.attendees.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{event.attendees.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-2 flex-shrink-0">
                            {event.nodeId && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10">
                                Node
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Event Overview</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-6 py-2">
              {/* Event Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{selectedEvent.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>{format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        {selectedEvent.allDay 
                          ? 'All day'
                          : `${format(selectedEvent.start, 'h:mm a')} - ${format(selectedEvent.end, 'h:mm a')}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
                {selectedEvent.nodeId && (
                  <Badge variant="outline" className="bg-primary/10">
                    <FileText className="h-3 w-3 mr-1" />
                    Node Event
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Event Duration & Time Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Start Time</h4>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="font-medium">{format(selectedEvent.start, 'h:mm a')}</div>
                    <div className="text-sm text-muted-foreground">{format(selectedEvent.start, 'EEEE, MMM d')}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">End Time</h4>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="font-medium">{format(selectedEvent.end, 'h:mm a')}</div>
                    <div className="text-sm text-muted-foreground">{format(selectedEvent.end, 'EEEE, MMM d')}</div>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Duration</h4>
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="font-medium">
                    {selectedEvent.allDay 
                      ? 'All day event'
                      : `${Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / (1000 * 60))} minutes`
                    }
                  </div>
                </div>
              </div>

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Attendees ({selectedEvent.attendees.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedEvent.attendees.map((attendee) => (
                      <div key={attendee.id} className="flex items-center gap-3 p-2 border rounded-md">
                        <div 
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-sm"
                          style={{
                            backgroundImage: attendee.avatar ? `url(${attendee.avatar})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {!attendee.avatar && (attendee.name ? attendee.name.charAt(0).toUpperCase() : '?')}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{attendee.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">Attendee</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEventDetailsOpen(false)}
                >
                  Close
                </Button>
                {selectedEvent.nodeId && (
                  <Button 
                    onClick={() => {
                      setIsEventDetailsOpen(false);
                      fetchNodeDetails(selectedEvent.nodeId!);
                    }}
                  >
                    View Node Details
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    setIsEventDetailsOpen(false);
                    setSelectedDate(selectedEvent.start);
                    setViewMode('day');
                  }}
                >
                  Go to Day View
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Node Details Dialog */}
      <Dialog open={isViewNodeDialogOpen} onOpenChange={setIsViewNodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Node Details</DialogTitle>
          </DialogHeader>
          
          {selectedNode && (
            <div className="space-y-4 py-2">
              <div className="flex items-center">
                <Badge variant="outline" className="capitalize mr-2">
                  {selectedNode.nodeType}
                </Badge>
                <h3 className="text-lg font-medium">{selectedNode.title}</h3>
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Created on {format(new Date(selectedNode.createdAt), 'MMMM d, yyyy')}</span>
                </div>
                {selectedNode.scheduledFor && (
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>Scheduled for {format(new Date(selectedNode.scheduledFor), 'MMMM d, yyyy')}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Meeting Link Section */}
              {(selectedNode.properties as any)?.meetingLink && (
                <>
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center">
                      <Link className="h-4 w-4 mr-2" />
                      Meeting Link
                    </h4>
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium mb-1 capitalize">
                            {(selectedNode.properties as any).meetingPlatform === 'zoom' && '🎥 Zoom Meeting'}
                            {(selectedNode.properties as any).meetingPlatform === 'teams' && '💼 Microsoft Teams'}
                            {(selectedNode.properties as any).meetingPlatform === 'meet' && '📹 Google Meet'}
                            {(selectedNode.properties as any).meetingPlatform === 'outlook' && '📧 Outlook/Skype'}
                            {(selectedNode.properties as any).meetingPlatform === 'custom' && '🔗 Custom Link'}
                            {!(selectedNode.properties as any).meetingPlatform && '🔗 Meeting Link'}
                          </div>
                          <a 
                            href={(selectedNode.properties as any).meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {(selectedNode.properties as any).meetingLink}
                          </a>
                        </div>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open((selectedNode.properties as any).meetingLink, '_blank');
                          }}
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              
              <div className="space-y-2">
                <h4 className="font-medium">Content</h4>
                <div className="p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                  {selectedNode.content || 'No content available'}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewNodeDialogOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setIsViewNodeDialogOpen(false);
                    navigate(`/journal?nodeId=${selectedNode.id}`);
                  }}
                >
                  Open in Editor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Topic/Title */}
            <div className="space-y-2">
              <Label htmlFor="event-title">Topic *</Label>
              <Input 
                id="event-title"
                placeholder="Enter meeting topic or event title"
                className="w-full"
              />
            </div>

            {/* Start and End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date & Time *</Label>
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(startDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(date: Date | undefined) => {
                          if (date) {
                            setStartDate(date);
                            // Auto-update end date to same day if it's before start date
                            if (endDate < date) {
                              setEndDate(date);
                            }
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input 
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>End Date & Time *</Label>
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(endDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date: Date | undefined) => date && setEndDate(date)}
                        disabled={(date: Date) => date < startDate}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input 
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="space-y-2">
              <Label htmlFor="meeting-link">Meeting Link</Label>
              <Select value={meetingPlatform} onValueChange={setMeetingPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting platform or add custom link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom Meeting</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="meet">Google Meet</SelectItem>
                  <SelectItem value="outlook">Outlook/Skype</SelectItem>
                  <SelectItem value="custom">Custom Link</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                id="meeting-link"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Enter meeting link (zoom.us/j/123456789, meet.google.com/xxx-xxx-xxx, etc.)"
                className="w-full mt-2"
              />
            </div>

            {/* Who to Invite */}
            <div className="space-y-2">
              <Label htmlFor="invitees">Who to Invite</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Enter email addresses (external people)"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm">
                    Add
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <div className="mb-2">Internal team members:</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      <Users className="h-3 w-3 mr-1" />
                      Sarah Johnson
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      <Users className="h-3 w-3 mr-1" />
                      Alex Smith
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      <Users className="h-3 w-3 mr-1" />
                      Mike Brown
                    </Badge>
                  </div>
                </div>

                <div className="border rounded-md p-3 bg-muted/20">
                  <div className="text-sm font-medium mb-2">Selected Attendees:</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• Sarah Johnson (internal)</div>
                    <div>• john@example.com (external - will receive email invitation)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea 
                id="event-description"
                placeholder="Meeting agenda, notes, or additional details..."
                rows={3}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Node Integration Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Node Integration</h4>
              
              {/* Create as Node option */}
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Create as Node</div>
                  <div className="text-xs text-muted-foreground">
                    Turn this event into a node that can be linked to other content
                  </div>
                </div>
                <Switch 
                  checked={createAsNode}
                  onCheckedChange={setCreateAsNode}
                />
              </div>

              {/* Link to existing Node option */}
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Link to Existing Node</div>
                  <div className="text-xs text-muted-foreground">
                    Connect this event to an existing node in your workspace
                  </div>
                </div>
                <Switch 
                  checked={linkToNode}
                  onCheckedChange={setLinkToNode}
                />
              </div>

              {/* Node Selection */}
              {linkToNode && (
                <div className="space-y-2">
                  <Label>Select Node to Link</Label>
                  <Select 
                    value={selectedNodeToLink?.toString() || ""}
                    onValueChange={(value) => setSelectedNodeToLink(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a node to link to this event..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-auto">
                      {allNodes?.map((node) => (
                        <SelectItem key={node.id} value={node.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {node.nodeType}
                            </Badge>
                            <span className="truncate">{node.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedNodeToLink && (
                    <div className="p-2 bg-muted/50 rounded border">
                      <div className="text-sm font-medium">Selected Node:</div>
                      <div className="text-xs text-muted-foreground">
                        {allNodes?.find(n => n.id === selectedNodeToLink)?.title}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {allNodes?.find(n => n.id === selectedNodeToLink)?.nodeType}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview of node integration */}
              {(createAsNode || linkToNode) && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="text-sm font-medium mb-1">
                    <Link className="h-4 w-4 inline mr-1" />
                    Node Integration Summary:
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {createAsNode && (
                      <div>• Event will be created as a meeting node in your workspace</div>
                    )}
                    {linkToNode && selectedNodeToLink && (
                      <div>• Event will be linked to "{allNodes?.find(n => n.id === selectedNodeToLink)?.title}"</div>
                    )}
                    <div>• You can view and edit connections in the Graph view</div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateEventOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={async () => {
                  console.log('Create Event button clicked');
                  try {
                    // Always create a meeting node (calendar gets data from nodes)
                    const eventTitle = (document.getElementById('event-title') as HTMLInputElement)?.value;
                    const eventDescription = (document.getElementById('event-description') as HTMLTextAreaElement)?.value;
                    
                    // Create proper date for scheduling
                    const scheduledDate = new Date(startDate);
                    const [startHour, startMin] = startTime.split(':').map(Number);
                    const [endHour, endMin] = endTime.split(':').map(Number);
                    scheduledDate.setHours(startHour, startMin, 0, 0);
                    
                    const nodeData = {
                      title: eventTitle || `Meeting - ${format(startDate, 'MMM d')}`,
                      content: eventDescription || "Meeting created from calendar event", 
                      nodeType: "meeting" as const,
                      scheduledFor: scheduledDate.toISOString(),
                      properties: {
                        startTime: startTime,
                        endTime: endTime,
                        meetingLink: meetingLink || null,
                        meetingPlatform: meetingPlatform || null
                      }
                    };
                    
                    console.log('Creating node with data:', nodeData);
                    
                    await createNodeMutation.mutateAsync(nodeData as any);
                    
                    console.log('Node created successfully');
                    
                    // Refresh calendar data
                    queryClient.invalidateQueries({ queryKey: ['/api/nodes', 'meeting'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
                    
                    toast({
                      title: "Event Created Successfully",
                      description: "Meeting event has been created successfully!",
                    });
                    
                    // Reset form state
                    setCreateAsNode(false);
                    setLinkToNode(false);
                    setSelectedNodeToLink(null);
                    setMeetingPlatform("");
                    setMeetingLink("");
                    setStartDate(new Date());
                    setEndDate(new Date());
                    setStartTime("09:00");
                    setEndTime("10:00");
                    setIsCreateEventOpen(false);
                    
                  } catch (error) {
                    console.error('Error creating event:', error);
                    toast({
                      title: "Error", 
                      description: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
                      variant: "destructive",
                    });
                  }
                }}
              >
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}