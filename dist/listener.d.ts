import JsonKvClient from "./client";
export type JsonKvEvent = "ready" | "error" | "disconnect";
export declare class JsonKvListener {
    private listenOption;
    private socket;
    private reconnectTimeoutId;
    private client;
    private listen_keys;
    private data;
    private listeners;
    private callbacks;
    constructor(client: JsonKvClient, option?: JsonKvListenOption);
    option(option: JsonKvListenOption): void;
    connect(): void;
    private getWebSocketUrl;
    private reconnect;
    get<T>(key: string): T | undefined;
    listen<T>(key: string, callback: (data: T | undefined) => void): void;
    close(): void;
    on(event: JsonKvEvent, callback: (data: any) => void): void;
    private sendListeningKeys;
    private emitEvent;
    private openHandler;
    private sendAuthentication;
    private messageHandler;
}
export interface JsonKvListenOption {
    mode: "full" | "patch";
    reconnectInterval: number;
    reconnect: boolean;
}
