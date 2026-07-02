import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Activity
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
    actualHours?: number;
    completionPercentage?: number;
  };
  assignedUser?: {
    id: number;
    displayName: string;
    avatar?: string;
  };
}

interface TaskAnalyticsProps {
  tasks: Task[];
}

export default function TaskAnalytics({ tasks }: TaskAnalyticsProps) {
  const analytics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.properties.status === 'done').length;
    const inProgress = tasks.filter(t => t.properties.status === 'in-progress').length;
    const blocked = tasks.filter(t => t.properties.status === 'blocked').length;
    const todo = tasks.filter(t => t.properties.status === 'todo').length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Priority distribution
    const priorityData = [
      { name: 'Critical', value: tasks.filter(t => t.properties.priority === 'critical').length, color: '#ef4444' },
      { name: 'High', value: tasks.filter(t => t.properties.priority === 'high').length, color: '#f97316' },
      { name: 'Medium', value: tasks.filter(t => t.properties.priority === 'medium').length, color: '#eab308' },
      { name: 'Low', value: tasks.filter(t => t.properties.priority === 'low').length, color: '#22c55e' },
    ];

    // Status distribution
    const statusData = [
      { name: 'To Do', value: todo, color: '#6b7280' },
      { name: 'In Progress', value: inProgress, color: '#3b82f6' },
      { name: 'Done', value: completed, color: '#22c55e' },
      { name: 'Blocked', value: blocked, color: '#ef4444' },
    ];

    // User workload
    const userWorkload = tasks.reduce((acc, task) => {
      if (task.assignedUser) {
        const userId = task.assignedUser.id;
        if (!acc[userId]) {
          acc[userId] = {
            user: task.assignedUser,
            total: 0,
            completed: 0,
            inProgress: 0,
            blocked: 0,
          };
        }
        acc[userId].total++;
        if (task.properties.status === 'done') acc[userId].completed++;
        if (task.properties.status === 'in-progress') acc[userId].inProgress++;
        if (task.properties.status === 'blocked') acc[userId].blocked++;
      }
      return acc;
    }, {} as Record<number, any>);

    // Time tracking
    const totalEstimated = tasks.reduce((sum, task) => 
      sum + (task.properties.estimatedHours || 0), 0
    );
    const totalActual = tasks.reduce((sum, task) => 
      sum + (task.properties.actualHours || 0), 0
    );

    // Overdue tasks
    const now = new Date();
    const overdue = tasks.filter(task => 
      task.properties.dueDate && 
      new Date(task.properties.dueDate) < now && 
      task.properties.status !== 'done'
    ).length;

    return {
      total,
      completed,
      inProgress,
      blocked,
      todo,
      completionRate,
      priorityData,
      statusData,
      userWorkload: Object.values(userWorkload),
      totalEstimated,
      totalActual,
      overdue,
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</div>
            <Progress value={analytics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Estimate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEstimated}h</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalActual}h actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.overdue}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.blocked} blocked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-4">
              {analytics.statusData.map((item) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {analytics.priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.userWorkload.map((userStats: any) => (
              <div key={userStats.user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userStats.user.avatar} />
                    <AvatarFallback>{userStats.user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{userStats.user.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {userStats.total} total tasks
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{userStats.completed}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{userStats.inProgress}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  
                  {userStats.blocked > 0 && (
                    <div className="text-center">
                      <div className="flex items-center space-x-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">{userStats.blocked}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Blocked</p>
                    </div>
                  )}
                  
                  <div className="w-24">
                    <Progress 
                      value={userStats.total > 0 ? (userStats.completed / userStats.total) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks
              .filter(task => task.properties.status === 'done')
              .slice(0, 5)
              .map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed by {task.assignedUser?.displayName || 'Unknown'}
                      </p>
                    </div>
                  </div>
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
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}