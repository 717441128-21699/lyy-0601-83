import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Match } from './pages/Match';
import { Game } from './pages/Game';
import { Team } from './pages/Team';
import { Items } from './pages/Items';
import { Chat } from './pages/Chat';
import { Replay } from './pages/Replay';
import { Rank } from './pages/Rank';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/match" element={<Match />} />
        <Route path="/game" element={<Game />} />
        <Route path="/team" element={<Team />} />
        <Route path="/items" element={<Items />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/replay" element={<Replay />} />
        <Route path="/replay/:gameId" element={<Replay />} />
        <Route path="/rank" element={<Rank />} />
      </Routes>
    </Router>
  );
}
