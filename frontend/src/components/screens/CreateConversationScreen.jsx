import { useState, useEffect, useRef } from 'react';

import { XMarkIcon } from '@heroicons/react/24/solid';

import StyledButton from "../StyledButton";


const CreateConversationScreen = ({callbackFunction}) => {

    const userIdsRef = useRef([]);
    const [addUserInput, setAddUserInput] = useState("");
    const [rerender, _forceRerender] = useState(false);
    const [conversationNameInput, setConversationNameInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
  
    const switchRerender = () => _forceRerender(x => !x);
  
    useEffect(()=>{
      userIdsRef.current = [];
    }, []);
  
    const addUserToList = (userId) => {
      if(! /^[A-Za-z ,.'-]{1,50}@[A-Za-z ,.'-]{1,50}$/.test(userId)) return;
      userIdsRef.current.push(userId);
      switchRerender();
    }
  
    const removeUserFromList = (idx) => {
      userIdsRef.current.splice(idx, 1);
      switchRerender()
    }
  
    return (<div
      className="w-full h-full flex flex-col"
    >
      <h2 className="text-2xl text-center m-2">Créer une conversation</h2>
      <p className="text-lg m-1">Entrez le nom de la conversation et les identifiants des personnes que vous voulez y inviter :</p>
      <input type="text" placeholder="Nom de la conversation" value={conversationNameInput} onChange={(e)=>setConversationNameInput(e.target.value)} className={"mx-auto w-[60%] m-2 p-1 border-2 border-gray-300 outline-none " + (/^[A-Za-z0-9 ,.'-]{1,100}/.test(conversationNameInput) ? "border-green-500" : "border-red-500")}></input>
      <p className="mx-auto w-[60%] m-2">{errorMessage}</p>
      <div className="w-full p-2 flex flex-col items-center">
        <ul className="w-[90%] border-2 border-gray-300 p-2 ">
          {
            userIdsRef.current.map((val, idx)=><li key={idx} className={"flex m-2 " + (/^[A-Za-z ,.'-]{1,50}@[A-Za-z ,.'-]{1,50}$/.test(val) ? "bg-green-500" : "bg-red-500")}>
              <span className="ml-2 max-w-[80%] overflow-x-hidden">{val}</span><XMarkIcon className="h-[1.5rem] mr-2 ml-auto" onClick={()=>{;
                removeUserFromList(idx);
              }} />
            </li>)
          }
        </ul>
        <input type="text" placeholder="user@id" value={addUserInput} onChange={e=>setAddUserInput(e.target.value)} className={"w-[90%] m-2 p-1 border-2 border-gray-300 outline-none " + (/^[A-Za-z ,.'-]{1,50}@[A-Za-z ,.'-]{1,50}$/.test(addUserInput) ? "border-green-500" : "border-red-500")}></input>
        <div className="w-[90%] mx-auto flex">
        <StyledButton message="Ajouter" onClick={(e)=>{
          e.preventDefault();
          addUserToList(addUserInput);
          setAddUserInput("");
        }} />
        {
          (userIdsRef.current.length >= 1) ? <StyledButton message="Créer" onClick={(e)=>{
            e.preventDefault();
  
            if(!(/^[A-Za-z0-9 ,.'-]{1,100}/.test(conversationNameInput))) {
              setErrorMessage("Nom de conversation invalide.");
              console.error("Nom de conversation invalide.");
              return;
            }
  
            if(userIdsRef.current.length < 1) {
              setErrorMessage("Pas assez d'utilisateur");
              console.error("Pas assez d'utilisateur");
              return;
            }
            callbackFunction(conversationNameInput, userIdsRef.current);
  
          }} /> : null
        }
        </div>
      </div>
    </div>)
  }

export default CreateConversationScreen;