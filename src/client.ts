import { Operation } from "rfc6902";
import { JsonKvListenOption } from "./websocket";

export default class JsonKvClient {
  private baseUrl: string;
  private secret: String;
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

  /// Listen to changes of a key
  async listen<T>(
    key: string,
    callback: (value: T) => void,
    option: JsonKvListenOption | undefined
  ): Promise<void> {
    // TODO: Implement this using custom websocket class
  }
}
