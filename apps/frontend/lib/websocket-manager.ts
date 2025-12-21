// Singleton WebSocket manager that persists across React re-renders
// This is necessary because React Strict Mode causes double-mounting

type MessageHandler = (data: unknown) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: string) => void;

interface WebSocketManager {
  connect: () => void;
  disconnect: () => void;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  onMessage: (handler: MessageHandler) => () => void;
  onConnect: (handler: ConnectionHandler) => () => void;
  onDisconnect: (handler: ConnectionHandler) => () => void;
  onError: (handler: ErrorHandler) => () => void;
  isConnected: () => boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

class WebSocketManagerImpl implements WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect(): void {
    if (typeof window === 'undefined') return;
    if (this.isConnecting) return;
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    this.isConnecting = true;
    console.log('WebSocketManager: Connecting to', WS_URL);

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocketManager: Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Notify handlers
        this.connectHandlers.forEach((handler) => handler());

        // Resubscribe to symbols
        if (this.subscribedSymbols.size > 0) {
          this.sendSubscribe(Array.from(this.subscribedSymbols));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach((handler) => handler(data));
        } catch (err) {
          console.error('WebSocketManager: Error parsing message', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocketManager: Disconnected', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;

        // Notify handlers
        this.disconnectHandlers.forEach((handler) => handler());

        // Attempt reconnect for abnormal closures
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
          console.log(`WebSocketManager: Reconnecting in ${delay}ms`);
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        }
      };

      this.ws.onerror = () => {
        console.error('WebSocketManager: Error occurred');
        this.isConnecting = false;
        this.errorHandlers.forEach((handler) => handler('WebSocket connection error'));
      };
    } catch (err) {
      console.error('WebSocketManager: Failed to connect', err);
      this.isConnecting = false;
      this.errorHandlers.forEach((handler) => handler('Failed to create WebSocket'));
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnecting = false;
  }

  private sendSubscribe(symbols: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ op: 'subscribe', symbols }));
    }
  }

  private sendUnsubscribe(symbols: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ op: 'unsubscribe', symbols }));
    }
  }

  subscribe(symbols: string[]): void {
    symbols.forEach((s) => this.subscribedSymbols.add(s));
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(symbols);
    }
  }

  unsubscribe(symbols: string[]): void {
    symbols.forEach((s) => this.subscribedSymbols.delete(s));
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscribe(symbols);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    // If already connected, call immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      handler();
    }
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let instance: WebSocketManagerImpl | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (typeof window === 'undefined') {
    // Return a no-op manager for SSR
    return {
      connect: () => {},
      disconnect: () => {},
      subscribe: () => {},
      unsubscribe: () => {},
      onMessage: () => () => {},
      onConnect: () => () => {},
      onDisconnect: () => () => {},
      onError: () => () => {},
      isConnected: () => false,
    };
  }

  if (!instance) {
    instance = new WebSocketManagerImpl();
  }
  return instance;
}
