
import { useState } from 'react';

import { useNavigate  } from 'react-router-dom';

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

import { checkUserCredentials } from '../../lib';

const errorMessages = {
    'invalid-user-id': "Identifiant inexistant",
    'invalid-password-hash': "Mot de passe invalide"
}

const LoginScreen = ({ mobile = false }) => {

    const navigate = useNavigate();

    const [useridInput, setUseridInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e) => {

        e.preventDefault();

        let userIsValid = undefined;

        try {
            userIsValid = await checkUserCredentials(useridInput, passwordInput);
        } catch(error) {
            setErrorMessage(errorMessages[error.message] ? errorMessages[error.message] : error.message);
            return;
        }

        if(userIsValid) {
            navigate("/home", {state: {user: {
                id: useridInput,
                password: passwordInput,
            }}});
        }

    }
  
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
          w-[90%] landscape:sm:w-[60%] landscape:lg:w-[50%] p-4
          text-2xl
        ">
          <h1 className="
            text-4xl sm:text-5xl md:text-6xl
            mb-1
            font-bold text-center
          ">Se connecter</h1>
          <label className={"mb-6 text-red-600 text-center " + (errorMessage == "" ? "invisible" : "")}>{errorMessage}</label>
          <input type="text" className="w-full h-12 m-2 px-2 bg-gray-300 rounded-xl focus:outline-none font-bold" value={useridInput} onChange={e=>setUseridInput(e.target.value)} autoComplete='username'></input>
          <span className="w-full h-12 m-2 flex items-center"><input type={showPassword ? "text" : "password"} className="w-[90%] h-full  px-2 bg-gray-300 rounded-xl focus:outline-none font-bold" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} autoComplete="current-password"></input>{showPassword ? <EyeSlashIcon className="ml-3 w-[8%] text-rizom-color cursor-pointer" onClick={e=>setShowPassword(false)} /> : <EyeIcon className="ml-3 w-[8%] text-rizom-color cursor-pointer" onClick={e=>setShowPassword(true)}/>}</span>
          <button className="w-full text-2xl font-bold bg-rizom-color m-2 p-3 rounded-lg transition ease-in-out hover:scale-105 duration-150 select-none" onClick={handleSubmit}>Envoyer</button>
        </form>
      </main>
    </div>)
  }

export default LoginScreen;