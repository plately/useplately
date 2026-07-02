import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause
} from 'lucide-react';

interface Task {
  id: number;
  title: string;
  content?: string;
  nodeType: string;
  tags?: string[];
  createdAt: Date;
  properties: {
    status: "todo" | "in-progress" | "done" | "blocked";
    assignee: number;
    priority: "low" | "medium" | "high" | "critical";
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    completionPercentage?: number;
    dependencies?: number[];
  };
  assignedUser?: {
    id: number;
    displayName: string;
    avatar?: string;
  };
}

interface TaskTimelineProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onDateChange?: (date: Date) => void;
}

export default function TaskTimeline({ tasks, onTaskClick, onDateChange }: TaskTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('week');
  const [showCompleted, setShowCompleted] = useState(true);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    let start: Date, end: Date;
    
    switch (viewMode) {
      case 'week':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case 'month':
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3);
        start = new Date(currentDate.getFullYear(), quarter * 3, 1);
        end = new Date(currentDate.getFullYear(), (quarter + 1) * 3, 0);
        break;
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
    }
    
    return { start, end };
  }, [currentDate, viewMode]);

  const days = eachDayOfInterval(dateRange);

  // Filter and process tasks
  const processedTasks = useMemo(() => {
    return tasks
      .filter(task => showCompleted || task.properties.status !== 'done')
      .map(task => {
        const startDate = task.properties.startDate ? new Date(task.properties.startDate) : new Date(task.createdAt);
        const endDate = task.properties.dueDate ? new Date(task.properties.dueDate) : addDays(startDate, 1);
        
        return {
          ...task,
          startDate,
          endDate,
          duration: Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        };
      })
      .sort((a, b) => {
        // Sort by priority first, then by start date
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.properties.priority];
        const bPriority = priorityOrder[b.properties.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return a.startDate.getTime() - b.startDate.getTime();
      });
  }, [tasks, showCompleted]);

  const getTaskColor = (task: Task) => {
    switch (task.properties.priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress': return <Play className="h-4 w-4 text-blue-500" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Pause className="h-4 w-4 text-gray-500" />;
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date;
    
    switch (viewMode) {
      case 'week':
        newDate = direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7);
        break;
      case 'month':
        newDate = direction === 'next' 
          ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
          : new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        break;
      case 'quarter':
        newDate = direction === 'next'
          ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 1)
          : new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
        break;
      default:
        newDate = currentDate;
    }
    
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const getTaskPositionInDay = (task: any, day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const taskStart = new Date(Math.max(task.startDate.getTime(), dayStart.getTime()));
    const taskEnd = new Date(Math.min(task.endDate.getTime(), dayEnd.getTime()));

    if (taskStart > dayEnd || taskEnd < dayStart) {
      return null;
    }

    const totalDayMs = 24 * 60 * 60 * 1000;
    const startOffset = (taskStart.getTime() - dayStart.getTime()) / totalDayMs;
    const duration = (taskEnd.getTime() - taskStart.getTime()) / totalDayMs;

    return {
      top: `${startOffset * 100}%`,
      height: `${Math.max(duration * 100, 5)}%`
    };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="font-semibold min-w-[200px] text-center">
              {viewMode === 'week' && `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
              {viewMode === 'quarter' && `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border rounded-md">
            {(['week', 'month', 'quarter'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>

          <Button
            variant={showCompleted ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            Show Completed
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Task List Sidebar */}
          <div className="w-80 border-r bg-muted/30">
            <div className="p-3 border-b bg-background">
              <h3 className="font-semibold flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Tasks ({processedTasks.length})
              </h3>
            </div>
            
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-2 space-y-2">
                {processedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${getTaskColor(task)}`} />
                    
                    <CardContent className="p-3 pl-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1">
                            {getStatusIcon(task.properties.status)}
                            <span className="font-medium text-sm ml-2 truncate">
                              {task.title}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-xs text-muted-foreground mb-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(task.startDate, 'MMM d')}
                            {task.properties.dueDate && ` - ${format(task.endDate, 'MMM d')}`}
                          </div>

                          {task.properties.completionPercentage !== undefined && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{task.properties.completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${getTaskColor(task)}`}
                                  style={{ width: `${task.properties.completionPercentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            {task.assignedUser && (
                              <div className="flex items-center">
                                <Avatar className="h-5 w-5 mr-1">
                                  <AvatarImage src={task.assignedUser.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {task.assignedUser.displayName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate">
                                  {task.assignedUser.displayName}
                                </span>
                              </div>
                            )}
                            
                            <Badge
                              variant={
                                task.properties.priority === 'critical' ? 'destructive' :
                                task.properties.priority === 'high' ? 'default' :
                                task.properties.priority === 'medium' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {task.properties.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Timeline Grid */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              {/* Date Headers */}
              <div className="flex border-b bg-background sticky top-0 z-10">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="w-32 p-3 border-r text-center"
                  >
                    <div className="font-medium text-sm">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-primary font-bold' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(day, 'MMM')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Bars */}
              <div className="relative">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`absolute top-0 bottom-0 w-32 border-r ${
                      isSameDay(day, new Date()) ? 'bg-primary/5' : ''
                    }`}
                    style={{ left: `${days.indexOf(day) * 128}px` }}
                  />
                ))}

                <div className="space-y-2 p-2" style={{ height: `${Math.max(processedTasks.length * 60, 400)}px` }}>
                  {processedTasks.map((task, index) => {
                    const taskStartDay = days.findIndex(day => 
                      task.startDate <= day && day <= task.endDate
                    );
                    
                    if (taskStartDay === -1) return null;

                    const taskDuration = Math.min(
                      task.duration,
                      days.length - taskStartDay
                    );

                    return (
                      <TooltipProvider key={task.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute h-12 rounded-md ${getTaskColor(task)} opacity-80 hover:opacity-100 cursor-pointer transition-opacity flex items-center px-2 text-white text-sm font-medium shadow-sm`}
                              style={{
                                left: `${taskStartDay * 128 + 8}px`,
                                width: `${taskDuration * 128 - 16}px`,
                                top: `${index * 60 + 8}px`,
                              }}
                              onClick={() => onTaskClick?.(task)}
                            >
                              <div className="flex items-center min-w-0 flex-1">
                                {getStatusIcon(task.properties.status)}
                                <span className="ml-2 truncate">
                                  {task.title}
                                </span>
                                {task.properties.completionPercentage !== undefined && (
                                  <span className="ml-auto text-xs">
                                    {task.properties.completionPercentage}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-medium">{task.title}</div>
                              <div className="text-xs">
                                {format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')}
                              </div>
                              {task.assignedUser && (
                                <div className="text-xs">
                                  Assigned to: {task.assignedUser.displayName}
                                </div>
                              )}
                              {task.properties.estimatedHours && (
                                <div className="text-xs">
                                  Estimated: {task.properties.estimatedHours}h
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}