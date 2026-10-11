# services/realtime — Go WebSocket gateway (planned)

Whiteboard sync (Yjs updates), chat and presence. Connections for one board are pinned to one node by consistent hashing on board id; fan-out goes through NATS JetStream subjects named `tenant.<id>.room.<id>`. See the architecture doc, "Real-time layer".
