
import { useState, useEffect, useReducer } from 'react';

import { useNavigate  } from 'react-router-dom';

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

import { registerUser, setUserLanguagesAndInterests } from '../../lib';

import StyledButton from "../StyledButton"

import activities from "../../assets/resources/activities.json"
import languages from "../../assets/resources/languages.json"

const CheckedOrNot = {
    NotChecked: 0,
    Valid: 1,
    Invalid: 2,
}

const LanguageLevel = {
    Unknown: 0,
    Beginner: 1,
    Medium: 2,
    Advanced: 3,
    Fluent: 4,
}

const LanguageLevelsList = [
    "", "Débutant", "Intermédiaire", "Avancé", "Bilingue"
]

const languagesSpokenReducer = (state, action) => {
    if(action.level == undefined) {
        state[action.index][0] = !state[action.index][0];
        state[action.index][2] = state[action.index][0] ? 1 : 0
    } else {
        state[action.index][2] = action.level
    }
    return [...state];
}

const activitiesSelectedReducer = (state, index) => {
    state[index][0] = !state[index][0];
    return [...state];
}

const SignUpScreen = ({ mobile = false }) => {

    const navigate = useNavigate();

    const [firstnameInput, setFirstnameInput] = useState("");
    const [lastnameInput, setLastnameInput] = useState("");
    const [birthYearInput, setBirthYearInput] = useState("");
    const [registrationCodeInput, setRegistrationCodeInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");

    const [firstnameValidity, setFirstnameValidity] = useState(CheckedOrNot.NotChecked);
    const [lastnameValidity, setLastnameValidity] = useState(CheckedOrNot.NotChecked);
    const [birthYearValidity, setBirthYearValidity] = useState(CheckedOrNot.NotChecked);
    const [registrationCodeValidity, setRegistrationCodeValidity] = useState(CheckedOrNot.NotChecked);
    const [passwordValidity, setPasswordValidity] = useState(CheckedOrNot.NotChecked);

    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [infoChecked, setInfoChecked] = useState(false);

    const [languagesSpoken, switchLanguagesSpoken] = useReducer(languagesSpokenReducer, languages.map(x=>[false, x.name, 0]));
    const [activitiesSelected, switchActivitiesSelected] = useReducer(activitiesSelectedReducer, activities.map(x => [false, x["display/english"]]))

    const [step, setStep] = useState(0); // DEBUG: Put it back to 0

    const [userid, setUserid] = useState(undefined);
    const [passwordHashHex, setPasswordHashHex] = useState(undefined);

    const styleList = ["border-gray-300", "border-green-400", "border-red-600"];
    const languageLevelPickStyles = ["", "accent-red-500", "accent-orange-500", "accent-green-500", "accent-indigo-700"]

    const handleSubmitForm1 = async (e) => {

        e.preventDefault();

        if(infoChecked && firstnameValidity && lastnameValidity && birthYearValidity && registrationCodeValidity && passwordValidity) {

            let user = undefined;
            let tempPasswordHash = undefined

            try {
                [user, tempPasswordHash] = await registerUser(firstnameInput, lastnameInput, registrationCodeInput, birthYearInput, passwordInput);
            } catch(error) {
                setErrorMessage(error.message)
                return;
            }

            setUserid(user);
            setPasswordHashHex(tempPasswordHash);

        } else {
            // Check that the info the user provided are valids

            let valid = true;

            // Check the firstname
            
            if(/^[A-Za-z ,.'-]{1,50}$/.test(firstnameInput)) {
                setFirstnameValidity(CheckedOrNot.Valid);
            } else {
                setFirstnameValidity(CheckedOrNot.Invalid);
                valid = false;
            }

            // Check the lastname
            if(/^[A-Za-z ,.'-]{1,50}$/.test(lastnameInput)) {
                setLastnameValidity(CheckedOrNot.Valid);
            } else {
                setLastnameValidity(CheckedOrNot.Invalid);
                valid = false;
            }

            // Check the year of birth
            if(parseInt(birthYearInput) && parseInt(birthYearInput) < 2020 && parseInt(birthYearInput) > 1960) {
                setBirthYearValidity(CheckedOrNot.Valid);
            } else {
                setBirthYearValidity(CheckedOrNot.Invalid);
                valid = false;
            }

            if(/^[2-9A-HJ-NP-Za-km-z]{22}$/.test(registrationCodeInput)) {
                setRegistrationCodeValidity(CheckedOrNot.Valid);
            } else {
                setRegistrationCodeValidity(CheckedOrNot.Invalid);
                valid = false;
            }

            if(/[\S]{5,100}/.test(passwordInput)) {
                setPasswordValidity(CheckedOrNot.Valid);
            } else {
                setPasswordValidity(CheckedOrNot.Invalid);
                valid = false;
            }

            if(valid != infoChecked) {
                setInfoChecked(valid);
                setErrorMessage(undefined);
            } 
        }

    }

    const handleSubmitForm2 = async (e) => {

        e.preventDefault();

        let atLeastOneLang = false;

        // ... 
        for(const lang of languagesSpoken) {
            if(lang[0]) {
                atLeastOneLang = true;
            } 
        }
        if(atLeastOneLang) {
            setStep(7);
            setErrorMessage("");
        } else {
            setErrorMessage("Vous devez choisir au moins une langue.")
        }
    }

    useEffect(()=>{
        if(!userid || step != 4) return;

        setStep(5);

    }, [userid])

    return (<div className="w-full h-screen flex flex-col">
        <header className={"w-full flex items-center bg-slate-200 p-2 " + (mobile ? "absolute h-25" : "h-1/6")}>
        <img className="object-contain h-full max-w-[25%]" src="logo-light.png" />
          <span className="
            mx-auto
            text-rizom-color font-oswald
            max-[300px]:text-4xl text-6xl sm:text-7xl
          ">RIZOM</span>
        <img className="invisible object-contain h-full max-w-[25%]" src="logo-light.png" />
      </header>
      <main className="grow w-full flex items-center justify-center p-2 z-30">
        <form className="
          bg-slate-100 rounded-xl flex flex-col items-center
          w-[90%] landscape:sm:w-[60%] landscape:lg:w-[50%]
          p-4 md:p-10
          text-lg md:text-xl
        ">
          <h1 className="
            text-4xl sm:text-5xl md:text-6xl
            mb-4
            font-bold text-center
          ">Créer mon compte</h1>
            {step == 0 ? <>
                <p>Bienvenue sur l'interface de création de votre compte Rizom, avant de débuter voici quelques informations essentielles, <strong>à lire attentivement</strong>.</p>
                <StyledButton onClick={()=>setStep(1)} message={"Compris"} />
            </>: null}
            {step == 1 ? <>
                <p>Avant tout, pour vous inscrire, vous allez avoir besoin de <strong>votre code d'inscription</strong>, qui doit avoir été fourni par votre établissement. Il s'agit d'un code composé de lettres et de chiffres (pour éviter les erreurs de copie, il est conseillé de <strong>copier-coller ce code</strong> directement dans le champ associé).</p>
                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(0)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton onClick={()=>setStep(2)} message={"Suivant"} customStyle="w-1/2" />
                </div>
            </>: null}
            {step == 2 ? <>
                <p>En plus du code, Rizom va vous demander votre <strong>prénom</strong>, votre <strong>nom</strong>, ainsi que votre <strong>année de naissance</strong>. Ces informations sont essentielles pour pouvoir vous inscire. L'année de naissance est utilisée uniquement par notre algorithme, et il est donc <strong>inutile de la changer</strong> (pas besoin d'être majeur pour avoir accès à Rizom).</p>
                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(1)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton onClick={()=>setStep(3)} message={"Suivant"} customStyle="w-1/2" />
                </div>
            </>: null}
            {step == 3 ? <>
                <p>Vous devrez enfin fournir un mot de passe.<br></br> La sécurité de Rizom repose sur la qualité de votre mot de passe, il doit donc être fort, nous conseillons une "passphrase".<br></br> Préférez donc <em>JePeuxUtiliserRizom</em> ou encore <em>R1z0mC3stSup3r</em> à <em>motdepasse</em> ou <em>JeanjacqueDu86</em>. <br></br>
                (Evitez également les caractères spéciaux compliqué à trouver sur un clavier et les emojis.).
                <strong>Vous devez ABSOLUMENT vous souvenir du mot de passe que vous entrez ici.</strong>
                </p>
                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(2)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton onClick={()=>setStep(4)} message={"Compris"} customStyle="w-1/2" />
                </div>
            </>: null}
            {step == 4 ? <>
                <label className={"mb-6 text-red-600 text-center " + (errorMessage == "" ? "invisible" : "")}>{errorMessage}</label>

                <input
                    type="text"
                    placeholder="Prénom"
                    autoComplete='given-name'
                    className={"w-full h-12 m-2 px-2 rounded-xl focus:outline-none font-bold border-2 "
                    + styleList[firstnameValidity]
                    }
                    value={firstnameInput}
                    onChange={e=>{
                        setFirstnameValidity(CheckedOrNot.NotChecked)
                        setFirstnameInput(e.target.value)
                    }}>
                </input>

                <input
                    type="text"
                    placeholder="Nom"
                    autoComplete='family-name'
                    className={"w-full h-12 m-2 px-2 rounded-xl focus:outline-none font-bold border-2 "
                    + styleList[lastnameValidity]
                    }
                    value={lastnameInput}
                    onChange={e=>{
                        setLastnameValidity(CheckedOrNot.NotChecked)
                        setLastnameInput(e.target.value)
                    }}>
                </input>

                <input
                    type="text"
                    placeholder="Année de naissance"
                    autoComplete='bday-year'
                    className={"w-full h-12 m-2 px-2 rounded-xl focus:outline-none font-bold border-2 "
                    + styleList[birthYearValidity]
                    }
                    value={birthYearInput}
                    onChange={e=>{
                        setBirthYearValidity(CheckedOrNot.NotChecked)
                        setBirthYearInput(e.target.value)
                    }}>
                </input>

                <input
                    type="text"
                    placeholder="Code d'inscription"
                    autoComplete='one-time-code'
                    className={"w-full h-12 m-2 px-2 rounded-xl focus:outline-none font-bold border-2 "
                    + styleList[registrationCodeValidity]
                    }
                    value={registrationCodeInput}
                    onChange={e=>{
                        setRegistrationCodeValidity(CheckedOrNot.NotChecked)
                        setRegistrationCodeInput(e.target.value)
                    }}>
                </input>

                <span className="w-full h-12 m-2 flex items-center">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mot de passe"
                        autoComplete='new-password'
                        className={"w-[90%] h-full  px-2 rounded-xl focus:outline-none font-bold border-2 " + styleList[passwordValidity] }
                        value={passwordInput}
                        onChange={e=>{
                            setPasswordValidity(CheckedOrNot.NotChecked);
                            setPasswordInput(e.target.value);
                        }}></input>
                    {showPassword ?
                        <EyeSlashIcon className="ml-3 w-[8%] text-rizom-color cursor-pointer" onClick={e=>setShowPassword(false)} /> :
                        <EyeIcon className="ml-3 w-[8%] text-rizom-color cursor-pointer" onClick={e=>setShowPassword(true)}/>
                    }
                </span>

                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(3)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton onClick={handleSubmitForm1} message={infoChecked && firstnameValidity && lastnameValidity && birthYearValidity && registrationCodeValidity && passwordValidity ? "S'inscrire" : "Vérifier"} customStyle="w-1/2" />
                </div>
            </> : null}
            { step == 5 ? <>
                <p>Bienvenue {userid} !<br></br>Votre compte a bien été créé, vous allez maintenant pouvoir donner quelques informations supplémentaires (les langues que vous parlez, vos centres d'intérêts...) pour que nous puissions trouver des personnes avec qui vous allez bien vous entendre. <br></br>Ces informations seront utilisées uniquement par notre algorithme et ne seront pas accessibles, par aucun utilisateur de Rizom, pas d'inquiétude !</p>
                <div className="w-full flex">
                    {/* No previous button here because it doesn't make sense */}
                    {/* <StyledButton onClick={()=>setStep(4)} message={"Précédent"} customStyle="w-1/2" /> */}
                    <StyledButton onClick={()=>setStep(6)} message={"Super !"} customStyle="w-full" />
                </div>
            </> : <></>}
            { step == 6 ? <>
                <p>Selectionnez les langues que vous parlez :</p>
                <label className={"mb-6 text-red-600 text-center " + (errorMessage == "" ? "invisible" : "")}>{errorMessage}</label>
                <ul className="bg-gray-200 rounded-lg w-full flex flex-wrap gap-2 p-2 overflow-y-scroll max-h-[50vh] justify-center">
                    {
                        languages.map((lang, idx)=>(
                            <li className={"bg-gray-300 border-2 p-2 rounded-2xl " + (languagesSpoken[idx][0] ? "border-rizom-color" : "border-gray-200")} onClick={()=>switchLanguagesSpoken({index:idx})} key={lang.name}>
                                <span>{lang.flag}</span> <span className="capitalize">{lang["display/original"]}</span>
                            </li>
                        ))
                    }
                </ul>
                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(5)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton onClick={handleSubmitForm2} message={"Valider"} customStyle="w-1/2" />
                </div>
            </> : <></>}
            { step == 7 ? <>
                <p>Quel est votre maitrise de ces langues ?</p>
                <ul className=" w-[95%] mt-4">
                {
                    languagesSpoken.map((lang, idx)=>(lang[0] ? <li key={languages[idx]["display/original"]} className="w-full flex justify-evenly">
                        <span className="max-w-[30%] min-w-[20%]">{languages[idx]["display/original"]}</span> : <input type="range"
                        className={"w-[20%] neutral-track-range "/* + languageLevelPickStyles[languagesSpoken[idx][2]] */}
                        min={LanguageLevel.Beginner}
                        max={LanguageLevel.Fluent}
                        step={1}
                        value={languagesSpoken[idx][2]}
                        onChange={(event)=>{
                            if(event.target.value != languagesSpoken[idx][2]) {
                                switchLanguagesSpoken({index:idx, level:event.target.value});
                            }
                        } }></input><label className="w-[30%] text-center">{LanguageLevelsList[languagesSpoken[idx][2]]}</label>
                    </li> : <></>))
                }
                </ul>
                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(6)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton onClick={()=>setStep(8)} message={"Super !"} customStyle="w-1/2" />
                </div>
            </> : <></>}
            {step == 8 ? <>
                <p>Séléctionner les centres d'intérêts : </p>
                <label className={"mb-6 text-red-600 text-center " + (errorMessage == "" ? "invisible" : "")}>{errorMessage}</label>
                <ul className="bg-gray-200 rounded-lg w-full flex flex-wrap gap-2 p-2 overflow-y-scroll max-h-[50vh] justify-center">
                    {
                        activities.map((act, idx)=>(
                            <li className={"bg-gray-300 border-2 p-2 rounded-2xl " + (activitiesSelected[idx][0] ? "border-rizom-color" : "border-gray-200")} key={act["display/english"]} onClick={()=>switchActivitiesSelected(idx)} >
                                <span>{act.emoji}</span> <span className="capitalize">{act["display/french"]}</span>
                            </li>
                        ))
                    }
                </ul>
                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(7)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton message={"C'est bon !"} customStyle="w-1/2" onClick={(e) => {
                        e.preventDefault()
                        let userSelectedActs = []
                        for(const act of activitiesSelected) {
                            if(act[0]) userSelectedActs.push(act[1]);
                        }
                        if(userSelectedActs.length >= 3) {
                            setStep(10);
                            setErrorMessage("");
                        } else {
                            setErrorMessage("Vous devez choisir au moins 3 centres d'interêts.")
                        }
                        
                    }} />
                </div>
                
            </> : <></>}
            {/* The part about questions of personnality, still to improve */}
            { step == 9 ? <><p></p></> : <></>}
            {step == 10 ? <>
                <p>Assurez-vous que les informations que vous avez rentrées sont valides, puis confirmez.</p>
                <p>Quand vous aurez confirmé, votre inscription sera finie et vous pourrez utiliser Rizom !</p>
                <div className="w-full flex">
                    <StyledButton onClick={()=>setStep(8)} message={"Précédent"} customStyle="w-1/2" />
                    <StyledButton onClick={async (e)=>{
                        e.preventDefault();

                        // 1. Structure the values

                        let languagesValue = [];
                        for(const lang of languagesSpoken) {
                            if(!lang[0]) continue;
                            languagesValue.push([lang[1], lang[2]])
                        }

                        let interestsValue = [];
                        for(const interest of activitiesSelected) {
                            if(!interest[0]) continue;

                            interestsValue.push(interest[1]);
                        }

                        // 2. Send the value
                        await setUserLanguagesAndInterests(userid, passwordHashHex, languagesValue, interestsValue);

                        
                        // 3. Redirect the user
                        navigate("/login");

                    }} message={"Confirmer"} customStyle="w-1/2" />
                </div>
            </> : <></>} 
        </form>
      </main>
    </div>)
}

export default SignUpScreen;