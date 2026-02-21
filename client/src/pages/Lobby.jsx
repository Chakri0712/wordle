import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../socket';
import { useTheme } from '../App';
import RulesModal from '../components/RulesModal';

export default function Lobby() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const myId = sessionStorage.getItem('playerId') || socket.id;
    const initPlayers = JSON.parse(sessionStorage.getItem('roomPlayers') || '[]');
    const initSettings = JSON.parse(sessionStorage.getItem('roomSettings') || '{"totalRounds":5,"timerSeconds":15,"difficulty":"easy","wordLength":5}');

    const [players, setPlayers] = useState(initPlayers);
    const [settings, setSettings] = useState(initSettings);
    const [hostId, setHostId] = useState(initPlayers[0]?.id || '');
    const [copied, setCopied] = useState(false);
    const [showRules, setShowRules] = useState(false);

    const isHost = myId === hostId;
    const canStart = players.filter(p => p.connected !== false).length >= 2;

    useEffect(() => {
        socket.on('player_joined', ({ player }) => {
            setPlayers(prev => prev.find(p => p.id === player.id) ? prev : [...prev, player]);
        });
        socket.on('player_left', ({ playerId }) => {
            setPlayers(prev => prev.filter(p => p.id !== playerId));
        });
        socket.on('settings_updated', ({ settings: s }) => {
            setSettings(s);
            sessionStorage.setItem('roomSettings', JSON.stringify(s));
        });
        socket.on('host_changed', ({ newHostId }) => {
            setHostId(newHostId);
        });
        socket.on('game_started', ({ wordLength: wl, totalRounds: tr }) => {
            const updated = { ...settings };
            if (wl) updated.wordLength = wl;
            if (tr) updated.totalRounds = tr;
            sessionStorage.setItem('roomSettings', JSON.stringify(updated));
            navigate(`/game/${roomCode}`);
        });
        return () => {
            socket.off('player_joined');
            socket.off('player_left');
            socket.off('settings_updated');
            socket.off('host_changed');
            socket.off('game_started');
        };
    }, [roomCode, navigate]);

    function handleSetting(key, value) {
        const updated = { ...settings, [key]: value };
        setSettings(updated);
        socket.emit('update_settings', {
            roomCode,
            rounds: updated.totalRounds,
            timerSeconds: updated.timerSeconds,
            difficulty: updated.difficulty,
            wordLength: updated.wordLength,
        });
    }

    function handleStart() {
        socket.emit('start_game', { roomCode });
    }

    function handleLeave() {
        socket.emit('leave_room', { roomCode });
        navigate('/');
    }

    function copyInvite() {
        navigator.clipboard.writeText(`${window.location.origin}/?join=${roomCode}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="lobby-page">
            {/* Top strip */}
            <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowRules(true)}>📖 Rules</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
                <button className="btn btn-danger" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={handleLeave}>Leave</button>
            </div>

            <div className="lobby-header">
                <h1>🟩 Game Lobby</h1>
                <p>Share the code with your friends</p>
            </div>

            <div className="room-code-wrap">
                <div className="room-code-box">{roomCode}</div>
                <div style={{ marginTop: 12 }}>
                    <button id="copy-invite-btn" className="btn btn-ghost" onClick={copyInvite}>
                        {copied ? '✅ Copied!' : '🔗 Copy Invite Link'}
                    </button>
                </div>
            </div>

            <div className="lobby-grid">
                {/* Players */}
                <div className="lobby-panel">
                    <h2>Players ({players.length}/8)</h2>
                    {players.map(p => (
                        <div key={p.id} className="player-item">
                            {p.id === hostId && <span title="Host">👑</span>}
                            <span>{p.name}</span>
                            {p.id === myId && <span className="you-badge">(you)</span>}
                        </div>
                    ))}
                </div>

                {/* Settings */}
                <div className="lobby-panel">
                    <h2>Room Settings</h2>
                    {isHost ? (
                        <>
                            <div className="setting-row">
                                <label>Word Length</label>
                                <select id="wordlength-select" value={settings.wordLength || 5} onChange={e => handleSetting('wordLength', Number(e.target.value))}>
                                    <option value={5}>5 letters</option>
                                    <option value={6}>6 letters</option>
                                    <option value={7}>7 letters</option>
                                    <option value={8}>8 letters</option>
                                </select>
                            </div>
                            <div className="setting-row">
                                <label>Number of Rounds</label>
                                <select id="rounds-select" value={settings.totalRounds} onChange={e => handleSetting('totalRounds', Number(e.target.value))}>
                                    <option value={3}>Best of 3</option>
                                    <option value={5}>Best of 5</option>
                                    <option value={7}>Best of 7</option>
                                </select>
                            </div>
                            <div className="setting-row">
                                <label>Turn Timer</label>
                                <select id="timer-select" value={settings.timerSeconds} onChange={e => handleSetting('timerSeconds', Number(e.target.value))}>
                                    <option value={10}>10 seconds</option>
                                    <option value={15}>15 seconds</option>
                                    <option value={30}>30 seconds</option>
                                    <option value={60}>60 seconds</option>
                                </select>
                            </div>
                            <button
                                id="start-game-btn"
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: 8 }}
                                onClick={handleStart}
                                disabled={!canStart}
                            >
                                {canStart ? '🚀 Start Game' : '⏳ Need ≥ 2 players'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="settings-display">
                                <div>Word Length: <strong>{settings.wordLength || 5} letters</strong></div>
                                <div>Rounds: <strong>{settings.totalRounds}</strong></div>
                                <div>Timer: <strong>{settings.timerSeconds}s</strong></div>
                            </div>
                            <p className="waiting-text">⏳ Waiting for host to start the game…</p>
                        </>
                    )}
                </div>
            </div>

            {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        </div>
    );
}
