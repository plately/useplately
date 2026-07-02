import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, X, Check, AlertCircle, MessageSquare, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  type: 'message' | 'task' | 'calendar' | 'system';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case 'task':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'calendar':
      return <Calendar className="h-4 w-4 text-purple-500" />;
    case 'system':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Mock notifications for demo - in real app, fetch from API
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: 1,
        type: 'message',
        title: 'New message in #general',
        content: 'John Doe: Hey team, just pushed the latest updates',
        read: false,
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        actionUrl: '/chat'
      },
      {
        id: 2,
        type: 'task',
        title: 'Task completed',
        content: 'UI Design Review has been marked as complete',
        read: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        actionUrl: '/tasks'
      },
      {
        id: 3,
        type: 'calendar',
        title: 'Upcoming meeting',
        content: 'Team standup in 15 minutes',
        read: true,
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        actionUrl: '/calendar'
      },
      {
        id: 4,
        type: 'system',
        title: 'System maintenance',
        content: 'Scheduled maintenance window tonight at 2 AM EST',
        read: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative glass-button">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-notification" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div 
                    className={`flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}