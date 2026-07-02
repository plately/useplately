import { useState, useEffect, useCallback, useRef } from "react";

// Define the WebSocket message types
export type WebSocketMessage = {
  type: string;
  data: any;
  nodeId?: number;
  userId?: number;
};

export function useWebSocket(nodeId?: number) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  const connect = useCallback(() => {
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log("WebSocket connection established");
        setConnected(true);
        reconnectAttempts.current = 0;
        
        // Join node room if nodeId is provided
        if (nodeId) {
          socket.send(JSON.stringify({
            type: "join",
            nodeId,
          }));
        }
      };
      
      socket.onclose = (event) => {
        console.log("WebSocket connection closed", event.code, event.reason);
        setConnected(false);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log("Received WebSocket message:", message);
          setLastMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      socketRef.current = socket;
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }, [nodeId]);
  
  // Connect to the WebSocket server
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounting");
      }
    };
  }, [connect]);
  
  // Join a node room
  const joinNode = useCallback((id: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "join",
        nodeId: id,
      }));
    }
  }, []);
  
  // Send updates to the server
  const sendUpdate = useCallback((data: any, userId?: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && nodeId) {
      socketRef.current.send(JSON.stringify({
        type: "update",
        data,
        nodeId,
        userId,
      }));
    }
  }, [nodeId]);
  
  // Send a chat message
  const sendChatMessage = useCallback((channelId: number, content: string, userId: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "chat_message",
        data: {
          channelId,
          content,
          userId
        }
      }));
    }
  }, []);
  
  return {
    connected,
    lastMessage,
    joinNode,
    sendUpdate,
    sendChatMessage,
  };
}