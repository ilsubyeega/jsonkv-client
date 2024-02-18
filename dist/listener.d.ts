import JsonKvClient from "./client";
export declare class JsonKvListener<T> {
    private key;
    private listenOption;
    private socket;
    private reconnectTimeoutId;
    private client;
    private data;
    private listeners;
    constructor(key: string, option?: JsonKvListenOption);
    connect(client: JsonKvClient): void;
    reconnect(): void;
    listen(callback: (data: T | undefined) => void): void;
    close(): void;
    private messageHandler;
}
export interface JsonKvListenOption {
    mode: "full" | "patch";
    reconnectInterval: number;
}
