import { useCallback, useRef, useState } from "react";
import type { StreamChunk, StreamMessage, StreamResult } from "@/api/types";
import { isStreamPing, isStreamError } from "@/api/types";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface LogEntry {
  timestamp: string;
  type: string;
}

export function useEcgWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [results, setResults] = useState<StreamResult[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);

  const pushLog = useCallback((type: string) => {
    setLog((prev) => [{ timestamp: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 5));
  }, []);

  const connect = useCallback(() => {
    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const defaultWsUrl = `${protocol}//${window.location.host}/api/v1/stream`;
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setStatus("connected");
      pushLog("open");
    };

    ws.onmessage = (event) => {
      try {
        const msg: StreamMessage = JSON.parse(event.data);
        if (isStreamPing(msg)) {
          pushLog("ping");
          return;
        }
        if (isStreamError(msg)) {
          pushLog(`error: ${msg.error}`);
          return;
        }
        pushLog(`beat: ${msg.label}`);
        setResults((prev) => [...prev, msg]);
      } catch {
        pushLog("parse-error");
      }
    };

    ws.onerror = () => {
      setStatus("error");
      pushLog("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      pushLog("close");
    };

    wsRef.current = ws;
  }, [pushLog]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  const sendChunk = useCallback((chunk: StreamChunk) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(chunk));
    }
  }, []);

  const clearResults = useCallback(() => setResults([]), []);

  return { status, results, log, connect, disconnect, sendChunk, clearResults };
}
