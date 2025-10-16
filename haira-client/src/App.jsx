import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; //des fois ca fais genre erreur masi ca marche

function App() {
  return (
    <BrowserRouter>
    
      <Routes>
        <Route path="/" element={<Home />} />
        
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;