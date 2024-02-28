import JsonKvClient from "./client";

export type JsonKvEvent = "ready" | "error" | "disconnect";
export class JsonKvListener {
  private listenOption: JsonKvListenOption;
  private socket: WebSocket | undefined;
  private reconnectTimeoutId: number | undefined;
  private client: JsonKvClient | undefined;

  private listen_keys: string[] = [];
  private data: {
    [key: string]: any | undefined;
  } = {};
  private listeners: [JsonKvEvent, (data: any) => void | undefined][] = [];
  private callbacks: [string, (data: any) => void | undefined][] = [];

  constructor(
    client: JsonKvClient,
    option: JsonKvListenOption = default_listen_option
  ) {
    this.listenOption = option;
    this.client = client;
  }
  connect() {
    if (!this.client) {
      throw new Error("Client is not set");
    }
    // if websocket is connected, return
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.warn(
        "WebSocket is already connected. Please use reconnect() to reconnect."
      );
      return;
    }

    const url =
      this.client.baseUrl
        .replace("http://", "ws://")
        .replace("https://", "wss://") + "/listen";
    this.socket = new WebSocket(url);

    this.socket.onopen = () => this.openHandler();
    this.socket.onmessage = this.messageHandler;
    this.socket.onclose = () => {
      console.debug("WebSocket connection closed");
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    if (!this.listenOption.reconnect) return;

    if (this.socket) this.socket.close();

    this.reconnectTimeoutId = setTimeout(() => {
      console.log("Reconnecting...");
      if (!this.client) throw new Error("Client is not set");
      this.connect();
    }, this.listenOption.reconnectInterval);
  }

  listen<T>(key: string, callback: (data: T | undefined) => void) {
    this.callbacks.push([key, callback]);
    if (this.listen_keys.indexOf(key) === -1) {
      this.listen_keys.push(key);
      this.sendListeningKeys();
    } else {
      const value = this.data[key];
      if (value) {
        callback(value);
      }
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }

  on(event: JsonKvEvent, callback: (data: any) => void) {
    this.listeners.push([event, callback]);
  }

  private sendListeningKeys() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ listen: { keys: this.listen_keys } }));
    }
  }

  private openHandler() {}
  private messageHandler(message: any) {
    if (!message) return;
    const filtered = filterMessage(message);
    if (!filtered) return;

    if (filtered === "authenticated") {
      this.sendListeningKeys();
      return;
    }

    if (filtered === "auth") {
      // send credentials
      this.socket?.send(JSON.stringify({ authenticate: this.client?.secret }));
      return;
    }

    if ("error" in filtered) {
      console.error("Error on jsonkv-client listener:", filtered.error);
      return;
    }

    if ("subscribed" in filtered) {
      this.data[filtered.subscribed.key] = filtered.subscribed.value;
      const key = filtered.subscribed.key;
      console.debug(
        "Subscribed to key:",
        filtered.subscribed.key,
        "with value:",
        filtered.subscribed.value
      );
      const callbacks = this.callbacks.filter((x) => x[0] === key);
      for (const callback of callbacks) {
        callback[1](filtered.subscribed.value);
      }
      return;
    }

    if ("data" in filtered) {
      this.data[filtered.data.key] = filtered.data.value;
      const key = filtered.data.key;
      console.debug(
        "Received full data for key:",
        filtered.data.key,
        "with value:",
        filtered.data.value
      );
      const callbacks = this.callbacks.filter((x) => x[0] === key);
      for (const callback of callbacks) {
        callback[1](filtered.data.value);
      }
      return;
    }
  }
}

export interface JsonKvListenOption {
  /// The mode of listening. "full" means the full data will be received on every change. "patch" means only the changed data will be received.
  /// Default is "full".
  mode: "full" | "patch";
  /// The reconnect interval in milliseconds. Default is 5000 (5 seconds).
  reconnectInterval: number;
  /// Enable/Disable reconnecting. Default is true.
  reconnect: boolean;
}

const default_listen_option: JsonKvListenOption = {
  mode: "full",
  reconnectInterval: 1000,
  reconnect: true,
};

const filterMessage = (message: any) => {
  message = JSON.parse(message);
  if (message == "authenticated") {
    return "authenticated";
  }

  if (message.auth) {
    return "auth";
  }
  if (message.subscribed) return message as SubscribedMessage;
  if (message.data) return message as DataMessage;
  if (message.error) return message as ErrorMessage;
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

interface ErrorMessage {
  error: string;
}
