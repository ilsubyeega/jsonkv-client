"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonKvListener = void 0;
var JsonKvListener = /** @class */ (function () {
    function JsonKvListener(option) {
        if (option === void 0) { option = default_listen_option; }
        this.data = {};
        this.listeners = [];
        this.listenOption = option;
    }
    JsonKvListener.prototype.connect = function (client) {
        var _this = this;
        this.client = client;
        var url = client.baseUrl.replace("http://", "ws://").replace("https://", "wss://") +
            "/listen";
        this.socket = new WebSocket(url);
        this.socket.onopen = function () {
            console.log("WebSocket connection established");
        };
        this.socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            _this.messageHandler(data);
        };
        this.socket.onclose = function () {
            console.log("WebSocket connection closed");
            _this.reconnect();
        };
        this.socket.onerror = function (error) {
            console.error("WebSocket error:", error);
            _this.reconnect();
        };
    };
    JsonKvListener.prototype.reconnect = function () {
        var _this = this;
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
        }
        this.reconnectTimeoutId = setTimeout(function () {
            console.log("Reconnecting...");
            if (!_this.client)
                throw new Error("Client is not set");
            _this.connect(_this.client);
        }, this.listenOption.reconnectInterval);
    };
    JsonKvListener.prototype.listen = function (key, callback) {
        this.listeners.push([key, callback]);
    };
    JsonKvListener.prototype.close = function () {
        if (this.socket) {
            this.socket.close();
        }
    };
    JsonKvListener.prototype.messageHandler = function (message) {
        var _this = this;
        var _a, _b;
        if (!message)
            return;
        if ("auth" in message) {
            // send credentials
            (_a = this.socket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ authenticate: { secret: (_b = this.client) === null || _b === void 0 ? void 0 : _b.secret } }));
            return;
        }
        if ("error" in message) {
            console.error("Error on jsonkv-client:", message.error.message);
            return;
        }
        var filtered = filterMessage(message);
        if (!filtered)
            return;
        var key = undefined;
        if ("subscribed" in filtered) {
            this.data[filtered.subscribed.key] = filtered.subscribed.value;
            key = filtered.subscribed.key;
            console.debug("Subscribed to key:", filtered.subscribed.key, "with value:", filtered.subscribed.value);
        }
        else if ("data" in filtered) {
            if (this.listenOption.mode === "full") {
                this.data[filtered.data.key] = filtered.data.value;
                key = filtered.data.key;
                console.debug("Received full data for key:", filtered.data.key, "with value:", filtered.data.value);
            }
            else {
                // todo: patch mode
            }
        }
        if (key)
            this.listeners
                .filter(function (l) { return l[0] == key; })
                .forEach(function (listener) {
                if (listener[1])
                    listener[1](_this.data);
            });
    };
    return JsonKvListener;
}());
exports.JsonKvListener = JsonKvListener;
var default_listen_option = {
    mode: "full",
    reconnectInterval: 1000,
};
var filterMessage = function (message) {
    if (message.subscribed)
        return message;
    if (message.data)
        return message;
    return null;
};
//# sourceMappingURL=listener.js.map