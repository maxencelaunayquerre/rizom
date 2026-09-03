
const friendsPropositions = [
    {
      "name": "Charles@Darwin",
      "age": 214,
      "languages": ["Anglais", "Turkmène"],
      "commonInterests": ["Science", "Lasagne", "Chatons"]
    },
    {
      "name": "Thomas@Edison",
      "age": 176,
      "languages": ["Anglais", "Breton"],
      "commonInterests": ["Physique", "Curling sur gazon"]
    },
    {
      "name": "Ada@Lovelace",
      "age": 208,
      "languages": ["Anglais", "Espéranto"],
      "commonInterests": ["Cheesecake", "Les Rolling Stones", "Mathématiques"]
    },
  ]

const FriendsPropositions = () => {

    const [currentIdx, setCurrentIdx] = useState(0);
    const [translate, setTranslate] = useState("")
    const swipeRight = () => {setCurrentIdx(x => (x + 1)%friendsPropositions.length)};
    const swipeLeft = () => {setCurrentIdx(x => (x - 1)%friendsPropositions.length)};
  
    // useEffect(()=>{
    //   setTranslate();
    // }, [currentIdx])
  
    
    return (<div className="p-3 text-lg mt-[3%] max-h-[35%] max-w-4/5">
      <h2 className="mb-1">Vos propositions d'amis</h2>
      <div className="flex items-center justify-evenly">
        <button onClick={swipeLeft}>{"<"}</button>
        <div className="text-center w-[90%] overflow-x-hidden">
          <ul className="flex items-center" style={{transform: `translateX(-${100*(currentIdx)}%)`}}>
          {
              friendsPropositions.map((val, idx, arr) => (
                <li className={"my-2 w-full max-w-full min-w-full flex items-center justify-evenly "} key={val.name}>
                  
                  <div className="w-4/5 bg-slate-200 p-2 rounded-lg">
                    <div>
                      <span><span className="text-rizom-color">{val.name}</span> ({val.age} ans)</span>
                    </div>
                    <div className="text-sm flex px-3">
                      <p><span className="font-bold">Langues parlées : </span>{
                          val.languages.map((val2, idx2, arr2) => (
                            <span key={val2}>{val2}{(idx2 < arr2.length - 1) ? ", " : ""}</span>
                          ))
                        }</p>
                        
                    </div>
                    <div className="text-sm flex px-3">
                      <p><span className="font-bold">Intérêts communs : </span>{
                            val.commonInterests.map((val2, idx2, arr2) => (
                              <span key={val2}>{val2}{(idx2 < arr2.length - 1) ? ", " : ""}</span>
                            ))
                          }</p>
                    </div>
                  </div>
                </li>
              ))
            }
          </ul>
        </div>
        <button onClick={swipeRight}>{">"}</button>
      </div>
    </div>)
  }