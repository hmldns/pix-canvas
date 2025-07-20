// Core data entity types for the Infinite Pixel Canvas project
// Connection states
export var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["CONNECTED"] = "connected";
    ConnectionStatus["CONNECTING"] = "connecting";
    ConnectionStatus["DISCONNECTED"] = "disconnected";
    ConnectionStatus["ERROR"] = "error";
})(ConnectionStatus || (ConnectionStatus = {}));
