import JsonKvClient from "./client";
export declare class JsonKvListener {
    private listenOption;
    private socket;
    private reconnectTimeoutId;
    private client;
    private data;
    private listeners;
    constructor(option?: JsonKvListenOption);
    connect(client: JsonKvClient): void;
    reconnect(): void;
    listen<T>(key: string, callback: (data: T | undefined) => void): void;
    close(): void;
    private messageHandler;
}
export interface JsonKvListenOption {
    mode: "full" | "patch";
    reconnectInterval: number;
}
