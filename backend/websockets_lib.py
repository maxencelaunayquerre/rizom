from typing import Optional

from fastapi import WebSocket
from starlette.websockets import WebSocketState

class WS_BroadcastRoom:
    def __init__(self, conversation_id: str):
        self.conversation_id = conversation_id
        self.active_connections: list[WebSocket] = []

    def is_empty(self) -> bool:
        return len(self.active_connections) <= 0

    async def add(self, websocket: WebSocket):
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, data: dict): # The data should not be a string
        for connection in self.active_connections:
            if connection.client_state != WebSocketState.CONNECTED:
                if connection.client_state != WebSocketState.DISCONNECTED:
                    self.disconnect(connection) # Removing while looping might be a bad idea...
                continue
            await connection.send_json(data)

    async def ping_new_message(self):
        await self.broadcast({
            "type": "news",
            "data": {
                "event": "new-message",
                "conversation_id": self.conversation_id
            }
        })

class WS_RoomManager:
    def __init__(self):
        self.rooms: dict[int, WS_BroadcastRoom] = {} # Map every room id with the subscribers
        self.connections: dict[int, list[int]] = {} # Map each connection to the room it's in
        self.connected_users: dict[str, WebSocket] = {}
        self.connected_ws: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        await websocket.send_json({
            "type": "welcome"
        })
        self.connections[id(websocket)] = [] # An empty record of what the user is subscribed to

    async def subscribe_user(self, websocket: WebSocket, user_id: str):

        self.connected_users[user_id] = websocket
        self.connected_ws[websocket] = user_id

    async def unsubscribe_user(self, user_id: str):

        removed_ws = self.connected_users.pop(user_id, None) # None if the user wasn't in the room (to prevent annoying errors)
        if removed_ws is not None:
            removed_user = self.connected_ws.pop(removed_ws, None)

    async def unsubscribe_ws(self, websocket: WebSocket):

        removed_user = self.connected_ws.pop(websocket, None) # None if the user wasn't in the room (to prevent annoying errors)
        if removed_user is not None:
            removed_ws = self.connected_users.pop(removed_user, None)

    async def get_subscribed_user(self, user_id: str) -> Optional[WebSocket]:

        return self.connected_users.get(user_id, None)
    
    async def get_user_from_ws(self, websocket: WebSocket) -> str:

        return self.connected_ws.get(websocket, None)

    async def subscribe_connection(self, websocket: WebSocket, conversation_id: int):

        if conversation_id not in self.rooms.keys():
            self.rooms[conversation_id] = WS_BroadcastRoom(conversation_id)
        await self.rooms[conversation_id].add(websocket)
        self.connections[id(websocket)].append(conversation_id)
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        await websocket.send_json({
            "type": "subscribed",
            "data": {
                "conversation_id": conversation_id
            }
        })

    async def unsubscribe_connection(self, websocket: WebSocket, conversation_id: int):
        if conversation_id in self.connections[id(websocket)]:
            self.rooms[conversation_id].disconnect(websocket)
            if self.rooms[conversation_id].is_empty(): 
                self.rooms.pop(conversation_id)

    def disconnect(self, websocket: WebSocket):
        for conversation_id in self.connections[id(websocket)]:
            self.rooms[conversation_id].disconnect(websocket)
            if self.rooms[conversation_id].is_empty(): 
                self.rooms.pop(conversation_id)

    async def ping_new_message_to(self, conversation_id):
        if conversation_id in self.rooms.keys(): # To prevent KeyError if no one is listening to the room
            await self.rooms[conversation_id].ping_new_message()

    async def ping_new_conversation_to(self, user_id: str, conv_id: int) -> bool:
        ws = await self.get_subscribed_user(user_id)
        if ws is None:
            return False
        
        if ws.client_state != WebSocketState.CONNECTED:
            return False
        await ws.send_json({
            "type": "news",
            "data": {
                "event": "new-conversation",
                "conversation_id": conv_id
            }
        })

        return True
