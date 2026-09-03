// -----------------------------------------------------------------------


// It's vital to make sure everyone agrees on this, otherwise it's a huge headache.
const PRIVATE_KEY_HEADER = "-----BEGIN PRIVATE KEY-----\n";
const PRIVATE_KEY_FOOTER = "\n-----END PRIVATE KEY-----";
const PUBLIC_KEY_HEADER = "-----BEGIN PUBLIC KEY-----\n";
const PUBLIC_KEY_FOOTER = "\n-----END PUBLIC KEY-----";

// ----------------------------------Encoding/Decoding-------------------------------------

// #section

/**
 * 
 * @param {ArrayBuffer} buf 
 * @returns String
 */
export function abToStr(buf) {
    return String.fromCodePoint.apply(null, new Uint8Array(buf));
}

/**
 * 
 * @param {String} str 
 * @returns ArrayBuffer
 */
export function strToAb(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.codePointAt(i);
    }
    return buf;
}

/**
 * 
 * @param {Int} number 
 * @param {Int} length_in_bytes 
 * @param {String} byteorder 
 * @returns {Uint8Array|undefined}
 */
export function int_to_bytes(number, length_in_bytes, byteorder='big') {

    let byteArray = new Array(length_in_bytes).fill(0);

    if (byteorder == "little") {
        for ( let index = 0; index < byteArray.length; index ++ ) {
            let byte = number & 0xff;
            byteArray [ index ] = byte;
            number = (number - byte) / 256 ;
        }
    } else if (byteorder == 'big') {
        for ( let index = 0; index < byteArray.length; index ++ ) {
            let byte = number & 0xff;
            byteArray [ length_in_bytes - index - 1 ] = byte;
            number = (number - byte) / 256 ;
        }
    } else {
        console.error("byteorder must be either 'little' or 'big'");
        return undefined;
    }

    return byteArray;

}

/**
 * 
 * @param {Int[]} bytes 
 * @param {String} byteorder 
 * @returns {Int}
 */
export function int_from_bytes(bytes, byteorder='big') {
    let little_ordered = undefined;

    if (byteorder == 'little') little_ordered = bytes
    else if(byteorder == 'big') little_ordered = bytes.reverse()
    else console.error("byteorder must be either 'little' or 'big'");

    let n = 0
    for(const i in little_ordered) {
        n += little_ordered[i] << i*8;
    }

    return n
}

/**
 * Padding using: PKCS7 algorithm
 * @param {Uint8Array} array 
 * @param {Int} n 
 * @returns Uint8Array
 */
export function add_padding(array, n) {
    let len = array.length;
    let rest = len % n;
    let to_add = n - rest;

    let to_add_array = new Uint8Array(to_add).fill(to_add);

    let result = new Uint8Array(len + to_add);
    result.set(array);
    result.set(to_add_array, len);

    return  result;
}

/**
 * Remove the padding : PKCS7 algorithm
 * @param {Uint8Array} array 
 * @param {Int} n 
 * @returns Uint8Array
 * It's easy to know how many to remove, since if it is a multiple of n, n bytes are added, therfore the last element indicates how many were added.
 */
export function remove_padding(array, n) {
    let len = array.length;
    let last_element = array[len - 1];

    return array.subarray(0, len - last_element);
}

/**
 * Turn a String into the equivalent Uint8Array
 * @param {String} str 
 * @returns {Uint8Array}
 */
export function str_to_uint8array(str) {
    let array = new Uint8Array(str.length);
    for(const idx in str) array[idx] = str[idx].codePointAt();
    return array;
}

/**
 * Turn a Uint8Array into the equivalent String
 * @param {Uint8Array} uint8array 
 * @returns {String}
 */
export function uint8array_to_str(uint8array) {
    return String.fromCodePoint(...uint8array)
}

/**
 * Turn a String into the equivalent Uint16Array
 * @param {String} str 
 * @returns {Uint16Array}
 */
export function str_to_uint16array(str) {
    let array = new Uint16Array(str.length);
    for(const idx in str) array[idx] = str[idx].codePointAt();
    return array;
}

/**
 * Turn a Uint16Array into the equivalent String
 * @param {Uint16Array} uint8array 
 * @returns {String}
 */
export function uint16array_to_str(uint16array) {
    return String.fromCodePoint(...uint16array)
}

/**
 * Turns a unicode string into a ascii string (representable as bytes)
 * @param {String} unicodeString 
 * @returns {String}
 * In order to send unicode string where characters are 2 bytes large, it's necessary to go through this process, first make a uint16array from the unicode string, them turn into a uint8array twice as large, and finally turn this uint8array into an ascii string.
 */
export function unicodeStrToAsciiStr(unicodeString) {
    const uint16Array = str_to_uint16array(unicodeString);
    const uint8Array = new Uint8Array(uint16Array.buffer);
    const asciiStr = uint8array_to_str(uint8Array);
    return asciiStr;
}

/**
 * Turns a Uint8Array, representing an ascii string, into a unicode string
 * @param {Uint8Array} uint8Array 
 * @returns {String}
 * We go through the inverse process: turn the Uint8Array into a Uint16Array half as big, and then turn this Uint16Array into a unicode string.
 */
export function uint8ArrayToUnicodeStr(uint8Array) {
    const uint16array2 = new Uint16Array(uint8Array.buffer);
    const unicodeString = uint16array_to_str(uint16array2);
    return unicodeString;
}

/*----------------------Hashing----------------------------*/

/**
 * Get the Sha256 hash of some data
 * @param {ArrayBuffer} data The data to hash
 * @returns {Promise<ArrayBuffer>}
 */
export async function hashSha256(data) {
    return await window.crypto.subtle.digest("SHA-256", data);
}

/**
 * 
 * @param {ArrayBuffer} data 
 * @returns {String} The Hexadecimal encoded string
 */
export function abToHexStr(data) {
    const hashArray = Array.from(new Uint8Array(data));
    // convert buffer to byte array
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/*----------------------AES Symmetric encryption----------------------------*/

/**
 * 
 * @param {String} password 
 * @returns Promise < KeyMaterial >
 */
export function AES_getKeyMaterial(password) {
    return window.crypto.subtle.importKey(
      "raw",
      str_to_uint8array(password), // I just changed from str_to_bytes to str_to_uint8array
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"],
    );
}

/**
 * Returns a key from a password, a salt and a number of iterations
 * @param {String} password The salt from which to derive the key
 * @param {Uint8Array} salt The salt to use, every encryption uses a different salt, this way, it's harder to crack the password. This is more requiring in terms of computing power, but it's worth it.
 * @param {Int} iterations Number of iterations
 * @returns {Promise<Key>} The key object to use to decrypt data
 */
export async function AES_getKey(password, salt, iterations) {
    const keyMaterial = await AES_getKeyMaterial(password);

    const key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt,
          iterations,
          hash: "SHA-256",
        },
        keyMaterial,
        { "name": "AES-CTR", "length": 256},
        true,
        ["encrypt", "decrypt"],
    );

    return key;
}

/**
 * Encrypt some data with a key
 * @param {ArrayBuffer} data The data to encrypt
 * @param {Key} key The key to use to encrypt
 * @param {Uint8Array} counter Used for encryption
 * @returns {Promise<ArrayBuffer>} The encrypted data
 */
export async function AES_encryptWithKey(data, key, counter) {

    let r = await window.crypto.subtle.encrypt(
        { name: "AES-CTR", counter, length: 128 },
        key,
        data,
    );

    return r;

}

/**
 * Decrypt some data using the key used to encrypt it
 * @param {ArrayBuffer} data The data to decrypt
 * @param {Key} key The key that was used to encrypt the data
 * @param {Uint8Array} counter The counter that was used to encrypt the data
 * @returns {Promise<ArrayBuffer>} The decrypted data
 */
export function AES_decryptWithKey(data, key, counter) {

    return window.crypto.subtle.decrypt(
        { name: "AES-CTR", counter, length: 128 },
        key,
        data
    )
}

/**
 * Turn some data into a beautiful bundle that is sendable
 * @param {String} message_to_encrypt 
 * @param {String} password 
 * @returns {Promise< Bundle<Base64String> >} The string, corresponds to the bundle, everything encoded into base 64.
 */
export async function AES_encryptBundle(message_to_encrypt, password) {
    
    let salt = window.crypto.getRandomValues(new Uint8Array(16));

    let key = await AES_getKey(password, salt, 100_000);

    let iv = await window.crypto.getRandomValues(new Uint8Array(16));

    let message_as_array = str_to_uint8array(message_to_encrypt);

    let padded_message = add_padding(message_as_array, 16); // AES uses 16 bytes;

    let encrypted = await AES_encryptWithKey(padded_message.buffer, key, iv);

    // Turn them into format easier to work with
    const encrypted_array = new Uint8Array(encrypted); 
    const iterations = int_to_bytes(100_000, 4);

    if(iterations == undefined) {
        throw Error("iterations was not correctly encoded.")
    }

    // First we put every byte in the array (the byte are still in int form)
    const total_length = salt.length + iv.length + 4 + encrypted_array.length;
    let array_to_bundle = new Uint8Array(total_length);
    array_to_bundle.set(salt);
    array_to_bundle.set(iv, salt.length);
    array_to_bundle.set(iterations, salt.length + iv.length);
    array_to_bundle.set(encrypted_array, salt.length + iv.length + 4);

    // Then we turn this array of ints into a string
    let string_to_encode = uint8array_to_str(array_to_bundle);

    // At last, we encode the string
    let res = window.btoa(string_to_encode);

    return res;

}

/**
 * 
 * @param {String} full_token A Base64 encoded String.
 * Of this format  :
 * -  0  - 16 : Salt
 * -  16 - 32 : Init Vector
 * -  32 - 36 : Number of iterations in bytes
 * -  36 +    : Encoded message
 * @param {String} password 
 * @returns {Uint8Array}
 */
export async function AES_decryptBundle(full_token, password) {

    const decoded = window.atob(full_token);

    const salt = decoded.slice(0, 16);
    const iv = decoded.slice(16, 32);
    const iter_ = decoded.slice(32, 36);
    const token = decoded.slice(36);

    // Turn all these strings into buffer, numbers and exploitable binary data.
    const salt_array = str_to_uint8array(salt);
    const token_array = str_to_uint8array(token);;
    const iv_array = str_to_uint8array(iv);
    const iter = int_from_bytes(str_to_uint8array(iter_), "big");

    const key = await AES_getKey(password, salt_array, iter);

    const decrypted_buffer = await AES_decryptWithKey(token_array, key, iv_array);

    const decrypted = new Uint8Array(decrypted_buffer);

    const unpadded_decrypted = remove_padding(decrypted, 16); // 16 : 16 bytes of padding

    // We create a new buffer whose size is different. This is because the old buffer still contains the padded bytes, even though the Uint8Array which we use to interface has been reduced.
    let newArray = new Uint8Array(unpadded_decrypted);

    return newArray;

}

export async function AES_generateSymmetricKey() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return array;
}

/*----------------------RSA Asymmetric encryption----------------------------*/

/**
 * Export a public key into PEM format.
 * @param {PublicKey} key
 * @returns Promise <String> : The PEM of this key (based 64 with the markers)
 */
export async function RSA_exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey(
      "spki",
      key
    );
    const exportedAsString = abToStr(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `${PUBLIC_KEY_HEADER}${exportedAsBase64}${PUBLIC_KEY_FOOTER}`;
  
    return pemExported;
}

/**
 * Import a public key from PEM format.
 * @param {String} pem The representation of the public key (with the markers)
 * @returns Promise <PublicKey>
 */
export function RSA_importPublicKey(pem) {
    // fetch the part of the PEM string between header and footer
    const pemContents = pem.substring(PUBLIC_KEY_HEADER.length, pem.length - PUBLIC_KEY_FOOTER.length);

    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = strToAb(binaryDerString);

    return window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["encrypt"]
    );
  }

/**
 * Export a private key into PEM format.
 * @param {PrivateKey} key
 * @returns Promise <String> : The PEM of this key (based 64 with the markers)
 */
export async function RSA_exportPrivateKey(key) {
    const exported = await window.crypto.subtle.exportKey(
        "pkcs8",
        key
    );
    const exportedAsString = abToStr(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `${PRIVATE_KEY_HEADER}${exportedAsBase64}${PRIVATE_KEY_FOOTER}`;
    return pemExported;
}

/**
 * Import a private key from PEM format.
 * @param {String} pem The representation of the private key (with the markers)
 * @returns Promise <PrivateKey>
 */
export async function RSA_importPrivateKey(pem) {

    // const pemContents = pem.substring(pemHeader.length + 1, pem.length - pemFooter.length - 2); // +/- 1/2 is to account for the \n chars.

    let pemContents = pem.substring(PRIVATE_KEY_HEADER.length, pem.length - PRIVATE_KEY_FOOTER.length);

    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = strToAb(binaryDerString);
  
    return await window.crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
}

/**
 * Encrypt some data using a public key
 * @param {PublicKey} publicKey 
 * @param {ArrayBuffer} to_encrypt 
 * @returns Promise < ArrayBuffer >
 */
export function RSA_publicKeyEncrypt(publicKey, to_encrypt) {
    return window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        to_encrypt
    );
  }

/**
 * Decrypt some data that was encrypted with correspondant public key
 * @param {PrivateKey} privateKey 
 * @param {ArrayBuffer} to_decrypt 
 * @returns Promise < ArrayBuffer >
 */
export function RSA_privateKeyDecrypt(privateKey, to_decrypt) {
    return window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        to_decrypt
    );
}

export async function RSA_generateKeyPair() {
    let keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
    return keyPair;
}

/*----------------------API interaction----------------------------*/

const POSSIBLE_MESSSAGE_TYPES = [
    "text",
    "link",
    "answer",
]

// const API_URL = "https://api.rizom.eu" // becomes https
// const WS_API_URL = "wss://api.rizom.eu" // becomes wss
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const WS_API_URL = import.meta.env.VITE_WS_API_URL || "ws://127.0.0.1:8000";

const URLs = {
    checkCreds: `${API_URL}/user/check-user`,
    getPublicKey: `${API_URL}/user/get-public-key`,
    getPrivateKey: `${API_URL}/user/get-private-key`,
    getConversationsList: `${API_URL}/user/get-conversations-list`,
    getConversationInfo: `${API_URL}/conversation/get-conversation-info`,
    getConversationContent: `${API_URL}/conversation/read-conversation-content`,
    writeNewMessage: `${API_URL}/conversation/write-new-message`,
    createNewConversation: `${API_URL}/conversation/create-new`,
    inviteNewMemberToConversation: `${API_URL}/conversation/invite-new-member`,
    connectWS: `${WS_API_URL}/connect-ws`,
    getNewUserId: `${API_URL}/user/get-new-user-id`,
    registerNewuser: `${API_URL}/user/register-new-user`,
    writeUserInterests: `${API_URL}/user/write-interests`,
    writeUserLanguages: `${API_URL}/user/write-languages`,
    readUserInterests: `${API_URL}/user/read-interests`,
    readUserLanguages: `${API_URL}/user/read-languages`,
}

export async function checkUserCredentials(userid, password) {

    const userPasswordAB = strToAb(`${password}${userid}`);
  
    const passwordHash = await hashSha256(userPasswordAB);
    const passwordHashHex = abToHexStr(passwordHash);

    return fetch(
        URLs.checkCreds + "?" + new URLSearchParams({
            userid: userid,
            password: passwordHashHex,
        }).toString(),
        {
            method: 'GET'
        }
    )
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                throw Error(data.error);
            }

            return data.result;

        });
}

/**
 * Fetch the user's private key and decrypts it.
 * @param {String} userid 
 * @param {String} password 
 * @returns {PrivateKey} The private key, ready to be used
 */
export function fetchPrivateKey(userid, password, passwordHash) {
    return fetch(
        URLs.getPrivateKey + "?" + new URLSearchParams({
            userid: userid,
            password: passwordHash,
        }).toString(),
        {
            method: 'GET'
        }
    )
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            const unbundled = await AES_decryptBundle(data, password);

            const strFromBundle = abToStr(unbundled);

            return await RSA_importPrivateKey(strFromBundle);

        });
}

export function fetchConversationsList(userid, password) {
    return fetch(
        URLs.getConversationsList + "?" + new URLSearchParams({
            userid: userid,
            password: password,
        }).toString(),
        {
            method: 'GET'
        }
    )
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            return data;

        });
}

export function fetchConversationInfo(userid, password, conversationid) {
    return fetch(
        URLs.getConversationInfo + "?" + new URLSearchParams({
            userid: userid,
            password: password,
            conversationid: conversationid
        }).toString(),
        {
            method: 'GET'
        }
    )
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            return data;

        });
}

/**
 * 
 * @param {} privateKey 
 * @param {} conversationKey 
 * @returns {Promise<String>}
 */
export async function decryptConversationKey(privateKey, conversationKey) {

    let conversationKeyEncrypted = window.atob(conversationKey);

    let conversationKeyAB = await RSA_privateKeyDecrypt(privateKey, strToAb(conversationKeyEncrypted));

    return abToStr(conversationKeyAB);
}

export async function fetchConversationContent(userid, password, conversationId, conversationKey, lastMessageTime) {
    let conversationContent = [];

    // 4.2 Fetch the messages
    await fetch(URLs.getConversationContent + "?" + new URLSearchParams({
        userid: userid,
        password: password,
        conversationid: conversationId.toString(),
        lastmessagetime: lastMessageTime.toString(), // lastMessageTime is a float
    }).toString(), {method: 'GET'})
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return;
            }

            for(const conv of data) {
                let messageContent = uint8ArrayToUnicodeStr(await AES_decryptBundle(conv[2], conversationKey));

                let messageContentObject = JSON.parse(messageContent);

                conversationContent.push([conv[0], conv[1], messageContentObject]);
            }

        });

    return conversationContent;
}

export async function postNewMessage(userid, password, conversationId, conversationKey, messageContent, messageType = "text", messageExtraInfo = {}) {

    if(!POSSIBLE_MESSSAGE_TYPES.includes(messageType)) {
        throw Error("The message type is not valid.");
    }

    let messageObject = undefined;

    switch(messageType) {
        case "text":
        case "link":
            messageObject = {
                type: messageType,
                content: messageContent,
                "extra-data": {},
            }
            break;

        case "answer":
            messageObject = {
                type: messageType,
                content: messageContent,
                "extra-data": {
                    answeredMessage: messageExtraInfo.answeredMessage,
                },
            }
            break;

        default:
            break;
    }

    if(!messageObject) return;

    const messageStringObject = JSON.stringify(messageObject)

    const uint8str = unicodeStrToAsciiStr(messageStringObject);

    let encryptedNewMessage = await AES_encryptBundle(uint8str, conversationKey);


    return await fetch(URLs.writeNewMessage + "?" + new URLSearchParams({
        userid: userid,
        password: password,
        conversationid: conversationId,
    }).toString(), {
        method: 'POST',
        body: JSON.stringify({
            "message_bundle": encryptedNewMessage,
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
    })
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return false;
            }

            if(data.ok) {
                return true;
            }

        });
}

export async function createNewConversation(userid, password, conversationMembers, conversationName) {

    let searchParams = new URLSearchParams({
        userid: userid,
        password: password,
    });
    for (const other_user_id of conversationMembers) {
        searchParams.append('required_users_ids', other_user_id);
    }

    let validMembers = {}

    // Get all the members' public key
    await fetch(
        URLs.getPublicKey + "?" + searchParams.toString(),
        {
            method: 'GET'
        }
    )
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            for (const el of data) {
                validMembers[el[0]] = el[1];
            }

        });

    let conversationId = undefined;
    // let conversationId = 2; // DEBUG: In order not to create a thousand conversations...

    await fetch(
        URLs.createNewConversation + "?" +  new URLSearchParams({
            userid: userid,
            password: password,
        }).toString(),
        {
            method: 'POST'
        }
    )
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            conversationId = data.conversation_id;

        });

    // Create an empty conversation
    // Retrieve the conversation key
    // --> Fully create a conversation key

    const newConversationKey = await AES_generateSymmetricKey();

    // Invite the members to the conversation

    const encryptedKeys = {}

    for(const userid in validMembers) {
        const userPublicKey = await RSA_importPublicKey(validMembers[userid]);
        const conversationKeyEncrypted = await RSA_publicKeyEncrypt(userPublicKey, newConversationKey.buffer);
        const base64conversationKeyEncrypted = window.btoa(abToStr(conversationKeyEncrypted));
        encryptedKeys[userid] = base64conversationKeyEncrypted;
    }

    await fetch(
            URLs.inviteNewMemberToConversation + "?" +  new URLSearchParams({
                userid: userid,
                password: password,
            }).toString(),
            {
                method: 'PUT',
                body: JSON.stringify({
                    conversation_id: conversationId,
                    conversation_name: conversationName,
                    new_members: encryptedKeys,
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                  }
            }
        )
            .then(response=>(response.json()))
            .then(async data=>{
    
                if(data.error) {
                    console.error(data.error);
                    return undefined;
                }

                if(data.ok) {
                    return true;
                }
    
            });

    // Invite oneself, but automatically accept the invitation ?

}

class RegistrationCodeAlreadyUsedError extends Error {
    constructor(registrationCode = "", ...args) {
        super(registrationCode, ...args);
        this.message = `The code ${registrationCode} has already been used.`;
    }
}

export async function registerUser(firstname, lastname, registrationCode, birthYear, password) {

    // Check the code and get an id
    const userId = await fetch(URLs.getNewUserId + "?" + new URLSearchParams({}).toString(), {
        method: 'POST',
        body: JSON.stringify({
            firstname: firstname,
            lastname: lastname,
            registration_code: registrationCode,
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
    })
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                if(data.error == "registration-code-unfound-or-used") {
                    throw new RegistrationCodeAlreadyUsedError(registrationCode);
                }
                return undefined;
            }

            if(data.ok) {
                return data.userid;
            }

        });
    
    // if(!userId) throw Error("There is a problem with the returned user id.");
    if(!userId) return false;

    // Generate the keys and encrypt them
    const keyPair = await RSA_generateKeyPair();
    const privateKey = await RSA_exportPrivateKey(keyPair.privateKey);
    const publicKey = await RSA_exportPublicKey(keyPair.publicKey);
    const encryptedPrivateKey = await AES_encryptBundle(privateKey, password);

    // Hash the password
    const userPasswordAB = strToAb(`${password}${userId}`);
  
    const passwordHash = await hashSha256(userPasswordAB);
    const passwordHashHex = abToHexStr(passwordHash);

    // Send everything
    const response =  await fetch(URLs.registerNewuser + "?" + new URLSearchParams({}).toString(), {
        method: 'POST',
        body: JSON.stringify({
            firstname: firstname,
            lastname: lastname,
            registration_code: registrationCode,
            userid: userId,
            birth_year: birthYear,
            public_key: publicKey,
            private_key: encryptedPrivateKey,
            password_hash: passwordHashHex,
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
    })
        .then(response=>(response.json()))
        .then(async data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            if(data.ok) {
                return data.userid;
            }

        });

    return [userId, passwordHashHex]

}

export async function setUserLanguagesAndInterests(userid, password, languagesObject, interestsObject) {

    const responseInterests = await fetch(URLs.writeUserInterests + "?" + new URLSearchParams({
        userid: userid,
        password: password,
    }).toString(), {
        method: 'PUT',
        body: JSON.stringify({
            interests: JSON.stringify(interestsObject)
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
          }
    })
        .then(response=>(response.json()))
        .then(data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            if(data.ok) {
                return data;
            }

        });

    const responseLanguages = await fetch(URLs.writeUserLanguages + "?" + new URLSearchParams({
        userid: userid,
        password: password,
    }).toString(), {
        method: 'PUT',
        body: JSON.stringify({
            languages: JSON.stringify(languagesObject)
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
            }
    })
        .then(response=>(response.json()))
        .then(data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            if(data.ok) {
                return data;
            }

        });

}

export async function getUserLanguagesAndInterests(userid, password) {
    const languagesResponse = await fetch(URLs.readUserLanguages + "?" + new URLSearchParams({
        userid: userid,
        password: password,
    }).toString(), {
        method: 'GET',
    })
        .then(response=>(response.json()))
        .then(data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            if(data.ok) {
                return data.languages; // If the user has no languages, the value will be undefined.
            }

        });
    const interestsResponse = await fetch(URLs.readUserInterests + "?" + new URLSearchParams({
        userid: userid,
        password: password,
    }).toString(), {
        method: 'GET',
    })
        .then(response=>(response.json()))
        .then(data=>{

            if(data.error) {
                console.error(data.error);
                return undefined;
            }

            if(data.ok) {
                return data.interests; // If the user has no interests, the value will be undefined.
            }

        });

    return [
        languagesResponse[1],
        interestsResponse[1],
    ]
}

/*---------------------- API WS interaction----------------------------*/

export function WS_initConnection(messageHandler) {
    let ws = new WebSocket(URLs.connectWS);
    ws.onmessage = messageHandler(ws); // Generate the handler using the ws instance
    return ws;
}

export function WS_updateConnection(ws, newMessageHandler) {
    ws.onmessage = newMessageHandler(ws);
}

export function WS_sendMessage(ws, message) {
    ws.send(message);
}



/* -------------------------------- TEST -------------------------------- */

const main = async () => {

    const user = {
        id: "Max@Well",
        password: "helloworld"
    }

    const userPasswordAB = strToAb(`${user.password}${user.id}`); // We mix the password and the user id to protect against dictionnary attack. If an attacker wants to crack the password, he will have to compute all his dictionnary of password adding each userid, this will greatly increase the time he will need to find the password, especially if the password is strong.

    const passwordHash = await hashSha256(userPasswordAB);
    const passwordHashHex = abToHexStr(passwordHash);

    const privateKey = await fetchPrivateKey(user.id, user.password, passwordHashHex);

    if(!privateKey) {
        console.error("Couldn't fetch the private key...")
        return;
    }

    // await createNewConversation(user.id, user.password, ["Max@Well", "Albert@Einstein"]);

    const conversations = await fetchConversationsList(user.id, passwordHashHex);

    if(!conversations) {
        console.error("Couldn't grab the conversations");
        return;
    } else if(conversations.length === 0) {
        console.warning("The user doesn't have any conversation");
        return;
    }

    let firstConversation = conversations[0];


    const firstConversationKeyStr = await decryptConversationKey(privateKey, firstConversation[2]);

    // 4. Get the messages of the first conversation

    const firstConversationContent = await fetchConversationContent(user.id, passwordHashHex, firstConversation[0], firstConversationKeyStr);

    // 5. Send a message

    // let messageToSend = window.prompt("Please, enter the message you want to send : ", "");


    // const messageWasPosted = postNewMessage(user.id, passwordHashHex, firstConversation[0], firstConversationKeyStr, messageToSend )

    // 6. Create a conversation

    // await createNewConversation(user.id, passwordHashHex, ["Max@Well", "Albert@Einstein", "invalid@user"])

    return;

}
