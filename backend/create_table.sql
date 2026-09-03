CREATE TABLE users (
    user_key INTEGER PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    conversations BLOB,
    public_key BLOB NOT NULL,
    private_key BLOB NOT NULL,
    password_hash BLOB NOT NULL,
    languages_spoken BLOB,
    interests BLOB
);

CREATE TABLE conversations (
    conversation_id INTEGER PRIMARY KEY,
    conversation_name TEXT NOT NULL,
    members BLOB NOT NULL,
    creator_id TEXT NOT NULL,
    created_at REAL NOT NULL
    -- It's quite weird not to stock any key, here but on the other hand, it would not make sense. The key on the users table must not be lost, otherwise it's impossible to participate back to the conversation.
);

CREATE TABLE messages (
    message_id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    content BLOB NOT NULL,
    sent_at REAL NOT NULL,
    sender_id TEXT NOT NULL,

    FOREIGN KEY (conversation_id)
        REFERENCES conversations (conversation_id)
            ON DELETE CASCADE 
            ON UPDATE NO ACTION,
    FOREIGN KEY (sender_id)
        REFERENCES users (user_id)
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
);

CREATE TABLE registrationcodes (
    code_uuid TEXT NOT NULL, -- The UUID (Universally Unique Identifier) associated with the code
    delivered_by TEXT NOT NULL, -- The authority (Rizom, school...) that delivered this registration code
    delivered_at REAL NOT NULL, -- The time when the code was delivered.
    associated_userid TEXT -- If the code is associated with a user.
);