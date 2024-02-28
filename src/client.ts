import { Operation } from "rfc6902";
import { JsonKvListener } from "./listener";

export default class JsonKvClient {
  baseUrl: string;
  public secret: String;
  public fetchSettings: any = {
    cache: "no-cache",
  };

  constructor(baseUrl: string, secret: String) {
    // trim if baseUrl is ending with '/',
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    this.baseUrl = baseUrl;
    this.secret = secret;
  }
  /// List all keys
  async list(): Promise<string[]> {
    const url = `${this.baseUrl}/list`;
    const response = await fetch(url, {
      ...this.fetchSettings,
      headers: {
        Authorization: this.secret,
      },
    });
    const data = await response.json();
    return data;
  }

  /// Get the value of a key
  async get<T>(key: string): Promise<T | undefined> {
    const url = `${this.baseUrl}/data/${key}`;
    const response = await fetch(url, {
      ...this.fetchSettings,
      headers: {
        Authorization: this.secret,
      },
    });
    const data = await response.json();
    return data;
  }

  /// Set the value of a key
  async post<T>(key: string, value: T): Promise<T> {
    const url = `${this.baseUrl}/data/${key}`;
    const response = await fetch(url, {
      ...this.fetchSettings,
      method: "POST",
      headers: {
        Authorization: this.secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    });
    const data = await response.json();
    return data;
  }

  /// Put the value of a key
  async put<T>(key: string, value: T): Promise<T> {
    const url = `${this.baseUrl}/data/${key}`;
    const response = await fetch(url, {
      ...this.fetchSettings,
      method: "PUT",
      headers: {
        Authorization: this.secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    });
    const data = await response.json();
    return data;
  }

  /// Patch the value of a key
  /// For a changing the json itself, use `putKey` instead.
  /// https://tools.ietf.org/html/rfc6902
  async patch<T>(key: string, operations: Operation[]): Promise<T> {
    const url = `${this.baseUrl}/data/${key}`;
    const response = await fetch(url, {
      ...this.fetchSettings,
      method: "PATCH",
      headers: {
        Authorization: this.secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(operations),
    });
    const data = await response.json();
    return data;
  }

  bulk_listen(
    callback: (listener: JsonKvListener) => void,
    connect: boolean = true
  ) {
    const listener = new JsonKvListener(this);
    callback(listener);
    if (connect) listener.connect();

    return listener;
  }
}
