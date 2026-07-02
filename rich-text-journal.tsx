import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Send, 
  Users, 
  MessageSquare, 
  Wifi,
  WifiOff,
  Clock
} from "lucide-react";

interface Message {
  id: number;
  content: string;
  channelId: number;
  userId: number;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
  };
}

interface Channel {
  id: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  spaceId: number;
}

interface RealTimeChatProps {
  channelId: number;
  currentUserId: number;
}

export default function RealTimeChat({ channelId, currentUserId }: RealTimeChatProps) {
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUsers, setActiveUsers] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { connected, sendChatMessage } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch channel info
  const { data: channel } = useQuery({
    queryKey: [`/api/channels/${channelId}`],
    enabled: !!channelId
  });

  // Fetch messages 
  const { data: fetchedMessages, isLoading } = useQuery({
    queryKey: [`/api/channels/${channelId}/messages`],
    enabled: !!channelId,
    refetchInterval: connected ? false : 5000 // Poll when not connected
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          channelId,
          userId: currentUserId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: (newMessage) => {
      // Message will be added via WebSocket automatically
      // Only add locally if not connected to WebSocket
      if (!connected) {
        setMessages(prev => [...prev, newMessage]);
      }
      
      setMessageInput("");
      scrollToBottom();
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Your message could not be delivered",
        variant: "destructive"
      });
    }
  });

  // Update messages when fetched
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  // Handle WebSocket messages
  useEffect(() => {
    if (connected) {
      const handleWebSocketMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'new_message':
              if (data.data.channelId === channelId) {
                setMessages(prev => {
                  // Avoid duplicates
                  if (prev.some(m => m.id === data.data.id)) {
                    return prev;
                  }
                  return [...prev, data.data];
                });
                scrollToBottom();
              }
              break;
              
            case 'user_typing':
              if (data.data.channelId === channelId && data.data.userId !== currentUserId) {
                setIsTyping(prev => {
                  if (!prev.includes(data.data.username)) {
                    return [...prev, data.data.username];
                  }
                  return prev;
                });
                
                // Clear typing indicator after 3 seconds
                setTimeout(() => {
                  setIsTyping(prev => prev.filter(u => u !== data.data.username));
                }, 3000);
              }
              break;
              
            case 'user_joined_channel':
              if (data.data.channelId === channelId) {
                setActiveUsers(prev => [...new Set([...prev, data.data.userId])]);
              }
              break;
              
            case 'user_left_channel':
              if (data.data.channelId === channelId) {
                setActiveUsers(prev => prev.filter(id => id !== data.data.userId));
              }
              break;
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      // Note: This would need proper WebSocket integration
      // For now, we'll use the existing WebSocket hook
    }
  }, [connected, channelId, currentUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim()) return;
    
    sendMessageMutation.mutate(messageInput.trim());
  };

  const handleTyping = () => {
    if (connected) {
      // Send typing indicator via WebSocket
      // This would be implemented in the WebSocket hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">{channel?.name || `Channel ${channelId}`}</h3>
            {channel?.description && (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="secondary" className="gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          
          {activeUsers.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {activeUsers.length} online
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.sender.avatar} />
                <AvatarFallback>
                  {message.sender.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {message.sender.username || message.sender.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.createdAt), 'HH:mm')}
                  </span>
                </div>
                
                <div className="text-sm leading-relaxed break-words">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicators */}
          {isTyping.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
              {isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              handleTyping();
            }}
            placeholder={`Message ${channel?.name || 'channel'}...`}
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          
          <Button 
            type="submit" 
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {!connected && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Messages will be sent when you're back online
          </p>
        )}
      </form>
    </div>
  );
}