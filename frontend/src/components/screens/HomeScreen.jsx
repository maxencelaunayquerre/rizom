import React, { useState, useEffect, useReducer, useRef, Suspense } from 'react'
import TextareaAutosize from 'react-textarea-autosize';

import { useLocation, useNavigate  } from 'react-router-dom';

import { ArrowLeftOnRectangleIcon, Cog6ToothIcon, UserCircleIcon, ChatBubbleLeftRightIcon, ArrowSmallLeftIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/solid'

import { strToAb, hashSha256, abToHexStr, fetchPrivateKey, fetchConversationsList, decryptConversationKey, fetchConversationContent, postNewMessage, WS_initConnection, WS_sendMessage, fetchConversationInfo, createNewConversation, getUserLanguagesAndInterests } from '../../lib';

import ConversationContent from '../ConversationContent';
import LoadingSpinner from '../LoadingSpinner';

const CreateConversationScreen = React.lazy(() => import("./CreateConversationScreen"));

const LanguageLevelsList = [
  "", "Débutant", "Intermédiaire", "Avancé", "Bilingue"
]


function conversationsMessagesReducer(state, action) {
  switch (action.type) {
    case 'set-conversation':
      state.conversations[action.conversationIdx] = action.newConversation;
      return {...state};
    // The following seems useless for now...
    // case 'add-message': 
    //   if(!state.conversations[action.conversationIdx]) throw new Error("Invalid conversationIdx.");
    //   state.conversations[action.conversationIdx].push(action.newMessage)
    //   return {...state}; // DEBUG: Will it call an update ?
    // I can add other types of action like delete message for example, but i'll have to keep that in sync with the server...
    default:
      throw new Error("Invalid action type.");
  }
}

const SidebarScreen = {
  Rizom: 0,
  Conversations: 1,
  Profile: 2,
  Settings: 3,
  CreateConversation: 4,
}

const SidebarIcon = ({ icon, text = "", style = "", onClick = undefined, mobile = false }) => (
  <div onClick={onClick} className={"flex items-center justify-center \
  h-14 lg:h-16 w-14 lg:w-16 mt-2 mb-2  \
  mx-auto shadow-lg \
  bg-slate-100 text-rizom-color \
  hover:bg-rizom-color hover:text-slate-100 \
  rounded-3xl hover:rounded-xl \
  transition-all duration-300 ease-linear \
  cursor-pointer group " + style}>
    {icon}
    {
      (text != "" && !mobile) ? <span className="absolute w-auto p-2 m-2 min-w-max left-[4.5rem]
      rounded-md shadow-md
      text-white bg-gray-900 
      text-lg font-bold font-oswald select-none
      transition-all duration-100 scale-0 origin-left group-hover:scale-100">{text}</span> : <></>
    }
  </div>
)

const HomeScreen = ({ isMobile }) => {

    // ---------------- Declare variables ----------------

    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(undefined);
  
    const [conversationsMessages, setConversationsMessages] = useReducer(conversationsMessagesReducer, {
      conversations: {} // Is it a problem that the object is defined literally?
    });
  
    const [selectedSidebar, setSelectedSidebar] = useState(SidebarScreen.Conversations);
    const [init, setInit] = useState(false);
    const [conversationSelected, setConversationSelected] = useState(window.matchMedia("only screen and (max-width: 480px)").matches ? -1 : 0);
    const [newMessagePrompt, setNewMessagePrompt] = useState("");
    const [passwordHashHex, setPasswordHashHex] = useState(undefined); // If this is saved in disk, someone can steal it...
    const [conversations, setConversations] = useState(undefined);
    /* A list of list : [[databaseID, conversationName, conversationKeyEncrypted, conversationKeyDecrypted, conversationMembers, conversationCreator]] */
    const [privateKey, setPrivateKey] = useState(undefined);
    const [ws, setws] = useState(null);
    const wsRef = useRef();
    const lastMsgRef = useRef();
    const conversationsRef = useRef(); // Should be used in read-only
    conversationsRef.current = conversations;
    const [userInterests, setUserInterests] = useState(undefined);
    const [userLanguages, setUserLanguages] = useState(undefined);

  
    const [answeringMessage, setAnsweringMessage] = useState(null);

    // ---------------- Declare functions ----------------

    

    function logout() {
      navigate("/login");
    }
    
    /**
     * The ID of a conversation in the database is not the same as the ID of the conversation on this client storage. This functions helps to get the latter from the first.
     * @param {Int} conversationid The ID of the conversation in the DATABASE
     * @returns {Int|null} The ID of the conversation on the local storage
     */
    function findCorrespondingLocalConversationID (conversationid) {
      const convs = conversationsRef.current;
      for(const conversation in convs) {
          if(convs[conversation][0] == conversationid ) return conversation;
      }
      return null;
    }
    
    const loadConversationFromServer = async (idx) => {

      const conversation = conversationsRef.current[idx];

      const conversationKeyStr = conversation[3];

      let currentMessages = conversationsMessages.conversations[parseInt(idx)];
      const lastMessage = currentMessages[currentMessages.length - 1];
      const lastMessageTime = (lastMessage ? lastMessage[0] : 0.0);

      const newMessages = await fetchConversationContent(user.id, passwordHashHex, conversation[0], conversationKeyStr, lastMessageTime);

      // Here, since we have given the time of the last message, the filter doesn't remove the message. In order not to have this message twice, we remove it in the list of new messages.
      // This could lead to bugs if two messages are sent at the exact same time.
      // Once in a while, we could fetch the whole conversation to make sure nothing has escaped us.
      const newConversationContent = (currentMessages.length > 0) ? currentMessages.concat(newMessages.slice(1)) : newMessages;

      setConversationsMessages({
          type: 'set-conversation',
          conversationIdx: parseInt(idx),
          newConversation: newConversationContent,
      })

    }
    
    /**
     * Generate a callback function to handle when the client's websocket receives data
     * @param {Websocket} ws The websocket instance for which the callback is being generated
     * @returns A callback function that can be associated to the websocket
     */
    const generateWScallbackFunction = (ws) => ( async (event) => {

    const message = JSON.parse(event.data);

    switch(message.type) {
      case "welcome": // Should only be received when a ws is opened
        // Is it really a good idea to subscribe to every conversation ? At some point the old conversation that no one uses anymore doesn't need to be updated right ?
        WS_sendMessage(ws, JSON.stringify({
            type: "new_conv_subscribe",
            data: {
              userid: user.id,
              password_hash: passwordHashHex,
            }
          }))
        for(const conversation of conversations) {
              WS_sendMessage(ws, JSON.stringify({
              type: "subscribe",
              data: {
                  userid: user.id,
                  password_hash: passwordHashHex,
                  conversation_id: conversation[0],
              }
              }))
          }
          break;

        case "news":
        switch(message.data.event) {
            case "new-message":
              const conversationLocalID = findCorrespondingLocalConversationID(message.data.conversation_id);
              setTimeout(loadConversationFromServer, 1000, [conversationLocalID]);
              break;
            
            case "new-conversation":
              await updateConversationList();
              break;

            case "new-member":
            break;

            case "new-reaction":
            break;

            case "new-answer":
            break;

            default:
            break;
        }
        break;

        case "error":
        break;

        default:
        break;
    }
    });

    const updateConversationList = async () => {

      // 1. Fetch the conversations

      let _conversations = await fetchConversationsList(user.id, passwordHashHex); // passwordHashHex may be undefined if the function is called to soon compared to the first passwordHashHex set.

      if(!_conversations) {
          console.error("Couldn't update the conversations");
          return;
      } else if(_conversations.length === 0) {
          return;
      }

        for(let conv in _conversations) {

          // 2. Check if it is a new conversation or not
            // If it is not a new conversation : Skip

          let conversation = _conversations[conv];

          let alreadyExistingConversationID = findCorrespondingLocalConversationID(conversation[0])

          if(alreadyExistingConversationID != null) {
            // We update the temporary list of conversations so it can become the new list at the end.
            _conversations[conv] = conversations[alreadyExistingConversationID];
            continue;
          }

          // 3. Fetch the new messages from the new conversations

          const conversationKeyStr = await decryptConversationKey(privateKey, conversation[2]);
        
          const conversationContent = await fetchConversationContent(user.id, passwordHashHex, conversation[0], conversationKeyStr, 0);
  
          setConversationsMessages({
              type: 'set-conversation',
              conversationIdx: parseInt(conv),
              newConversation: conversationContent,
          })
  
          _conversations[conv].push(conversationKeyStr); // Push adds a record, shouldn't be a problem because these are NEW records
  
          let conversationInfo = await fetchConversationInfo(user.id, passwordHashHex, conversation[0]);
  
          _conversations[conv].push(...conversationInfo);

          // 5. Subscribe to the WS listeners

          try {
            WS_sendMessage(wsRef.current, JSON.stringify({
              type: "subscribe",
              data: {
                  userid: user.id,
                  password_hash: passwordHashHex,
                  conversation_id: conversation[0],
              }
            }));
          } catch (e) {
            console.error(e);
          }

        }

      // 4. Update the UI
      setConversations(_conversations);
        
      return undefined;
    }

    // ---------------- Declare useEffects ----------------

    useEffect(() => {
      wsRef.current = ws;
    }, [ws])

    useEffect(() => {

        if(!location.state || !location.state.user || !location.state.user.id || !location.state.user.password) {
            navigate("/login");
            return;
        } 

        setUser(location.state.user);
    }, []);
  
    useEffect(() => {
        if(!init && user) {
    
            async function asyncFunc() {
            
                const userPasswordAB = strToAb(`${user.password}${user.id}`);
            
                const passwordHash = await hashSha256(userPasswordAB);
                const _passwordHashHex = abToHexStr(passwordHash);
                setPasswordHashHex(_passwordHashHex);
        
                const _privateKey = await fetchPrivateKey(user.id, user.password, _passwordHashHex);
        
                setPrivateKey(_privateKey);
            
                if(!_privateKey) {
                    console.error("Couldn't fetch the private key...")
                    return;
                }
            
                let _conversations = await fetchConversationsList(user.id, _passwordHashHex);
            
                if(!_conversations) {
                    console.error("Couldn't grab the conversations");
                    return;
                } else if(_conversations.length === 0) {
                    return;
                }
        
                // 1st : Get info about the conversations

                let conversationsKeys = []

                for(let conv in _conversations) {

                  // Get the conversation key & other info
                  let conversation = _conversations[conv];
          
                  const conversationKeyStr = await decryptConversationKey(_privateKey, conversation[2]);

                  _conversations[conv].push(conversationKeyStr);
          
                  let conversationInfo = await fetchConversationInfo(user.id, _passwordHashHex, conversation[0]);
          
                  _conversations[conv].push(...conversationInfo);

                }

                // We call this before fetching the content, to display the conversations earlier
                setConversations(_conversations);
        
                setTimeout(setInit, 1000, [true]);

                // 2nd : Get the conversation content

                for(let conv in _conversations) {

                  let conversation = _conversations[conv];
          
                  const conversationKeyStr = _conversations[conv][3];
          
                  const conversationContent = await fetchConversationContent(user.id, _passwordHashHex, conversation[0], conversationKeyStr, 0);
          
                  setConversationsMessages({
                      type: 'set-conversation',
                      conversationIdx: parseInt(conv),
                      newConversation: conversationContent,
                  })
                }

                // Load the interests and languages
                let [lang, inter] = await getUserLanguagesAndInterests(user.id, _passwordHashHex);
                setUserInterests(JSON.parse(inter));
                setUserLanguages(JSON.parse(lang));
        
            }
            asyncFunc();
    
            }
    }, [user]);

    useEffect(()=>{
      if(isMobile) {
        // Set conversation to -1 ?
      } else {
        setConversationSelected(0); // What if there is no existing conversation ?
      }
    }, [isMobile])

    // Keep the ref in sync with the actual value
    useEffect(()=>{
      conversationsRef.current = conversations;
    }, [conversations])

    useEffect(()=>{
      if(!init) return;

      const connectWs = () => {
        let newWs = WS_initConnection(generateWScallbackFunction);
        newWs.onclose = (curWs, ev) => { // We want to open a new connection when one closes...
          console.warn("Connection just closed, trying to reopen it.", ev)
          connectWs();
        };
        setws(newWs)
      }

      connectWs();

    }, [init])
  
    // Always keep the newest message at the bottom
    useEffect(() => {
      if(lastMsgRef.current) {
        lastMsgRef.current.scrollIntoView({behavior: "smooth"});
      }
    }, [conversationsMessages, conversationSelected])
  
    const sendMessage = (messageToSend, conversationLocalId) => {
  
      const conversationData = conversations[conversationLocalId]
  
      const conversationDbId = conversationData[0];
      const conversationKey = conversationData[3];
  
      const currentMessages = conversationsMessages.conversations[conversationSelected];
      const lastMessage = currentMessages[currentMessages.length - 1];
  
      let messageWasPosted = undefined;
  
      if(answeringMessage) {
        messageWasPosted = postNewMessage(user.id, passwordHashHex, conversationDbId, conversationKey, messageToSend, "answer", { answeredMessage: {
          date: answeringMessage.date,
          author: answeringMessage.sender,
          content: answeringMessage.content.content,
        }});
      } else {
        messageWasPosted = postNewMessage(user.id, passwordHashHex, conversationDbId, conversationKey, messageToSend, "text");
      }
  
      if(!messageWasPosted) {
          console.error("A problem occured, the message is not posted.");
          return
      }
  
      // setTimeout(loadConversationFromServer, 1000, [conversationLocalId]); // Load the new messages but only after some time
  
      setNewMessagePrompt("");
      setAnsweringMessage(null);
  
    }
  
    const changeCurrentConversation = (newConversation) => {
  
      if (newConversation == conversationSelected) return;
  
      setNewMessagePrompt("");
  
      setConversationSelected(newConversation);
    }
  
    return (
        <div className="flex w-screen h-screen">
          {
            (!isMobile || (isMobile && conversationSelected < 0)) ?
            <aside className={"bg-white flex " +
              (isMobile ?
                "w-full h-full flex-col bg-purple-700 " :
                "w-1/3 h-full text-3xl"
              )
            }>
              <nav className={"top-0 left-0 bg-slate-300 text-white shadow-lg flex text-xl p-2 " + (isMobile ?
                "w-screen h-[15%] items-center" :
                "h-screen w-20 flex-col"
              )}>
                  <SidebarIcon icon={<img className="object-contain h-[90%]" src="logo-light.png" />} text="Rizom" onClick={e=>setSelectedSidebar(SidebarScreen.Rizom)} mobile={isMobile} />
                  <SidebarIcon icon={<ChatBubbleLeftRightIcon className="h-2/3"/>} text="Vos conversations" onClick={e=>setSelectedSidebar(SidebarScreen.Conversations)} mobile={isMobile} />
                  <SidebarIcon icon={<UserCircleIcon className="h-2/3"/>} text="Votre profil" onClick={e=>setSelectedSidebar(SidebarScreen.Profile)} mobile={isMobile} />
                  <SidebarIcon style={isMobile ? "" : "mt-auto"} icon={<Cog6ToothIcon className="h-2/3"/>} text="Paramètres" onClick={e=>setSelectedSidebar(SidebarScreen.Settings)} mobile={isMobile} />
                  <SidebarIcon icon={<ArrowLeftOnRectangleIcon className="h-2/3"/>} text="Se déconnecter" onClick={logout} mobile={isMobile} />
              </nav>
              <div className={"flex-col flex bg-red-600" + (isMobile ?
                  "grow h-[85%]" :
                  "h-full grow"
                )
              }>
                {(selectedSidebar == SidebarScreen.Conversations) ? 
                <div className="w-full h-full p-3 text-lg flex flex-col items-center justify-evenly">
                  <div className="h-[6%] w-full flex items-center">
                    <h2 className="font-oswald text-xl sm:text-2xl lg:text-3xl font-bold text-left">Vos conversations</h2>
                  </div>
                  <ul className="flex flex-col w-full h-[50%] grow max-h-[60%] border-2 items-center overflow-y-scroll">
                    {
                      (conversations && conversations.length > 0) ? conversations.map((val, idx, arr)=>(
                        <li className="w-[95%] bg-gray-100 p-3 cursor-pointer m-1 transition ease-in-out delay-150  hover:scale-105 duration-150 flex" key={idx} onClick={()=>{changeCurrentConversation(idx)}}>
                          <span className="w-[75%]">{val[1]}</span>
                          {/* <div className="ml-auto mr-3 rounded-full bg-rizom-color my-auto w-6 h-6 text-base flex items-center justify-evenly text-white"><span className="">4</span></div> */}
                        </li>
                        )) : <div className="w-full h-full flex justify-center items-center">
                      <LoadingSpinner className="text-gray-300 fill-rizom-color w-1/3 aspect-square" />
                    </div>
                      
                    }
                  </ul>
                  {
                    false ?
                    <>
                      <h2 className="bg-green-300 h-[6%] font-oswald text-3xl font-bold text-left w-full">Invitations</h2>
                      <ul className="flex flex-col w-full max-h-[20%] bg-yellow-400 items-center overflow-y-scroll">
                      </ul>
                    </>
                    : <></>
                  }
                  <div className="w-full h-[10%] flex items-center justify-center">
                    <button className="text-xl lg:text-2xl bg-rizom-color p-1 sm:p-2 lg:p-3 rounded-lg transition ease-in-out hover:scale-105 duration-150" onClick={
                      (e)=>{
                        e.preventDefault();
                        setSelectedSidebar(SidebarScreen.CreateConversation);
                      }
                      }>Créer une conversation</button>
                  </div>
                </div> : <></>}
                {(selectedSidebar == SidebarScreen.Profile) ?
                /*
                For now, this is completely useless, I need to make it effective. But this requires to have a sign up process to gather information about the user.
                */
                <div className="w-full h-full flex flex-col items-left pl-2 text-xl">
                  <h2 className="text-2xl mt-5">Votre profil</h2>
                  <p className="mt-2">id : {user.id}</p>
                  <p className="mt-2">Langues parlées :</p>
                  <ul className="pl-2">
                    {
                      Object.keys(userLanguages).map(key => <li key={key}>{key} : {LanguageLevelsList[userLanguages[key]]} </li>)
                    }
                  </ul>
                  <p className="mt-2">Centres d'intêrets :</p>
                  <ul className="pl-2">
                    {
                      userInterests.map(inter=><li key={inter}>{inter}</li>)
                    }
                  </ul>
                  {/* <button>Modifier mon profil</button> */}
                </div>
                : <></>}
                {(selectedSidebar == SidebarScreen.Settings) ? /*
                    - Light/Dark/... theme -> To decide
                    - Language
                    - Notifications
                  */
                  <div className="w-full h-full">
                    <p>Paramètres</p>
                    <p>Pas de paramètres à modifier pour le moment.</p>
                  </div>
                  : <></>}
                  
                {
                  /* What could go here is still to decide, some news about Rizom could be cool */
                (selectedSidebar == SidebarScreen.Rizom) ? <div className="w-full h-full flex flex-col items-center">
                    <h2 className="w-4/5 min-w-min text-xl lg:text-2xl text-center mt-5 mb-3">Rizom version Alpha</h2>
                    <p className="w-[90%] min-w-min text-base lg:text-lg whitespace-pre-line text-justify">Ça y est ! Rizom est enfin disponible dans sa version alpha. Les fonctionnalités sont basiques, mais notre équipe de développement travaille jour et nuit pour améliorer Rizom. </p>
                  </div> : <></> }

                  { (selectedSidebar == SidebarScreen.CreateConversation) ? <Suspense fallback={<div className="w-full h-full flex justify-center items-center">
                      <LoadingSpinner className="text-gray-300 fill-rizom-color w-1/4 aspect-square" />
                    </div>}>
                    <CreateConversationScreen callbackFunction={async (conversationName, usersToAdd) => {
                    let users = new Set(usersToAdd);
                    users.add(user.id)
                    const res = await createNewConversation(user.id, passwordHashHex, Array.from(users), conversationName);
                    setSelectedSidebar(SidebarScreen.Conversations);
                  }} />
                  </Suspense> : <></>}
              </div>
            </aside>
            : <></>
          }
          {
            (!isMobile || (isMobile && conversationSelected >= 0)) ?
            (<main className={
              "w-full landscape:md:w-2/3 flex flex-col h-full overflow-hidden"
            }>
              <div className="w-full h-20 flex items-center bg-gray-100">
                {
                  ( conversations ? <>
                    {
                    isMobile && <ArrowSmallLeftIcon className="ml-3 h-1/2 text-neutral-400 cursor-pointer transition ease-in-out hover:scale-110 duration-150" onClick={e=>{
                      setConversationSelected(-1);
                    }}/>
                    }
                    <span className="
                      text-xl sm:text-2xl lg:text-3xl
                      ml-auto
                      font-bold text-center
                    ">{conversations[conversationSelected][1]}</span>
                    {!isMobile && <span className="
                      text-xl sm:text-2xl lg:text-3xl
                      ml-5
                      text-center
                    ">({conversations[conversationSelected][4].length} membres)</span>}
                    <Cog6ToothIcon className="ml-auto mr-3 h-1/2 text-neutral-400 cursor-pointer transition ease-in-out hover:scale-110 duration-150" onClick={e=>{}}/>
                    {/* Add a functionnality to this settings button */}
                  </>
                  : <></> )
                }
              </div>
              <div className="w-full h-1  grow bg-neutral-400">
                {
                  conversationsMessages.conversations[conversationSelected] ?
                  <ConversationContent  messages={conversationsMessages.conversations[conversationSelected]} currentUser={user} lastMsgRef={lastMsgRef} setAnsweringMessage={setAnsweringMessage} />
                  : <div className="w-full h-full flex justify-center items-center">
                  <LoadingSpinner className="text-gray-300 fill-rizom-color w-1/6 aspect-square" />
                </div>
                }
              </div>
              <form className={"mt-auto w-full flex items-center no-underline bg-neutral-400 p-2 "}>
                <span className="grow text-lg rounded-xl mr-2 bg-gray-300 flex flex-col p-2">
                {(answeringMessage && <div className={
                    "relative flex pl-3 pr-1 py-1 rounded-r-xl before:content-[''] before:bg-rizom-color before:absolute before:-top-0 before:left-0 before:bottom-0 before:w-1 before:rounded-l-2xl bg-gray-200"
                  }>
                    <div className="w-full h-full">
                      <div className="text-lg italic text-black flex">
                        { (user.id === answeringMessage.sender) ?
                        <span className="mr-auto">Vous</span>
                        : <span className="mr-auto">{answeringMessage.sender}</span>
                        }
                        <XMarkIcon className="h-[1.5rem] ml-auto mr-1" onClick={()=>setAnsweringMessage(null)} />
                      </div>
                      <span className="text-xl whitespace-pre-line">{answeringMessage.content.content}</span>
                    </div>
                </div>)}
                  <TextareaAutosize placeholder='Message...' maxRows="4" minRows="1" className="bg-gray-300 resize-none w-full h-full mx-auto px-2 py-1  focus:outline-none" value={newMessagePrompt} onChange={e=>setNewMessagePrompt(e.target.value)} />
                </span>
                
                <button className="text-xl ml-auto bg-transparent transition ease-in-out hover:scale-110 duration-150" onClick={
                  (e)=>{
                    e.preventDefault();
                    sendMessage(newMessagePrompt, conversationSelected)
                  }
                  }><PaperAirplaneIcon className="h-[3rem] text-rizom-color cursor-pointer transition ease-in-out hover:scale-110 duration-150" onClick={e=>{}}/></button>
              </form>
            </main>)
            : <></>
  
          }
        </div>)
  }
  
  export default HomeScreen;