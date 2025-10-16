import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; //des fois ca fais genre erreur masi ca marche
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;