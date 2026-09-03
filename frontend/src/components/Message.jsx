import { getAppropriateDateFormat } from "../Lib/date";

import AnswerIcon from "./AnswerIcon";

const Message = ({content, sender, date, onClick, alignRight, elRef, setAnsweringMessage}) => {

  // const messageDate = new Date(Date.parse(date)); // Data is already a float
  const messageDate = new Date(date * 1000 ) // * 1000 to get the number of ms not s
  const rightNow = new Date(Date.now());

  const messageDateStr = getAppropriateDateFormat(rightNow, messageDate);

  return (<li
    className={
      "m-1 px-3 py-1 min-w-[25ch] max-w-[35ch] md:max-w-[40ch] rounded-lg"
      + (alignRight ? " ml-auto rounded-tr-none bg-green-200" : " mr-auto rounded-tl-none bg-white")
    }
    ref={elRef}>
      { (alignRight ? <></> :
        <div className="text-base md:text-lg italic text-rizom-color">
          <span className="mr-auto">{sender}</span>
        </div>)
      }

      {/* 
      
      : a answers a -> "Vous" = alignRight && sender == author
      : a answers b -> b      = alignRight && sender != author
      : b answers a -> "Vous" = !alignRight && sender != author
      : b answers b -> b      = !alignRight && sender == author

      */}

      {(content.type === "answer") ? <>
        <div className={
          "relative flex pl-3 pr-1 py-1 rounded-r-xl before:content-[''] before:bg-rizom-color before:absolute before:-top-0 before:left-0 before:bottom-0 before:w-1 before:rounded-l-2xl "
          + (alignRight ? "bg-green-300" : "bg-gray-100")
        }>
          <div className="w-full h-full">
            <div className="text-base md:text-lg italic text-black">
              { ((alignRight && sender === content["extra-data"].answeredMessage.author)||(!alignRight && sender !== content["extra-data"].answeredMessage.author)) ?
              <span className="mr-auto">Vous</span>
              : <span className="mr-auto">{content["extra-data"].answeredMessage.author}</span>
              }
            </div>
            <span className="text-lg md:text-xl whitespace-pre-line">{content["extra-data"].answeredMessage.content}</span>
          </div>
        </div>
      </> : <></>}
      <div>

      </div>
      
      <div className="text-lg md:text-xl whitespace-pre-line">
      {(content.type === "text") ? <span className="">{content.content}</span> : <></>}
      {(content.type === "link") ? <a href={content.content} target="_blank"><span className="underline text-blue-800 hover:text-blue-600">{content.content}</span></a> : <></>}
      {(content.type === "answer") ? <span className="">{content.content}</span> : <></>}
        
      </div>
      <div className="flex text-sm">
        <span className="ml-auto py-1">{messageDateStr}</span>
        <AnswerIcon className="w-6 ml-2" onClick={()=>{
          setAnsweringMessage({
            content, sender, date
          })
        }} />
      </div>
      </li>
    )
}

export default Message;