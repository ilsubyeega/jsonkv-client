// TODO: Implement this fully.
// - Listen the data and saves into class
// - Adding a callback thing or so.
export class JsonKvWebSocket {
  private url: string;
  private socket: WebSocket | null;
  private reconnectInterval: number;
  private reconnectTimeoutId: number | null;
  private mode: "full" | "patch";

  constructor(url: string) {
    this.url = url;
    this.socket = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.reconnectTimeoutId = null;
    this.mode = "patch";
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle the received data
      // ...
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.reconnect();
    };
  }

  reconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(() => {
      console.log("Reconnecting...");
      this.connect();
    }, this.reconnectInterval);
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

export interface JsonKvListenOption {
  /// The mode of listening. "full" means the full data will be received on every change. "patch" means only the changed data will be received.
  /// Default is "patch".
  mode: "full" | "patch";
  /// The reconnect interval in milliseconds. Default is 5000 (5 seconds).
  reconnectInterval: number;
}
