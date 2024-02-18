var JsonKvListener = /** @class */ (function () {
    function JsonKvListener(key, option) {
        if (option === void 0) { option = default_listen_option; }
        this.listeners = [];
        this.key = key;
        this.listenOption = option;
    }
    JsonKvListener.prototype.connect = function (client) {
        var _this = this;
        this.client = client;
        var url = client.baseUrl.replace("http://", "ws://").replace("https://", "wss://") +
            "/listen/" +
            this.key;
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
    JsonKvListener.prototype.listen = function (callback) {
        this.listeners.push(callback);
    };
    JsonKvListener.prototype.close = function () {
        if (this.socket) {
            this.socket.close();
        }
    };
    JsonKvListener.prototype.messageHandler = function (message) {
        var _this = this;
        var filtered = filterMessage(message);
        if (!filtered)
            return;
        if ("subscribed" in filtered) {
            this.data = filtered.subscribed.value;
        }
        else if ("data" in filtered) {
            if (this.listenOption.mode === "full") {
                this.data = filtered.data.value;
            }
            else {
                // todo: patch mode
            }
        }
        this.listeners.forEach(function (listener) {
            listener(_this.data);
        });
    };
    return JsonKvListener;
}());
export { JsonKvListener };
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