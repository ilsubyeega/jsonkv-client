import JsonKvClient from "./client";

export class JsonKvListener<T> {
  private key: string;
  private listenOption: JsonKvListenOption;
  private socket: WebSocket | undefined;
  private reconnectTimeoutId: number | undefined;
  private client: JsonKvClient | undefined;

  private data: T | undefined;
  private listeners: ((data: T | undefined) => void)[] = [];

  constructor(key: string, option: JsonKvListenOption = default_listen_option) {
    this.key = key;
    this.listenOption = option;
  }

  connect(client: JsonKvClient, callback: ((data: T | undefined) => void | undefined) = undefined) {
    if (callback) this.listen(callback)
    this.client = client;
    var url =
      client.baseUrl.replace("http://", "ws://").replace("https://", "wss://") +
      "/listen/" +
      this.key;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageHandler(data);
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
      if (!this.client) throw new Error("Client is not set");
      this.connect(this.client);
    }, this.listenOption.reconnectInterval);
  }

  listen(callback: (data: T | undefined) => void) {
    this.listeners.push(callback);
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }

  private messageHandler(message: any) {
    const filtered = filterMessage(message);
    if (!filtered) return;

    if ("subscribed" in filtered) {
      this.data = filtered.subscribed.value;
    } else if ("data" in filtered) {
      if (this.listenOption.mode === "full") {
        this.data = filtered.data.value;
      } else {
        // todo: patch mode
      }
    }

    this.listeners.forEach((listener) => {
      listener(this.data);
    });
  }
}

export interface JsonKvListenOption {
  /// The mode of listening. "full" means the full data will be received on every change. "patch" means only the changed data will be received.
  /// Default is "patch".
  mode: "full" | "patch";
  /// The reconnect interval in milliseconds. Default is 5000 (5 seconds).
  reconnectInterval: number;
}

const default_listen_option: JsonKvListenOption = {
  mode: "full",
  reconnectInterval: 1000,
};

const filterMessage = (message: any) => {
  if (message.subscribed) return message as SubscribedMessage;
  if (message.data) return message as DataMessage;
  return null;
};
interface SubscribedMessage {
  subscribed: {
    key: string;
    value: any;
  };
}

interface DataMessage {
  data: {
    key: string;
    value: any;
  };
}
