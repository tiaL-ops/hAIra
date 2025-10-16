import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; //des fois ca fais genre erreur masi ca marche
import Profile from './pages/Profile';
import Login from './pages/Login';
import Classroom from './pages/Classroom';

function App() {
  return (
    <BrowserRouter>
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />     
        <Route path="/classroom" element={<Classroom />} />
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;