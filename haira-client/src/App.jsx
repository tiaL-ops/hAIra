import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; //des fois ca fais genre erreur masi ca marche
import Login from './pages/Login';
import Classroom from './pages/Classroom';
import Project from './pages/Project';

function App() {
  return (
    <BrowserRouter>
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />     
        <Route path="/classroom" element={<Classroom />} />
        <Route path="/project" element={<Project />} />
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;