import JsonKvClient from "./client";

export class JsonKvListener {
  private listenOption: JsonKvListenOption;
  private socket: WebSocket | undefined;
  private reconnectTimeoutId: number | undefined;
  private client: JsonKvClient | undefined;

  private data: {
    [key: string]: any | undefined;
  } = {};
  private listeners: [string, (data: any) => void | undefined][] = [];

  constructor(option: JsonKvListenOption = default_listen_option) {
    this.listenOption = option;
  }
  connect(client: JsonKvClient) {
    this.client = client;
    var url =
      client.baseUrl.replace("http://", "ws://").replace("https://", "wss://") +
      "/listen";
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

  listen<T>(key: string, callback: (data: T | undefined) => void) {
    this.listeners.push([key, callback]);
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }

  private messageHandler(message: any) {
    if (!message) return;
    if ("auth" in message) {
      // send credentials
      this.socket?.send(
        JSON.stringify({ authenticate: { secret: this.client?.secret } })
      );
      return;
    }
    if ("error" in message) {
      console.error("Error on jsonkv-client:", message.error.message);
      return;
    }

    const filtered = filterMessage(message);
    if (!filtered) return;

    let key: string | undefined = undefined;
    if ("subscribed" in filtered) {
      this.data[filtered.subscribed.key] = filtered.subscribed.value;
      key = filtered.subscribed.key;
      console.debug(
        "Subscribed to key:",
        filtered.subscribed.key,
        "with value:",
        filtered.subscribed.value
      );
    } else if ("data" in filtered) {
      if (this.listenOption.mode === "full") {
        this.data[filtered.data.key] = filtered.data.value;
        key = filtered.data.key;
        console.debug(
          "Received full data for key:",
          filtered.data.key,
          "with value:",
          filtered.data.value
        );
      } else {
        // todo: patch mode
      }
    }

    if (key)
      this.listeners
        .filter((l) => l[0] == key)
        .forEach((listener) => {
          if (listener[1]) listener[1](this.data);
        });
  }
}

export interface JsonKvListenOption {
  /// The mode of listening. "full" means the full data will be received on every change. "patch" means only the changed data will be received.
  /// Default is "full".
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
