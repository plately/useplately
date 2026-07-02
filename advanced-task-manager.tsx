import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  CalendarIcon,
  Clock,
  Users,
  Link,
  Plus,
  X,
  AlertTriangle,
  Target,
  Timer,
  ListChecks,
  Flag,
  Paperclip
} from 'lucide-react';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  nodeType: z.literal('task'),
  tags: z.array(z.string()).default([]),
  properties: z.object({
    status: z.enum(['todo', 'in-progress', 'done', 'blocked', 'archived']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    assignee: z.number().optional(),
    dueDate: z.string().optional(),
    startDate: z.string().optional(),
    estimatedHours: z.number().min(0).optional(),
    actualHours: z.number().min(0).optional(),
    completionPercentage: z.number().min(0).max(100).default(0),
    dependencies: z.array(z.number()).default([]),
    subtasks: z.array(z.string()).default([]),
    recurring: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
    isTemplate: z.boolean().default(false),
    complexity: z.enum(['simple', 'moderate', 'complex']).default('moderate'),
  }),
  linkedNodes: z.array(z.number()).default([]),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface AdvancedTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task?: any;
  onSuccess?: () => void;
}

export default function AdvancedTaskForm({ isOpen, onClose, task, onSuccess }: AdvancedTaskFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      content: '',
      nodeType: 'task',
      tags: [],
      properties: {
        status: 'todo',
        priority: 'medium',
        assignee: undefined,
        dueDate: undefined,
        startDate: undefined,
        estimatedHours: undefined,
        actualHours: undefined,
        completionPercentage: 0,
        dependencies: [],
        subtasks: [],
        recurring: 'none',
        isTemplate: false,
        complexity: 'moderate',
      },
      linkedNodes: [],
    },
  });

  // Reset form when task changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: task?.title || '',
        content: task?.content || '',
        nodeType: 'task',
        tags: task?.tags || [],
        properties: {
          status: task?.properties?.status || 'todo',
          priority: task?.properties?.priority || 'medium',
          assignee: task?.properties?.assignee,
          dueDate: task?.properties?.dueDate,
          startDate: task?.properties?.startDate,
          estimatedHours: task?.properties?.estimatedHours,
          actualHours: task?.properties?.actualHours,
          completionPercentage: task?.properties?.completionPercentage || 0,
          dependencies: task?.properties?.dependencies || [],
          subtasks: task?.properties?.subtasks || [],
          recurring: task?.properties?.recurring || 'none',
          isTemplate: task?.properties?.isTemplate || false,
          complexity: task?.properties?.complexity || 'moderate',
        },
        linkedNodes: task?.linkedNodes || [],
      });
    }
  }, [task, isOpen, form]);

  // Fetch available users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      // Mock users data - in real app this would come from API
      return [
        { id: 1, displayName: "Alex Morgan", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
        { id: 2, displayName: "Sarah Kim", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
        { id: 3, displayName: "Michael Johnson", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" }
      ];
    }
  });

  // Fetch available tasks for dependencies
  const { data: availableTasks = [] } = useQuery({
    queryKey: ['/api/nodes', { type: 'task' }],
    queryFn: async () => {
      const response = await fetch('/api/nodes?type=task');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    }
  });

  // Fetch available nodes for linking
  const { data: availableNodes = [] } = useQuery({
    queryKey: ['/api/nodes'],
    queryFn: async () => {
      const response = await fetch('/api/nodes');
      if (!response.ok) throw new Error('Failed to fetch nodes');
      return response.json();
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      if (task) {
        return apiRequest(`/api/nodes/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest('/api/nodes', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      toast({
        title: task ? 'Task Updated' : 'Task Created',
        description: `Task "${form.getValues().title}" has been ${task ? 'updated' : 'created'} successfully.`,
      });
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addTag = () => {
    if (newTag.trim()) {
      const currentTags = form.getValues().tags;
      if (!currentTags.includes(newTag.trim())) {
        form.setValue('tags', [...currentTags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues().tags;
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      const currentSubtasks = form.getValues().properties.subtasks;
      form.setValue('properties.subtasks', [...currentSubtasks, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  const removeSubtask = (index: number) => {
    const currentSubtasks = form.getValues().properties.subtasks;
    form.setValue('properties.subtasks', currentSubtasks.filter((_, i) => i !== index));
  };

  const addDependency = (taskId: number) => {
    const currentDeps = form.getValues().properties.dependencies;
    if (!currentDeps.includes(taskId)) {
      form.setValue('properties.dependencies', [...currentDeps, taskId]);
    }
  };

  const removeDependency = (taskId: number) => {
    const currentDeps = form.getValues().properties.dependencies;
    form.setValue('properties.dependencies', currentDeps.filter(id => id !== taskId));
  };

  const onSubmit = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 border-red-500';
      case 'high': return 'text-orange-500 border-orange-500';
      case 'medium': return 'text-yellow-500 border-yellow-500';
      case 'low': return 'text-green-500 border-green-500';
      default: return 'text-gray-500 border-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ListChecks className="h-5 w-5 mr-2" />
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="relationships">Relationships</TabsTrigger>
              </TabsList>

              <div className="max-h-[60vh] overflow-y-auto">
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter task title..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the task in detail..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="properties.status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="properties.priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">
                                <div className="flex items-center">
                                  <Flag className="h-4 w-4 text-green-500 mr-2" />
                                  Low
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center">
                                  <Flag className="h-4 w-4 text-yellow-500 mr-2" />
                                  Medium
                                </div>
                              </SelectItem>
                              <SelectItem value="high">
                                <div className="flex items-center">
                                  <Flag className="h-4 w-4 text-orange-500 mr-2" />
                                  High
                                </div>
                              </SelectItem>
                              <SelectItem value="critical">
                                <div className="flex items-center">
                                  <Flag className="h-4 w-4 text-red-500 mr-2" />
                                  Critical
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="properties.assignee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                <div className="flex items-center">
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                                  </Avatar>
                                  {user.displayName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tags */}
                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.watch('tags').map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => removeTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scheduling" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="properties.startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a start date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="properties.dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Due Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a due date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="properties.estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="properties.actualHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="properties.completionPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Completion %</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="properties.recurring"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurring</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select recurrence" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Recurrence</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="properties.complexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complexity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select complexity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="simple">Simple</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="complex">Complex</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="properties.isTemplate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Save as Template</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              This task can be reused as a template for future tasks
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Subtasks */}
                  <div>
                    <Label className="flex items-center mb-2">
                      <ListChecks className="h-4 w-4 mr-2" />
                      Subtasks
                    </Label>
                    <div className="space-y-2 mb-3">
                      {form.watch('properties.subtasks').map((subtask, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{subtask}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubtask(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add subtask..."
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                      />
                      <Button type="button" variant="outline" onClick={addSubtask}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="relationships" className="space-y-4 mt-4">
                  {/* Dependencies */}
                  <div>
                    <Label className="flex items-center mb-2">
                      <Link className="h-4 w-4 mr-2" />
                      Dependencies
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select tasks that must be completed before this task can start
                    </p>
                    
                    <div className="space-y-2 mb-3">
                      {form.watch('properties.dependencies').map((depId) => {
                        const depTask = availableTasks.find((t: any) => t.id === depId);
                        return depTask ? (
                          <div key={depId} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{depTask.title}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDependency(depId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null;
                      })}
                    </div>

                    <ScrollArea className="h-32 border rounded p-2">
                      {availableTasks
                        .filter((t: any) => t.id !== task?.id && !form.watch('properties.dependencies').includes(t.id))
                        .map((availableTask: any) => (
                          <div
                            key={availableTask.id}
                            className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => addDependency(availableTask.id)}
                          >
                            <span className="text-sm">{availableTask.title}</span>
                            <Plus className="h-4 w-4" />
                          </div>
                        ))}
                    </ScrollArea>
                  </div>

                  <Separator />

                  {/* Linked Nodes */}
                  <div>
                    <Label className="flex items-center mb-2">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Linked Nodes
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Connect this task to other nodes in your workspace
                    </p>
                    
                    <ScrollArea className="h-32 border rounded p-2">
                      {availableNodes
                        .filter((node: any) => node.id !== task?.id)
                        .map((node: any) => (
                          <div
                            key={node.id}
                            className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                          >
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-2 ${
                                node.nodeType === 'journal' ? 'bg-blue-500' :
                                node.nodeType === 'document' ? 'bg-amber-500' :
                                node.nodeType === 'task' ? 'bg-green-500' : 'bg-gray-500'
                              }`} />
                              <span className="text-sm">{node.title}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {node.nodeType}
                            </Badge>
                          </div>
                        ))}
                    </ScrollArea>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? (
                  <>
                    <Timer className="h-4 w-4 mr-2 animate-spin" />
                    {task ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    {task ? 'Update Task' : 'Create Task'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}