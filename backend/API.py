import binascii, asyncio
import re

from typing import Union, List
from pydantic import BaseModel
import pydantic

from fastapi import FastAPI, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState

import websockets

import model

from database_interface import *

from websockets_lib import WS_RoomManager

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_FILE = "sqlite3_database.db"

NAME_PATTERN = re.compile(r"^[A-Za-z ,.'-]{1,50}$")
REGISTRATION_CODE_PATTERN = re.compile(r"^[2-9A-HJ-NP-Za-km-z]{22}$")

db_interface = DatabaseInterface(DATABASE_FILE)

@app.on_event("startup")
async def startup_event():
    await db_interface.start()

@app.on_event("shutdown")
async def shutdown_event():
    await db_interface.stop()

@app.get("/")
async def root():
    return {"welcome": "This is Rizom's API, the documentation will soon be available online (for now, access it at /docs)."}

EXCEPTIONS = {
    "INVALID_USERID": "invalid-user-id",
    "INVALID_PASSWORD_HASH": "invalid-password-hash"
}

class InvalidUserID(Exception):
    pass

class UserAuthParams:
    def __init__(self, userid: str, password: str):
        self.userid = userid
        self.password_hash = password

    async def check(self):
        print("AUTH:", repr(self.userid))
        is_user_valid = await db_interface.read_check_user_password(self.userid, self.password_hash)
        if is_user_valid is None:
            raise InvalidUserID

        return is_user_valid

@app.get("/user/check-user")
async def API_check_user(user: UserAuthParams = Depends()):

    try:
        valid_user = await user.check()
    except InvalidUserID:
        return {"error": EXCEPTIONS["INVALID_USERID"], "result": False}
    else:
        if valid_user:
            return {"result": True}
        return {"error": EXCEPTIONS["INVALID_PASSWORD_HASH"], "result": False}


class GetPublicKeysResponse(BaseModel):
    __root__: list[tuple[str, bytes]]

@app.get("/user/get-public-key")
async def API_get_public_key(user: UserAuthParams = Depends(), required_users_ids: Union[List[str], None]  = Query(default=None)) -> GetPublicKeysResponse:
    """
    Ask for the public key of a user
    """
    if not await user.check():
        return {"error": "Invalid user"}
    
    return await db_interface.read_users_public_key(required_users_ids)

# Convs will be in base 64
@app.get("/user/get-conversations-list")
async def API_get_conversation_list(user: UserAuthParams = Depends()):

    if not await user.check():
        return {"error": "Invalid user"}

    convs = await db_interface.read_user_conversations(user.userid)

    if not convs:
        return []

    convs_base64 = [(x[0], x[1], base64.b64encode(x[2])) for x in convs]

    return convs_base64

#@authentified
@app.get("/user/get-private-key")
async def API_get_private_key(user: UserAuthParams = Depends()):

    if not await user.check():
        return {"error": "Invalid user"}

    private_key_encrypted = await db_interface.read_user_encrypted_private_key(user.userid)

    return private_key_encrypted

#@authentified
@app.get("/conversation/read-conversation-content")
async def API_read_conversation_content(user: UserAuthParams = Depends(), conversationid: int = -1, lastmessagetime: float = -1):

    if not await user.check():
        return {"error": "Invalid user"}

    if conversationid < 0:
        return {"error": "Invalid conversation"}

    if not await db_interface.read_is_conversation_member(conversationid, user.userid):
        return {"error": "Wrong conversation"}

    encrypted_messages = await db_interface.read_conversation_messages(conversationid, 100, lastmessagetime)
    return encrypted_messages

class WriteNewMessageBody(BaseModel):
    message_bundle: str = ""

#@authentified
@app.post("/conversation/write-new-message")
async def API_write_new_message(message_info: WriteNewMessageBody, user: UserAuthParams = Depends(), conversationid: int = -1):
    
    if not await user.check():
        return {"error": "Invalid user"}

    if conversationid < 0:
        return {"error": "Invalid conversation"}

    if message_info.message_bundle == "":
        return {"error": "Invalid message"}

    try:
        base64.b64decode(message_info.message_bundle)
    except (binascii.Error, ValueError):
        return {"error": "Invalid message"}

    if not await db_interface.read_is_conversation_member(conversationid, user.userid):
        return {"error": "Wrong conversation"}

    # Check if the user is indeed from this conversation

    await db_interface.write_new_message(conversationid, message_info.message_bundle, user.userid)

    await websocket_manager.ping_new_message_to(conversationid)

    return {"ok": "Message added"}

@app.get("/conversation/get-conversation-info")
async def API_get_conversation_info(user: UserAuthParams = Depends(), conversationid: int = -1):

    if not await user.check():
        return {"error": "Invalid user"}

    if conversationid < 0:
        return {"error": "Invalid conversation"}
    
    if not await db_interface.read_is_conversation_member(conversationid, user.userid):
        return {"error": "Wrong conversation"}
    
    info = await db_interface.read_conversation_info(conversationid)

    return info


# ---------------- Sign up --------------------------

# 1st step : get a user id

class GetNewUserIdBody(BaseModel):
    firstname: str
    lastname: str
    registration_code: str

@app.post("/user/get-new-user-id")
async def API_get_new_user_id(params: GetNewUserIdBody):

    # Validate the format of the fields
    if not NAME_PATTERN.match(params.firstname):
        # Firstname is invalid
        return {
            "error": "invalid-firstname"
        }

    if not NAME_PATTERN.match(params.lastname):
        # Lastname is invalid
        return {
            "error": "invalid-lastname"
        }

    if not REGISTRATION_CODE_PATTERN.match(params.registration_code):
        # registration code is invalid
        return {
            "error": "invalid-registration-code"
        }

    # Check the registration code
    if not await db_interface.check_registration_code(params.registration_code):
        return {
            "error": "registration-code-unfound-or-used"
        }

    # Generate the userid
    user_id = params.firstname + "@" + params.lastname
    number = 0
    
    while await db_interface.does_user_exist(user_id):
        number += 1
        user_id = params.firstname + "@" + params.lastname + str(number)

    # Mark the code with the id
    await db_interface.mark_registration_code_as_used(params.registration_code, user_id)

    # send back the id
    return {
        "ok": "User ID claimed",
        "userid": user_id
    }


class RegisterNewUserBody(BaseModel):
    firstname: str
    lastname: str
    userid: str
    birth_year: int
    registration_code: str
    public_key: bytes
    private_key: bytes
    password_hash: str
    

@app.post("/user/register-new-user")
async def API_register_new_user(params: RegisterNewUserBody):

    # Validate the format of the fields
    if not NAME_PATTERN.match(params.firstname):
        # Firstname is invalid
        return {
            "error": "invalid-firstname"
        }

    if not NAME_PATTERN.match(params.lastname):
        # Lastname is invalid
        return {
            "error": "invalid-lastname"
        }

    if not REGISTRATION_CODE_PATTERN.match(params.registration_code):
        # registration code is invalid
        return {
            "error": "invalid-registration-code"
        }
    
    if not (params.birth_year < 2020 and params.birth_year > 1960):
        return {
            "error": "invalid-birth-year"
        }
    

    if not await db_interface.match_marked_registration_code(params.registration_code, params.userid):
        return {
            "error": "userid-not-matches-registration-code"
        }
    
    # Create the user

    await db_interface.write_new_user(
        params.firstname,
        params.lastname,
        params.userid,
        params.public_key,
        params.private_key,
        params.password_hash,
    )

    # Returns a confirmation

    return {
        "ok": "User created",
        "userid": params.userid
    }

# ---------------- Create a conversation --------------------------

#@authentified
@app.post("/conversation/create-new")
async def API_create_new_conversation(user: UserAuthParams = Depends()):
    
    if not await user.check():
        return {"error": "Invalid user"}

    conversation_id = await db_interface.write_new_conversation(user.userid, "no name yet")

    return {"ok": "Conversation created", "conversation_id": conversation_id } 

class InviteNewMemberBody(BaseModel):
    conversation_id: int
    conversation_name: str
    new_members: dict[str, str] # userid, base64 encrypted conversation keys


@app.put("/conversation/invite-new-member")
async def API_invite_new_member(new_members_param: InviteNewMemberBody, user: UserAuthParams = Depends()):  # Pass a list in the body
    
    if not await user.check():
        return {"error": "Invalid user"}

    if new_members_param.conversation_id < 0:
        return {"error": "Invalid conversation"}

    if not await db_interface.read_is_conversation_member(new_members_param.conversation_id, user.userid):
        return {"error": "You have no right on this conversation"}

    # Decode the conversations keys encrypted

    for new_member_id in new_members_param.new_members.keys():
        new_members_param.new_members[new_member_id] = base64.b64decode(new_members_param.new_members[new_member_id])

    all_members = await db_interface.write_conversation_add_members(new_members_param.conversation_id, new_members_param.conversation_name, new_members_param.new_members)

    # 1. Check if the user is connected (has a WS subscribed to the backend)
    # 2. Send a specific type of message
    for new_member_id in new_members_param.new_members.keys():
        news_sent = await websocket_manager.ping_new_conversation_to(new_member_id, new_members_param.conversation_id)

    return {"ok": "Members added.", "current_members": all_members}


websocket_manager = WS_RoomManager()

@app.websocket("/connect-ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:

            message = await websocket.receive_json()

            try:
                received_message = model.WebsocketRequestModel(**message)
            except pydantic.error_wrappers.ValidationError as error:
                if websocket.client_state != WebSocketState.CONNECTED:
                    continue
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "error": "invalid-message-format",
                        "info": error.json()
                    }
                })
                continue
            
            if received_message.type == "subscribe": # Needs creds and conversation_id

                try:
                    received_data = model.SubscribeRequestDataModel(**received_message.data)
                except pydantic.error_wrappers.ValidationError as error:
                    if websocket.client_state != WebSocketState.CONNECTED:
                        continue
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "error": "data-not-matching-type",
                            "info": error.json()
                        }
                    })
                    continue

                if not await db_interface.read_check_user_password(received_data.userid, received_data.password_hash):
                    if websocket.client_state != WebSocketState.CONNECTED:
                        continue
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "error": "invalid-credentials",
                            "info": "" # I can't say if it's the password or the id that's invalid
                        }
                    })
                    continue

                # From now on we are sure that this is an actual user, doesn't matter if he is indeed in the conversation or not.
                # That means that if the user is in no conversation, he will never call "subscribe" and never be subscribed...
                await websocket_manager.subscribe_user(websocket, received_data.userid)
                
                if not await db_interface.read_is_conversation_member(received_data.conversation_id, received_data.userid):
                    if websocket.client_state != WebSocketState.CONNECTED:
                        continue
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "error": "invalid-conversation",
                            "info": "" # There is nothing to add
                        }
                    })
                    continue
                
                # Add the websocket to the corresponding room
                await websocket_manager.subscribe_connection(websocket, received_data.conversation_id)

            # If it's another type, it's not implemented yet
    except (WebSocketDisconnect, websockets.exceptions.ConnectionClosedError, websockets.exceptions.ConnectionClosedOK):
        websocket_manager.disconnect(websocket)
        await websocket_manager.unsubscribe_ws(websocket)

# Possible HTTP verbs
"""
POST    : Create data
GET     : Read data
PUT     : Update data
DELETE  : Delete data
OPTIONS
HEAD
PATCH
TRACE
"""

# Here are the endpoints to implement later
"""
First :
- First login (credentials) : /user/first-login/change-credentials
- First login (set key pair): /user/first-login/set-keypair

Then :
- First login (set preferences) : /user/first-login/set-matching-preferences
- Get all available interests   : /const/available-interests
"""