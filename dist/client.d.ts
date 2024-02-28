import { Operation } from "rfc6902";
import { JsonKvListener } from "./listener";
export default class JsonKvClient {
    baseUrl: string;
    secret: String;
    fetchSettings: any;
    constructor(baseUrl: string, secret: String);
    list(): Promise<string[]>;
    get<T>(key: string): Promise<T | undefined>;
    post<T>(key: string, value: T): Promise<T>;
    put<T>(key: string, value: T): Promise<T>;
    patch<T>(key: string, operations: Operation[]): Promise<T>;
    bulk_listen(callback: (listener: JsonKvListener) => void, connect?: boolean): JsonKvListener;
}
