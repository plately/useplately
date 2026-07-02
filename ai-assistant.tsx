import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, isToday, isPast, isFuture, addDays, subDays } from "date-fns";
import {
  Plus,
  Filter,
  Search,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  User,
  Tag,
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit,
  Trash2,
  Link,
  MessageSquare,
  Timer,
  Target,
  TrendingUp,
  AlertTriangle,
  Archive,
  Star,
  Repeat,
  Share,
  Bell
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  startDate?: Date;
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  tags: string[];
  assignedTo?: number;
  createdBy: number;
  linkedNodes: number[];
  subtasks: number[];
  dependencies: number[];
  recurring?: 'daily' | 'weekly' | 'monthly';
  reminders: Date[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AdvancedTaskManagerProps {
  nodeId: number;
}

export default function AdvancedTaskManager({ nodeId }: AdvancedTaskManagerProps) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  
  // Create task form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: undefined as Date | undefined,
    estimatedTime: 60,
    tags: [] as string[],
    recurring: undefined as 'daily' | 'weekly' | 'monthly' | undefined
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks', nodeId],
  });

  // Fetch available tags
  const { data: availableTags = [] } = useQuery<string[]>({
    queryKey: ['/api/tasks/tags'],
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest('POST', '/api/tasks', taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsCreateOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: undefined,
        estimatedTime: 60,
        tags: [],
        recurring: undefined
      });
      toast({
        title: "Task created",
        description: "New task has been added successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to create task",
        description: "Please try again.",
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<Task>) => {
      return apiRequest('PATCH', `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully.",
      });
    }
  });

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      // Status filter
      if (filter === 'today' && (!task.dueDate || !isToday(task.dueDate))) return false;
      if (filter === 'overdue' && (!task.dueDate || !isPast(task.dueDate) || task.status === 'completed')) return false;
      if (filter === 'upcoming' && (!task.dueDate || !isFuture(task.dueDate))) return false;
      if (filter === 'completed' && task.status !== 'completed') return false;
      if (filter === 'active' && task.status === 'completed') return false;
      
      // Show completed filter
      if (!showCompleted && task.status === 'completed') return false;
      
      // Search filter
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !task.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Tags filter
      if (selectedTags.length > 0 && !selectedTags.some(tag => task.tags.includes(tag))) return false;
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Timer className="h-4 w-4 text-blue-600" />;
      case 'todo': return <Circle className="h-4 w-4 text-gray-400" />;
      case 'archived': return <Archive className="h-4 w-4 text-gray-400" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Handle task completion toggle
  const toggleTaskCompletion = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateTaskMutation.mutate({
      id: task.id,
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : undefined
    });
  };

  // Handle create task
  const handleCreateTask = () => {
    if (!newTask.title.trim()) return;

    createTaskMutation.mutate({
      ...newTask,
      nodeId,
      createdBy: 1, // Current user ID
      status: 'todo',
      linkedNodes: [nodeId]
    });
  };

  // Get task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueDate && isPast(t.dueDate) && t.status !== 'completed').length,
    today: tasks.filter(t => t.dueDate && isToday(t.dueDate)).length,
    thisWeek: tasks.filter(t => t.dueDate && t.dueDate >= new Date() && t.dueDate <= addDays(new Date(), 7)).length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Statistics */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Advanced Task Manager</h2>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Describe the task..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estimated Time (minutes)</label>
                      <Input
                        type="number"
                        value={newTask.estimatedTime}
                        onChange={(e) => setNewTask({ ...newTask, estimatedTime: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newTask.dueDate ? format(newTask.dueDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newTask.dueDate}
                          onSelect={(date) => setNewTask({ ...newTask, dueDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
            <div className="text-sm text-blue-600">Total Tasks</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
            <div className="text-sm text-red-600">Overdue</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{taskStats.today}</div>
            <div className="text-sm text-yellow-600">Due Today</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{taskStats.thisWeek}</div>
            <div className="text-sm text-purple-600">This Week</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <label htmlFor="show-completed" className="text-sm">Show completed</label>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                task.status === 'completed' ? 'bg-gray-50 opacity-75' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleTaskCompletion(task)}
                    className="mt-1"
                  >
                    {getStatusIcon(task.status)}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h3>
                      <Badge className={getPriorityColor(task.priority)}>
                        <Flag className="h-3 w-3 mr-1" />
                        {task.priority}
                      </Badge>
                      {task.recurring && (
                        <Badge variant="outline">
                          <Repeat className="h-3 w-3 mr-1" />
                          {task.recurring}
                        </Badge>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {task.dueDate && (
                        <div className={`flex items-center gap-1 ${
                          isPast(task.dueDate) && task.status !== 'completed' ? 'text-red-600' : ''
                        }`}>
                          <CalendarIcon className="h-3 w-3" />
                          {format(task.dueDate, 'MMM dd, yyyy')}
                        </div>
                      )}
                      
                      {task.estimatedTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(task.estimatedTime / 60)}h {task.estimatedTime % 60}m
                        </div>
                      )}
                      
                      {task.linkedNodes.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Link className="h-3 w-3" />
                          {task.linkedNodes.length} linked
                        </div>
                      )}
                    </div>
                    
                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500">Create a new task to get started with your project management.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}