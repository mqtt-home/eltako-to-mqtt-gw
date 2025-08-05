import { useEffect, useRef, useState, useCallback } from 'react';
import { ActorStatus } from '@/types/actor';

interface SSEHookReturn {
  data: ActorStatus[];
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useSSE(url: string): SSEHookReturn {
  const [data, setData] = useState<ActorStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();
    
    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('SSE connection established');
      };

      eventSource.onmessage = (event) => {
        try {
          const actors = JSON.parse(event.data) as ActorStatus[];
          console.log('Raw SSE data received:', event.data);
          console.log('Parsed actors:', actors);
          setData(actors);
          console.log('Received SSE update:', actors.length, 'actors');
        } catch (err) {
          console.error('Failed to parse SSE message:', err, 'Raw data:', event.data);
          setError('Failed to parse server data');
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setIsConnected(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Connection closed by server');
        } else {
          setError('Connection error');
        }
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current === eventSource) {
            console.log('Attempting to reconnect SSE...');
            connect();
          }
        }, 3000);
      };

    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setError('Failed to connect to server');
    }
  }, [url, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const reconnect = useCallback(() => {
    console.log('Manual SSE reconnect requested');
    setError(null);
    connect();
  }, [connect]);

  return { data, isConnected, error, reconnect };
}
