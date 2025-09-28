// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Clothing from './pages/Clothing';
import Notebooks from './pages/Notebooks';
import WaterBottles from './pages/WaterBottles';
import Cups from './pages/Cups';
import Bags from './pages/Bags';
import HiVis from './pages/HiVis';
import Cables from './pages/Cables';
import Power from './pages/Power';
import Speakers from './pages/Speakers';
import Pens from './pages/Pens';
import TeaTowels from './pages/TeaTowels';
import HeaderBar from './components/HeaderBar';

function App() {
  return (
    <Router>
      <HeaderBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clothing" element={<Clothing />} />
        <Route path="/notebooks" element={<Notebooks />} />
        <Route path="/water-bottles" element={<WaterBottles />} />
        <Route path="/cups" element={<Cups />} />
        <Route path="/bags" element={<Bags />} />
        <Route path="/hi-vis" element={<HiVis />} />
        <Route path="/cables" element={<Cables />} />
        <Route path="/power" element={<Power />} />
        <Route path="/speakers" element={<Speakers />} />
        <Route path="/pens" element={<Pens />} />
        <Route path="/tea-towels" element={<TeaTowels />} />
      </Routes>
    </Router>
  );
}

export default App;
