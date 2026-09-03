import { useEffect } from "react";

import Message from "./Message";

const ConversationContent = ({ currentUser, messages, lastMsgRef, setAnsweringMessage }) => {

    return (
      <ul className="h-full flex flex-col justify-start overflow-y-scroll">
        {
          messages.map((val, idx, arr)=>{
  
            if(!val || val.length < 3) return null
  
            const sender = val[1];
            const dateSent = val[0];
            const content = val[2];
  
            const senderIsUser = (sender==currentUser.id);
  
            return <Message content={content} sender={sender} date={dateSent} elRef={(idx == arr.length - 1) ? lastMsgRef : null} alignRight={senderIsUser} onClick={()=>{}} key={dateSent} setAnsweringMessage={setAnsweringMessage} />
          })
        }
      </ul>
    )
}

export default ConversationContent;