import { useState, useEffect } from 'react';

import { BrowserRouter, Routes, Route, Link  } from 'react-router-dom';

import SignUpScreen from './components/screens/SignUpScreen';
import LoginScreen from './components/screens/LoginScreen';
import HomeScreen from './components/screens/HomeScreen';

const App = () => {

  const [isMobile, setIsMobile] = useState(!window.matchMedia("only screen and (orientation: landscape)").matches);

  const handleWindowSizeChange = () => {
    const mobile = window.matchMedia("only screen and (max-width: 480px) and (orientation: portrait)").matches;
    const desktopOrTablet = window.matchMedia("only screen and (orientation: landscape)").matches;
    setIsMobile(!desktopOrTablet);
  }

  useEffect(() => {
    window.addEventListener('resize', handleWindowSizeChange);

    return () => { // The returned function is used as a clean up function when the component unmounts or the useEffect is called again)
        window.removeEventListener('resize', handleWindowSizeChange);
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<>
          <Link to="/login">Connexion</Link>
          <Link to="/signup">Inscription</Link>
        </>} />
        <Route path="/signup" element={<SignUpScreen mobile={isMobile} />} />
        <Route path="/login" element={<LoginScreen mobile={isMobile} />}/>
        <Route path="/home" element={<HomeScreen isMobile={isMobile} />} />
        <Route path="*" element={<p>Page not found...</p>} />
      </Routes>
    </BrowserRouter>);
}

export default App;
