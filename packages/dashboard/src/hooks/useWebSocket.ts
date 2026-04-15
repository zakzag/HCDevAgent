import { useState, useEffect, useRef, useCallback } from 'react';

/** WebSocket event payload. */
interface WsEvent {
  readonly event: string;
  readonly data: unknown;
}

/**
 * Hook to manage a WebSocket connection for real-time events.
 */
export const useWebSocket = (
  url: string,
): { lastEvent: WsEvent | null; connected: boolean } => {
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event: MessageEvent) => {
      const parsed = JSON.parse(String(event.data)) as WsEvent;
      setLastEvent(parsed);
    };
    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { lastEvent, connected };
};

