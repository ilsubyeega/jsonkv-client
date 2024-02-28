import JsonKvClient from "./client";

export type JsonKvEvent = "ready" | "error" | "disconnect";
export class JsonKvListener {
  private listenOption: JsonKvListenOption;
  private socket: WebSocket | undefined;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | undefined;
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

  option(option: JsonKvListenOption) {
    this.listenOption = option;
  }

  connect() {
    if (!this.client) {
      throw new Error("Client is not set");
    }
    if (this.socket?.readyState == 1) {
      console.warn(
        "WebSocket is already connected. Please use reconnect() to reconnect."
      );
      return;
    }

    const url = this.getWebSocketUrl();
    
    if (typeof window !== "undefined" && window?.WebSocket) {
      this.socket = new window.WebSocket(url);
    } else {
      const WebSocket = require("ws");
      this.socket = new WebSocket(url);
    }

    if (!this.socket) throw new Error("WebSocket is not supported");

    this.socket.onopen = () => this.openHandler();
    this.socket.onmessage = (message) => this.messageHandler(message);
    this.socket.onclose = () => {
      console.debug("WebSocket connection closed");
      this.emitEvent("disconnect", null);
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.reconnect();
    };
  }

  private getWebSocketUrl(): string {
    if (!this.client) {
      throw new Error("Client is not set");
    }
    const protocol = this.client.baseUrl.startsWith("https://") ? "wss://" : "ws://";
    return protocol + this.client.baseUrl.slice(protocol.length) + "/listen";
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

  /// Get the value of a key from cache. If the key is not found, it will return undefined.
  get<T>(key: string): T | undefined {
    return this.data[key];
  }

  /// Listen to a key. When the key is updated, the callback will be called with the new value.
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

  /// Close the WebSocket connection.
  close() {
    if (this.socket) {
      this.socket.close();
    }
  }

  /// Listen to events. The callback will be called when the event is emitted.
  on(event: JsonKvEvent, callback: (data: any) => void) {
    this.listeners.push([event, callback]);
  }

  private sendListeningKeys() {
    if (this.socket?.readyState === 1) {
      this.socket.send(JSON.stringify({ subscribe: this.listen_keys }));
    }
  }

  private emitEvent(event: JsonKvEvent, data: any) {
    const listeners = this.listeners.filter((x) => x[0] === event);
    for (const listener of listeners) {
      listener[1](data);
    }
  }

  private openHandler() {
    // this.sendAuthentication();
    // server will send a auth message, and then do auth.
  }

  private sendAuthentication() {
    if (this.socket && this.client) {
      this.socket.send(JSON.stringify({ authenticate: this.client.secret }));
    }
  }

  private messageHandler(message: MessageEvent) {
    if (!message || !message.data) return;
    const filtered = filterMessage(message.data);
    if (!filtered) return;

    if (filtered === "authenticated") {
      this.sendListeningKeys();
      this.emitEvent("ready", null);
      return;
    }

    if (filtered === "auth") {
      this.sendAuthentication();
      return;
    }

    if ("error" in filtered) {
      console.error("Error on jsonkv-client listener:", filtered.error);
      this.emitEvent("error", filtered.error);
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
