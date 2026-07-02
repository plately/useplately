import { Node, NodeWithLinks, User, Channel, Space } from "@shared/schema";

export type Theme = "light" | "dark";
export type ColorScheme = "blue" | "green" | "pink" | "red";

export interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  nodeId?: number;
  attendees?: { id: number; name: string; avatar?: string }[];
}

export interface Message {
  id: number;
  content: string;
  sender: User;
  timestamp: Date;
  reactions?: Record<string, number[]> | { emoji: string; count: number; }[];
}

export interface GraphNode {
  id: number;
  label: string;
  nodeType: string;
  radius: number;
  color: string;
}

export interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Task extends Node {
  properties: {
    status: "todo" | "in-progress" | "done" | "blocked";
    assignee: number;
    priority: "low" | "medium" | "high" | "critical";
    dueDate?: string;
  }
  assignedUser?: {
    id: number;
    displayName: string;
    avatar?: string;
  }
}

export interface DashboardData {
  activitySummary: {
    nodesCreated: number;
    messagesExchanged: number;
    tasksCompleted: number;
    meetingsScheduled: number;
  };
  activityTimeline: Array<{
    date: string;
    nodes: number;
    tasks: number;
    messages: number;
  }>;
  nodeDistribution: Array<{
    type: string;
    count: number;
  }>;
  taskCompletionRate: number;
  upcomingTasks: number;
  overdueTasks: number;
}
