import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Classroom from './pages/Classroom';
import Project from './pages/Project';
import Chat from './pages/Chat';

function App() {
  return (
    <BrowserRouter>
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />     
        <Route path="/classroom" element={<Classroom />} />
        <Route path="/project" element={<Project />} />
        <Route path="/project/:id/chat" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;