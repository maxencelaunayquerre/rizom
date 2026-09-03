import datetime, time
import base64, uuid

from typing import Union, Optional

import msgpack
import aiosqlite as sql # async sqlite3
import shortuuid

import lib_crypto.useful_functions as crypto_utils

def get_now():
    return str(datetime.datetime.now())

def get_now_num():
    return time.time()

class SQLiteException(Exception):
    pass

class DatabaseInterface:

    def __init__(self, filepath):
        self.filepath = filepath

    async def start(self):
        self.connection = await sql.connect(self.filepath)
        self.cursor = await self.connection.cursor()

    async def stop(self):
        await self.cursor.close()
        await self.connection.close()

    async def push_changes(self): # Can become useful to add some sort of caching, or improve performance
        await self.connection.commit()

    # ------------------ READ --------------------------------

    async def does_user_exist(self, user_id) -> bool:
        
        statement = "SELECT user_id FROM users WHERE user_id = ?"

        try:
            await self.cursor.execute(statement, (user_id,))
        except Exception as e:
            raise SQLiteException(f"Exception when reading the user {user_id} : {e}")
        
        results = await self.cursor.fetchall()

        return (len(results) > 0)

    async def read_is_conversation_member(self, conversation_id, user_id) -> bool:

        statement = "SELECT members FROM conversations WHERE conversation_id = ?"

        try:
            await self.cursor.execute(statement, (conversation_id,)) # To change
        except Exception as e:
            raise SQLiteException(f"Exception when reading the conversation {conversation_id} : {e}")
        
        raw_output = await self.cursor.fetchall()

        if len(raw_output) == 0 :
            print("Raw output is invalid...")
            return False

        results = (raw_output)[0] # So that it's always clean

        members = results[0].split("|") # Basic way of storing the members

        return (user_id in members)

    async def read_is_conversation_admin(self, conversation_id, user_id) -> bool:
        statement = "SELECT creator_id FROM conversations WHERE conversation_id = ?"

        try:
            await self.cursor.execute(statement, (conversation_id,)) # To change
        except Exception as e:
            raise SQLiteException(f"Exception when reading the conversation {conversation_id} : {e}")
        
        results = (await self.cursor.fetchall())[0] # So that it's always clean

        members = results[0] # Basic way of storing the members

        return (user_id == members)

    async def read_user_info(self, user_id: str) -> dict:

        statement = "SELECT firstname, lastname, public_key, private_key, user_id FROM users WHERE user_id = ?"

        try:
            await self.cursor.execute(statement, (user_id,))
        except Exception as e:
            raise SQLiteException(f"Exception when reading the user {user_id} : {e}")
        
        results = (await self.cursor.fetchall())[0] # We fetch all so that it's always empty and "clean"

        user = {
            "user_id": results[4],
            "firstname": results[0],
            "lastname": results[1],
            "public_key": results[2],
            "private_key": results[3]
        }

        return user

    async def read_users_public_key(self, users) -> list[tuple[str, bytes]]:
        """
        [users] : a list of (user_id)
        """
        get_conversation_members_statement = f"SELECT user_id, public_key FROM users WHERE user_id IN ({','.join(['?']*len(users))});"

        try:
            await self.cursor.execute(get_conversation_members_statement, (*users,))
        except Exception as e:
            raise SQLiteException(f"Exception when reading users public key : {e}")

        output = await self.cursor.fetchall()

        return output # A list of (user_id, public_key)

    async def read_user_conversations(self, user_id) -> list[tuple[str, str, bytes]]:

        statement = "SELECT conversations FROM users WHERE user_id = ?"
        
        try:
            await self.cursor.execute(statement, (user_id,))
        except Exception as e:
            raise SQLiteException(f"Exception when reading {user_id}'s conversations : {e}")
        
        res = await self.cursor.fetchall()

        no_conversation = not res or not res[0] or not res[0][0]

        if no_conversation: # Empty conversation
            return []


        user_convs = msgpack.unpackb(res[0][0], use_list=False, raw=False)
        return user_convs

    async def read_user_encrypted_private_key(self, user_id) -> bytes: # maybe it's str, idk

        statement = "SELECT private_key FROM users WHERE user_id = ?"
        
        try:
            await self.cursor.execute(statement, (user_id,))
        except Exception as e:
            raise SQLiteException(f"Exception when reading {user_id}'s encrypted private key : {e}")
        
        res = await self.cursor.fetchall()

        if not res: # Should be said louder
            return ValueError(f"Could not find {user_id}'s private key")

        private_key = res[0][0]
        return private_key

    async def read_conversation_messages(self, conversation_id, size_limit: int = 10, first_message_timestamp: float = -1) -> list[tuple[float, str, str]]: # Should check with the password

        if first_message_timestamp >= 0:
            fetch_messages_statement = "SELECT sent_at, sender_id, content FROM messages WHERE conversation_id = ? AND sent_at >= ? ORDER BY sent_at DESC LIMIT ?" # We only fetch the ones after the desired date

            try:
                await self.cursor.execute(fetch_messages_statement, (conversation_id, first_message_timestamp, size_limit))
            except Exception as e:
                raise SQLiteException(f"Exception when reading the conversation [{conversation_id}] : {e}")

            return list(reversed(await self.cursor.fetchall())) # We fetch with DESC to have the more recent and then we reverse the results

        fetch_messages_statement = "SELECT sent_at, sender_id, content FROM messages WHERE conversation_id = ? ORDER BY sent_at DESC LIMIT ?" # It could be a good idea not to sort using the ID (donna if it should be ASC or DESC)

        try:
            await self.cursor.execute(fetch_messages_statement, (conversation_id, size_limit))
        except Exception as e:
            raise SQLiteException(f"Exception when reading the conversation [{conversation_id}] : {e}")
        
        return list(reversed(await self.cursor.fetchall())) # We fetch with DESC to have the more recent and then we reverse the results

    async def read_check_user_password(self, user_id: str, password_hash: bytes) -> Optional[bool]:
        """
            Check if the user's password is valid (the hash actually)
        """
        password_double_hash = crypto_utils.get_sha256_hash(password_hash) # We hash the hash
        # We could get even more safety by adding some sort of salt (the user id for example)

        get_conversation_members_statement = f"SELECT user_id, password_hash FROM users WHERE user_id = ?;"

        result = None

        try:
            async with self.connection.execute(get_conversation_members_statement, (user_id,)) as cursor:
                result = await cursor.fetchall()
            # await self.cursor.execute(get_conversation_members_statement, (user_id,))
            
        except Exception as e:
            raise SQLiteException(f"Exception when reading {user_id}'s password hash : {e}")

        # result = await self.cursor.fetchall()

        if not result:
            return None # Actually, the user doesn't exist

        user_result = result[0]

        actual_password_double_hash = user_result[1]

        return actual_password_double_hash == password_double_hash

    async def read_conversation_info(self, conversation_id):

        statement = "SELECT members, creator_id FROM conversations WHERE conversation_id = ?"

        try:
            await self.cursor.execute(statement, (conversation_id,)) # To change
        except Exception as e:
            raise SQLiteException(f"Exception when reading some data about the conversation {conversation_id} : {e}")

        results = (await self.cursor.fetchall())[0] # So that it's always clean

        return (results[0].split('|'), results[1])

    # ------------------ WRITE + READ --------------------------------

    async def write_new_user(self, firstname: str, lastname: str, user_id: str, public_key: bytes, private_key: bytes, password_hash: str):

        insert_statement = f"INSERT INTO users (firstname, lastname, user_id, public_key, private_key, password_hash) VALUES (?, ?, ?, ?, ?, ?);"

        double_hash = crypto_utils.get_sha256_hash(password_hash)

        try:
            await self.cursor.execute(insert_statement, (firstname, lastname, user_id, public_key, private_key, double_hash))
        except Exception as e:
            raise SQLiteException(f"Exception where creating a new user : {e}")
        
        await self.push_changes()

    async def write_new_conversation(self, creator_id, conversation_name) -> int:
        statement = f"INSERT INTO conversations (members, creator_id, conversation_name, created_at) VALUES (?, ?, ?, ?);"

        try:
            await self.cursor.execute(statement, (creator_id, creator_id, conversation_name, get_now_num()))
        except Exception as e:
            raise SQLiteException(f"Exception when creating a new conversation : {e}")
        
        await self.push_changes()

        return self.cursor.lastrowid # This is considered to be the conversation_id

    async def _new_members_update_conversations_lists(self, conversation_id: int, conversation_name: str, members: dict[str, bytes]):

        # For each user, add the conversation to their list of conversations
        
        get_members_conversations_query = f"SELECT user_id, conversations FROM users WHERE user_id IN ({','.join(['?']*len(members))});"

        try:
            await self.cursor.execute(get_members_conversations_query, (*members.keys(),)) # To get the IDs
        except Exception as e:
            raise SQLiteException(f"Exception when reading conversations members : {e}") # Is it the best way to signify an error ?

        members_conversations: list[str, bytes] = await self.cursor.fetchall()
        
        update_conversations_list_statement = "UPDATE users SET conversations = ? WHERE user_id = ?;"

        for user_id, user_conversations_encoded in members_conversations:

            encrypted_conversation_key = members[user_id]

            if user_conversations_encoded:
                user_conv_decoded = msgpack.unpackb(user_conversations_encoded, use_list=True, raw=False)
                if any(map(lambda x: x[0]==conversation_id, user_conv_decoded)): # The conversation is already there...
                    members.pop(user_id) # This pops inplace, so that can affect the list
                else:
                    user_conv_decoded.append((conversation_id, conversation_name, encrypted_conversation_key))
            else:
                user_conv_decoded = [(conversation_id, conversation_name, encrypted_conversation_key)]

            user_conv_reencoded = msgpack.packb(user_conv_decoded, use_bin_type=True)

            try:
                await self.cursor.execute(update_conversations_list_statement, (user_conv_reencoded, user_id))
            except Exception as e:
                raise SQLiteException(f"Exception when changing {user_id}'s conversations list : {e}")

    async def _conversation_update_members_list(self, conversation_id: int, members: dict[str, bytes]) -> list[str]:
        # Add the users to the conversation
        get_conv_members_statement = "SELECT members FROM conversations WHERE conversation_id = ?"

        try:
            await self.cursor.execute(get_conv_members_statement, (conversation_id,))
        except Exception as e:
            raise SQLiteException(f"Exception when reading the conversation {conversation_id} : {e}")
        
        results = (await self.cursor.fetchall())[0] # So that it's always clean

        conv_already_members: list[str] = results[0].split("|") # Basic way of storing the members

        for m in members.keys():
            if m not in conv_already_members and await self.does_user_exist(m): # Could be useful to check this edgecase
                conv_already_members.append(m)

        new_conv_members_str = "|".join(conv_already_members)

        write_new_conv_members_statement = "UPDATE conversations SET members = ? WHERE conversation_id = ?;"

        try:
            await self.cursor.execute(write_new_conv_members_statement, (new_conv_members_str, conversation_id))
        except Exception as e:
            raise SQLiteException(f"Exception when changing conversation[{conversation_id}]'s members list : {e}")

        return conv_already_members
    
    async def write_conversation_add_members(self, conversation_id: int, conversation_name: str, members: dict[str, bytes]):

        await self._new_members_update_conversations_lists(conversation_id, conversation_name, members)

        conversation_current_members = await self._conversation_update_members_list(conversation_id, members)

        await self.push_changes()

        return conversation_current_members

    async def write_new_message(self, conversation, message_encrypted, sender_id): # Should check with the password before

        statement_insert_message = f"INSERT INTO messages (conversation_id, content, sent_at, sender_id) VALUES (?, ?, ?, ?);"

        try:
            await self.cursor.execute(statement_insert_message, (conversation,message_encrypted, get_now_num(), sender_id))
        except Exception as e:
            raise SQLiteException(f"Exception when inserting a new message in conversation [{conversation}] : {e}")

        await self.push_changes()

    async def generate_new_registration_code(self) -> str:
        new_uuid = uuid.uuid4()
        short_encoded_uuii = shortuuid.encode(new_uuid)

        insert_statement = "INSERT INTO registrationcodes (code_uuid, delivered_by, delivered_at) VALUES (?, ?, ?);"

        try:
            await self.cursor.execute(insert_statement, (str(new_uuid), "rizom-dev", get_now_num()))
        except Exception as e:
            raise SQLiteException(f"Exception where creating a new registration code : {e}")
        
        await self.push_changes()

        return short_encoded_uuii

    async def check_registration_code(self, registration_code: str, delete = False) -> bool:

        uuid_to_test = shortuuid.decode(registration_code)

        statement = "SELECT code_uuid, delivered_by, delivered_at, associated_userid FROM registrationcodes WHERE code_uuid = ?"

        try:
            await self.cursor.execute(statement, (str(uuid_to_test),))
        except Exception as e:
            raise SQLiteException(f"Exception when reading the registration code {uuid_to_test} : {e}")
        
        results = await self.cursor.fetchall()

        valid = len(results) == 1 and not results[0][3] # 3 is to get associated_userid
        
        if delete:
            pass # Delete the code so that no one can use it anymore

        return valid
    
    async def mark_registration_code_as_used(self, registration_code: str, userid: str):

        uuid_to_test = shortuuid.decode(registration_code)

        statement = "UPDATE registrationcodes SET associated_userid = ? WHERE code_uuid = ?;"

        try:
            await self.cursor.execute(statement, (userid, str(uuid_to_test)))
        except Exception as e:
            raise SQLiteException(f"Exception when marking the registration code {uuid_to_test} : {e}")
        
        await self.push_changes()

    async def match_marked_registration_code(self, registration_code: str, userid: str, delete = False):

        uuid_to_test = shortuuid.decode(registration_code)

        statement = "SELECT associated_userid FROM registrationcodes WHERE code_uuid = ?;"

        try:
            await self.cursor.execute(statement, (str(uuid_to_test),))
        except Exception as e:
            raise SQLiteException(f"Exception when reading the registration code {uuid_to_test} : {e}")
        
        results = await self.cursor.fetchall()

        if not results:
            return False
        
        if not results[0]:
            return False
        
        if not results[0][0]:
            return False
        
        if results[0][0] != userid:
            return False
        
        return True