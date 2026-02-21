import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createContext, useContext, useState, useEffect } from 'react';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => { } });

export function useTheme() { return useContext(ThemeContext); }

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ww-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ww-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby/:roomCode" element={<Lobby />} />
          <Route path="/game/:roomCode" element={<Game />} />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
