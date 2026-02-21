import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from '../socket';
import { useTheme } from '../App';

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState('');

    // Pre-fill room code when arriving via an invite link (?join=ROOMCODE).
    // Always clear session so the visitor can choose any name fresh.
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const joinCode = params.get('join');
        if (joinCode) {
            sessionStorage.clear();
            setRoomCode(joinCode.toUpperCase());
        }
    }, [location.search]);

    useEffect(() => {
        socket.on('room_created', ({ roomCode, playerId, players, settings }) => {
            sessionStorage.setItem('playerId', playerId);
            sessionStorage.setItem('playerName', name.trim());
            sessionStorage.setItem('roomPlayers', JSON.stringify(players));
            sessionStorage.setItem('roomSettings', JSON.stringify(settings));
            navigate(`/lobby/${roomCode}`);
        });

        socket.on('room_joined', ({ roomCode, playerId, players, settings }) => {
            sessionStorage.setItem('playerId', playerId);
            sessionStorage.setItem('playerName', name.trim());
            sessionStorage.setItem('roomPlayers', JSON.stringify(players));
            sessionStorage.setItem('roomSettings', JSON.stringify(settings));
            navigate(`/lobby/${roomCode}`);
        });

        socket.on('error', ({ message }) => {
            setError(message);
            setLoading('');
        });

        return () => {
            socket.off('room_created');
            socket.off('room_joined');
            socket.off('error');
        };
    }, [name, navigate]);

    function handleCreate(e) {
        e.preventDefault();
        if (!name.trim()) { setError('Please enter your name.'); return; }
        setError('');
        setLoading('create');
        socket.emit('create_room', { playerName: name.trim() });
    }

    function handleJoin(e) {
        e.preventDefault();
        if (!name.trim()) { setError('Please enter your name.'); return; }
        if (!roomCode.trim()) { setError('Please enter a room code.'); return; }
        setError('');
        setLoading('join');
        socket.emit('join_room', { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() });
    }

    return (
        <div className="home-page">
            <div className="home-card">
                <div style={{ position: 'absolute', top: 12, right: 14 }}>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
                </div>
                <div className="home-title">
                    <h1>WORDLE</h1>
                    <p>Real-time multiplayer • Up to 8 players</p>
                </div>

                {error && (
                    <div className="error-box">{error}</div>
                )}

                <div className="home-section">
                    <h2>Your Name</h2>
                    <input
                        id="player-name"
                        className="input"
                        placeholder="Enter your display name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={16}
                    />
                </div>

                <div className="home-section">
                    <h2>Create Room</h2>
                    <button id="create-room-btn" className="btn btn-primary" onClick={handleCreate} disabled={loading === 'create'}>
                        {loading === 'create' ? '⏳ Creating…' : '🎲 Create New Room'}
                    </button>
                </div>

                <div className="divider">or</div>

                <div className="home-section">
                    <h2>Join Room</h2>
                    <input
                        id="join-code-input"
                        className="input"
                        placeholder="Room code (e.g. XK92FT)"
                        value={roomCode}
                        onChange={e => setRoomCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        style={{ letterSpacing: 4, fontWeight: 700 }}
                    />
                    <button id="join-room-btn" className="btn btn-secondary" onClick={handleJoin} disabled={loading === 'join'}>
                        {loading === 'join' ? '⏳ Joining…' : '🚪 Join Room'}
                    </button>
                </div>
            </div>
        </div>
    );
}
