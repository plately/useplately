import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  MoreHorizontal, 
  Clock, 
  User,
  AlertTriangle,
  CheckCircle,
  Play,
  Check,
  Pause,
  RotateCcw,
  XCircle,
  GripVertical,
  Calendar,
  Flag,
  Archive,
  Trash2
} from 'lucide-react';

interface TaskNode {
  id: number;
  title: string;
  content: string;
  nodeType: string;
  status: "todo" | "in-progress" | "done" | "blocked" | "saved" | "archived";
  assignee?: number;
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: string;
  tags: string[];
  createdAt: Date;
  assignedUser?: {
    id: number;
    displayName: string;
    avatar?: string;
  }
}

interface ModernKanbanProps {
  tasks: TaskNode[];
  onTaskClick?: (task: TaskNode) => void;
  onCreateTask?: (status: string) => void;
}

const ModernKanban: React.FC<ModernKanbanProps> = ({ tasks, onTaskClick, onCreateTask }) => {
  const [draggedTask, setDraggedTask] = useState<TaskNode | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Group tasks by status
  const tasksByStatus = {
    todo: tasks.filter(task => task.status === "todo"),
    'in-progress': tasks.filter(task => task.status === "in-progress"),
    done: tasks.filter(task => task.status === "done"),
    blocked: tasks.filter(task => task.status === "blocked"),
    saved: tasks.filter(task => task.status === "saved")
  };

  // Column configurations
  const columns = [
    {
      id: 'todo',
      title: 'To Do',
      color: 'bg-slate-500',
      lightColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-600',
      icon: <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500"></div>
      </div>
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600',
      icon: <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-white"></div>
      </div>
    },
    {
      id: 'done',
      title: 'Done',
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-600',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />
    },
    {
      id: 'blocked',
      title: 'Blocked',
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-600',
      icon: <XCircle className="h-5 w-5 text-red-500" />
    },
    {
      id: 'saved',
      title: 'Save for Later',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600',
      icon: <div className="h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-white"></div>
      </div>
    }
  ];

  // Mutation to update task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number, status: string }) => {
      return await apiRequest(`/api/nodes/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          properties: { status }
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete task
  const deleteTask = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest(`/api/nodes/${taskId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    },
  });

  // Get priority color and icon
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "critical": 
        return { 
          color: "bg-red-500", 
          textColor: "text-red-600", 
          icon: <AlertTriangle className="h-3 w-3" />,
          label: "Critical"
        };
      case "high": 
        return { 
          color: "bg-orange-500", 
          textColor: "text-orange-600", 
          icon: <Flag className="h-3 w-3" />,
          label: "High"
        };
      case "medium": 
        return { 
          color: "bg-yellow-500", 
          textColor: "text-yellow-600", 
          icon: <Flag className="h-3 w-3" />,
          label: "Medium"
        };
      case "low": 
        return { 
          color: "bg-green-500", 
          textColor: "text-green-600", 
          icon: <Flag className="h-3 w-3" />,
          label: "Low"
        };
      default: 
        return { 
          color: "bg-gray-500", 
          textColor: "text-gray-600", 
          icon: <Flag className="h-3 w-3" />,
          label: "Unknown"
        };
    }
  };

  // Get days until due
  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get due date status
  const getDueDateStatus = (dueDate: string) => {
    const daysUntil = getDaysUntilDue(dueDate);
    if (daysUntil === null) return null;
    
    if (daysUntil < 0) return { color: 'text-red-600 bg-red-50', label: `${Math.abs(daysUntil)} days overdue` };
    if (daysUntil === 0) return { color: 'text-orange-600 bg-orange-50', label: 'Due today' };
    if (daysUntil === 1) return { color: 'text-yellow-600 bg-yellow-50', label: 'Due tomorrow' };
    if (daysUntil <= 7) return { color: 'text-blue-600 bg-blue-50', label: `${daysUntil} days left` };
    return { color: 'text-gray-600 bg-gray-50', label: `${daysUntil} days left` };
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: TaskNode) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTaskStatus.mutate({ taskId: draggedTask.id, status: newStatus });
    }
    setDraggedTask(null);
    setDraggedOver(null);
  };

  // Get quick action for task
  const getQuickAction = (task: TaskNode) => {
    switch (task.status) {
      case "todo":
        return {
          icon: <Play className="h-3 w-3" />,
          label: "Start",
          action: () => updateTaskStatus.mutate({ taskId: task.id, status: "in-progress" }),
          variant: "default" as const
        };
      case "in-progress":
        return {
          icon: <Check className="h-3 w-3" />,
          label: "Complete",
          action: () => updateTaskStatus.mutate({ taskId: task.id, status: "done" }),
          variant: "default" as const
        };
      case "done":
        return {
          icon: <RotateCcw className="h-3 w-3" />,
          label: "Reopen",
          action: () => updateTaskStatus.mutate({ taskId: task.id, status: "todo" }),
          variant: "outline" as const
        };
      case "blocked":
        return {
          icon: <Play className="h-3 w-3" />,
          label: "Unblock",
          action: () => updateTaskStatus.mutate({ taskId: task.id, status: "todo" }),
          variant: "default" as const
        };
      case "saved":
        return {
          icon: <Play className="h-3 w-3" />,
          label: "Start",
          action: () => updateTaskStatus.mutate({ taskId: task.id, status: "todo" }),
          variant: "default" as const
        };
      default:
        return null;
    }
  };

  // Render task card
  const renderTaskCard = (task: TaskNode) => {
    const priorityConfig = getPriorityConfig(task.priority);
    const dueDateStatus = task.dueDate ? getDueDateStatus(task.dueDate) : null;
    const quickAction = getQuickAction(task);

    return (
      <Card 
        key={task.id}
        className="mb-3 cursor-pointer hover:shadow-lg transition-all duration-200 group border-l-4 border-l-transparent hover:border-l-blue-400 bg-white dark:bg-gray-800"
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onClick={() => onTaskClick?.(task)}
      >
        <CardContent className="p-4">
          {/* Header with title and priority */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-5 mb-1 text-gray-900 dark:text-gray-100">
                {task.title}
              </h4>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-0.5 ${priorityConfig.textColor} bg-opacity-20`}
                >
                  {priorityConfig.icon}
                  <span className="ml-1">{priorityConfig.label}</span>
                </Badge>
                {task.nodeType && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {task.nodeType}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Quick action button - visible on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {quickAction && (
                <Button
                  variant={quickAction.variant}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    quickAction.action();
                  }}
                  title={quickAction.label}
                >
                  {quickAction.icon}
                </Button>
              )}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(task);
                  }}>
                    Edit Task
                  </DropdownMenuItem>
                  {task.status !== "saved" && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskStatus.mutate({ taskId: task.id, status: "saved" });
                      }}
                      className="text-purple-600"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Save for Later
                    </DropdownMenuItem>
                  )}
                  {task.status !== "blocked" && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskStatus.mutate({ taskId: task.id, status: "blocked" });
                      }}
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark as Blocked
                    </DropdownMenuItem>
                  )}
                  {task.status === "done" && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskStatus.mutate({ taskId: task.id, status: "archived" });
                      }}
                      className="text-gray-600"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Task
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask.mutate(task.id);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content preview */}
          {task.content && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {task.content}
            </p>
          )}

          {/* Footer with metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Due date */}
              {dueDateStatus && (
                <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${dueDateStatus.color}`}>
                  <Calendar className="h-3 w-3" />
                  {dueDateStatus.label}
                </div>
              )}
              
              {/* Tags */}
              {task.tags.length > 0 && (
                <div className="flex gap-1">
                  {task.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                      {tag}
                    </Badge>
                  ))}
                  {task.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      +{task.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Assignee */}
            {task.assignedUser && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignedUser.avatar} />
                <AvatarFallback className="text-xs font-medium">
                  {task.assignedUser.displayName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Drag handle */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full bg-background p-2 sm:p-4">
      {/* Mobile: Horizontal scroll; Desktop: Full width */}
      <div className="h-full flex gap-3 sm:gap-4 overflow-x-auto pb-4 mobile-scroll">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.id as keyof typeof tasksByStatus];
          const isActive = draggedOver === column.id;
          
          return (
            <div
              key={column.id}
              className={`
                flex-shrink-0 w-64 sm:w-72 bg-card rounded-lg shadow-sm border-2 transition-all duration-200 touch-manipulation
                ${isActive ? `${column.borderColor} bg-opacity-50` : 'border-border'}
              `}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-border ${column.lightColor} rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {column.icon}
                    <h3 className={`text-sm font-semibold ${column.textColor} truncate`}>
                      {column.title}
                    </h3>
                    <Badge variant="secondary" className="bg-card text-xs px-1.5 py-0.5 flex-shrink-0">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${column.textColor} hover:${column.lightColor}`}
                    onClick={() => onCreateTask?.(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Column Content */}
              <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/60">
                    <div className="mb-2 opacity-50">
                      {column.icon}
                    </div>
                    <p className="text-sm">No tasks</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => onCreateTask?.(column.id)}
                    >
                      Add first task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {columnTasks.map(renderTaskCard)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModernKanban;