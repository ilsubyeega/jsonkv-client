"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonKvListener = void 0;
var JsonKvListener = /** @class */ (function () {
    function JsonKvListener(client, option) {
        if (option === void 0) { option = default_listen_option; }
        this.listen_keys = [];
        this.data = {};
        this.listeners = [];
        this.callbacks = [];
        this.listenOption = option;
        this.client = client;
    }
    JsonKvListener.prototype.option = function (option) {
        this.listenOption = option;
    };
    JsonKvListener.prototype.connect = function () {
        var _this = this;
        var _a;
        if (!this.client) {
            throw new Error("Client is not set");
        }
        if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) == 1) {
            console.warn("WebSocket is already connected. Please use reconnect() to reconnect.");
            return;
        }
        var url = this.getWebSocketUrl();
        if (typeof window !== "undefined" && (window === null || window === void 0 ? void 0 : window.WebSocket)) {
            this.socket = new window.WebSocket(url);
        }
        else {
            var WebSocket_1 = require("ws");
            this.socket = new WebSocket_1(url);
        }
        if (!this.socket)
            throw new Error("WebSocket is not supported");
        this.socket.onopen = function () { return _this.openHandler(); };
        this.socket.onmessage = function (message) { return _this.messageHandler(message); };
        this.socket.onclose = function () {
            console.debug("WebSocket connection closed");
            _this.emitEvent("disconnect", null);
            _this.reconnect();
        };
        this.socket.onerror = function (error) {
            console.error("WebSocket error:", error);
            _this.reconnect();
        };
    };
    JsonKvListener.prototype.getWebSocketUrl = function () {
        if (!this.client) {
            throw new Error("Client is not set");
        }
        var protocol = this.client.baseUrl.startsWith("https://") ? "wss://" : "ws://";
        return protocol + this.client.baseUrl.slice(protocol.length) + "/listen";
    };
    JsonKvListener.prototype.reconnect = function () {
        var _this = this;
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
        }
        if (!this.listenOption.reconnect)
            return;
        if (this.socket)
            this.socket.close();
        this.reconnectTimeoutId = setTimeout(function () {
            console.log("Reconnecting...");
            if (!_this.client)
                throw new Error("Client is not set");
            _this.connect();
        }, this.listenOption.reconnectInterval);
    };
    /// Get the value of a key from cache. If the key is not found, it will return undefined.
    JsonKvListener.prototype.get = function (key) {
        return this.data[key];
    };
    /// Listen to a key. When the key is updated, the callback will be called with the new value.
    JsonKvListener.prototype.listen = function (key, callback) {
        this.callbacks.push([key, callback]);
        if (this.listen_keys.indexOf(key) === -1) {
            this.listen_keys.push(key);
            this.sendListeningKeys();
        }
        else {
            var value = this.data[key];
            if (value) {
                callback(value);
            }
        }
    };
    /// Close the WebSocket connection.
    JsonKvListener.prototype.close = function () {
        if (this.socket) {
            this.socket.close();
        }
    };
    /// Listen to events. The callback will be called when the event is emitted.
    JsonKvListener.prototype.on = function (event, callback) {
        this.listeners.push([event, callback]);
    };
    JsonKvListener.prototype.sendListeningKeys = function () {
        var _a;
        if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === 1) {
            this.socket.send(JSON.stringify({ subscribe: this.listen_keys }));
        }
    };
    JsonKvListener.prototype.emitEvent = function (event, data) {
        var listeners = this.listeners.filter(function (x) { return x[0] === event; });
        for (var _i = 0, listeners_1 = listeners; _i < listeners_1.length; _i++) {
            var listener = listeners_1[_i];
            listener[1](data);
        }
    };
    JsonKvListener.prototype.openHandler = function () {
        // this.sendAuthentication();
        // server will send a auth message, and then do auth.
    };
    JsonKvListener.prototype.sendAuthentication = function () {
        if (this.socket && this.client) {
            this.socket.send(JSON.stringify({ authenticate: this.client.secret }));
        }
    };
    JsonKvListener.prototype.messageHandler = function (message) {
        if (!message || !message.data)
            return;
        var filtered = filterMessage(message.data);
        if (!filtered)
            return;
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
            var key_1 = filtered.subscribed.key;
            console.debug("Subscribed to key:", filtered.subscribed.key, "with value:", filtered.subscribed.value);
            var callbacks = this.callbacks.filter(function (x) { return x[0] === key_1; });
            for (var _i = 0, callbacks_1 = callbacks; _i < callbacks_1.length; _i++) {
                var callback = callbacks_1[_i];
                callback[1](filtered.subscribed.value);
            }
            return;
        }
        if ("data" in filtered) {
            this.data[filtered.data.key] = filtered.data.value;
            var key_2 = filtered.data.key;
            console.debug("Received full data for key:", filtered.data.key, "with value:", filtered.data.value);
            var callbacks = this.callbacks.filter(function (x) { return x[0] === key_2; });
            for (var _a = 0, callbacks_2 = callbacks; _a < callbacks_2.length; _a++) {
                var callback = callbacks_2[_a];
                callback[1](filtered.data.value);
            }
            return;
        }
    };
    return JsonKvListener;
}());
exports.JsonKvListener = JsonKvListener;
var default_listen_option = {
    mode: "full",
    reconnectInterval: 1000,
    reconnect: true,
};
var filterMessage = function (message) {
    message = JSON.parse(message);
    if (message == "authenticated") {
        return "authenticated";
    }
    if (message.auth) {
        return "auth";
    }
    if (message.subscribed)
        return message;
    if (message.data)
        return message;
    if (message.error)
        return message;
    return null;
};
//# sourceMappingURL=listener.js.map