import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; //des fois ca fais genre erreur masi ca marche
import Classroom from './pages/Classroom';

function App() {
  return (
    <BrowserRouter>
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/classroom" element={<Classroom />} />
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;