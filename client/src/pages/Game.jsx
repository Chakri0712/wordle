import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../socket';
import Board from '../components/Board';
import Keyboard from '../components/Keyboard';
import PlayerList from '../components/PlayerList';
import Timer from '../components/Timer';
import Scoreboard from '../components/Scoreboard';
import Toast from '../components/Toast';
import RulesModal from '../components/RulesModal';
import { useTheme } from '../App';

export default function Game() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const myId = sessionStorage.getItem('playerId') || socket.id;
    const myName = sessionStorage.getItem('playerName') || 'You';
    const initPlayers = JSON.parse(sessionStorage.getItem('roomPlayers') || '[]');
    const initSettings = JSON.parse(sessionStorage.getItem('roomSettings') || '{}');

    const [players, setPlayers] = useState(initPlayers);
    const playersRef = useRef(initPlayers);
    const [hostId, setHostId] = useState(initPlayers[0]?.id || '');
    const [roundNumber, setRoundNumber] = useState(1);
    const [totalRounds, setTotalRounds] = useState(initSettings.totalRounds || 5);
    const [wordLength, setWordLength] = useState(initSettings.wordLength || 5);

    // All guesses in chronological order (my own + other players')
    const [sharedGuesses, setSharedGuesses] = useState([]);

    const [globalTimeLeft, setGlobalTimeLeft] = useState(null);

    const [currentInput, setCurrentInput] = useState('');
    const [activePlayerId, setActivePlayerId] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [timerSeconds, setTimerSeconds] = useState(initSettings.timerSeconds || 15);
    const [shaking, setShaking] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [keyColors, setKeyColors] = useState({});
    const [roundOverData, setRoundOverData] = useState(null);
    const [gameOverData, setGameOverData] = useState(null);
    const [roundCountdown, setRoundCountdown] = useState(null);
    const [showRules, setShowRules] = useState(false);
    const timerRef = useRef(null);
    const globalTimerRef = useRef(null);
    const cdRef = useRef(null);

    const isHost = myId === hostId;

    // Keep a ref in sync so socket callbacks always see fresh player data
    useEffect(() => { playersRef.current = players; }, [players]);

    function addToast(msg) {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }

    function startCountdown(seconds) {
        clearInterval(timerRef.current);
        setTimeLeft(seconds);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    function stopCountdown() {
        clearInterval(timerRef.current);
        setTimeLeft(null);
    }

    function startGlobalCountdown(endTimeMs) {
        clearInterval(globalTimerRef.current);
        if (!endTimeMs) {
            setGlobalTimeLeft(null);
            return;
        }

        const updateTimer = () => {
            const msLeft = endTimeMs - Date.now();
            if (msLeft <= 0) {
                clearInterval(globalTimerRef.current);
                setGlobalTimeLeft(0);
            } else {
                setGlobalTimeLeft(Math.ceil(msLeft / 1000));
            }
        };

        updateTimer();
        globalTimerRef.current = setInterval(updateTimer, 1000);
    }

    function stopGlobalCountdown() {
        clearInterval(globalTimerRef.current);
        setGlobalTimeLeft(null);
    }

    function updateKeyColors(guess, colors) {
        setKeyColors(prev => {
            const updated = { ...prev };
            const priority = { correct: 3, present: 2, absent: 1 };
            for (let i = 0; i < guess.length; i++) {
                const letter = guess[i];
                const color = colors[i];
                if ((priority[color] || 0) > (priority[updated[letter]] || 0)) {
                    updated[letter] = color;
                }
            }
            return updated;
        });
    }

    useEffect(() => {
        const settings = JSON.parse(sessionStorage.getItem('roomSettings') || '{}');
        if (settings.timerSeconds) setTimerSeconds(settings.timerSeconds);
        if (settings.totalRounds) setTotalRounds(settings.totalRounds);
        if (settings.wordLength) setWordLength(settings.wordLength);

        socket.on('new_round', ({ roundNumber: rn, totalRounds: tr, turnOrder, players: ps, wordLength: wl, roundEndTime: ret }) => {
            setRoundNumber(rn);
            setTotalRounds(tr);
            if (wl) setWordLength(wl);
            setSharedGuesses([]);
            setCurrentInput('');
            setIsSubmitting(false);
            setKeyColors({});
            setRoundOverData(null);
            setActivePlayerId(null);
            if (ps) setPlayers(ps);
            stopCountdown();
            startGlobalCountdown(ret);
        });

        socket.on('your_turn', ({ timeLimit }) => {
            setIsMyTurn(true);
            setTimerSeconds(timeLimit);
            startCountdown(timeLimit);
            setCurrentInput('');
        });

        socket.on('turn_changed', ({ activePlayerId: aid }) => {
            setActivePlayerId(aid);
            if (aid !== myId) {
                setIsMyTurn(false);
                setCurrentInput('');
                stopCountdown();
            }
        });

        socket.on('guess_result', ({ playerId, guess, colors }) => {
            setIsSubmitting(false);
            const playerName = playerId === myId
                ? (myName || 'You')
                : playersRef.current.find(p => p.id === playerId)?.name || 'Player';
            setSharedGuesses(prev => [...prev, { playerId, playerName, guess, colors }]);
            if (playerId === myId) {
                setCurrentInput('');
                stopCountdown();
            }
            updateKeyColors(guess, colors);
        });

        socket.on('turn_timeout', ({ playerId }) => {
            const p = playersRef.current.find(pl => pl.id === playerId);
            addToast(`⏰ Time's up! ${p?.name || 'Player'} skipped.`);
            if (playerId === myId) { setIsMyTurn(false); setCurrentInput(''); stopCountdown(); setIsSubmitting(false); }
        });

        socket.on('player_surrendered', ({ playerId }) => {
            const p = playersRef.current.find(pl => pl.id === playerId);
            addToast(`🏳️ ${p?.name || 'Player'} surrendered.`);
            setPlayers(prev => prev.map(pl => pl.id === playerId ? { ...pl, surrendered: true } : pl));
        });

        socket.on('player_eliminated', ({ playerId }) => {
            const p = players.find(pl => pl.id === playerId);
            addToast(`❌ ${p?.name || 'Player'} eliminated.`);
        });

        socket.on('round_over', ({ winnerId, word, scores, roundNumber: rn, totalRounds: tr }) => {
            stopCountdown();
            stopGlobalCountdown();
            setIsMyTurn(false);
            setPlayers(prev => prev.map(p => {
                const s = scores.find(sc => sc.id === p.id);
                return s ? { ...p, score: s.score } : p;
            }));
            setRoundOverData({ winnerId, word, scores, rn, tr });
            if (rn < tr) {
                let cd = 5;
                setRoundCountdown(cd);
                cdRef.current = setInterval(() => {
                    cd--;
                    setRoundCountdown(cd);
                    if (cd <= 0) clearInterval(cdRef.current);
                }, 1000);
            }
        });

        socket.on('game_over', ({ finalScores, winnerId }) => {
            stopCountdown();
            stopGlobalCountdown();
            setGameOverData({ finalScores, winnerId });
        });

        socket.on('player_joined', ({ player }) => {
            setPlayers(prev => prev.find(p => p.id === player.id) ? prev : [...prev, player]);
            addToast(`👋 ${player.name} joined.`);
        });

        socket.on('player_left', ({ playerId }) => {
            setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, connected: false } : p));
        });

        socket.on('host_changed', ({ newHostId }) => {
            setHostId(newHostId);
            addToast('👑 Host has changed.');
        });

        socket.on('back_to_lobby', ({ players: ps, settings: s }) => {
            sessionStorage.setItem('roomPlayers', JSON.stringify(ps));
            sessionStorage.setItem('roomSettings', JSON.stringify(s));
            navigate(`/lobby/${roomCode}`);
        });

        socket.on('error', ({ message }) => {
            setIsSubmitting(false);
            addToast(`❌ ${message}`);
            if (message.includes('Room not found')) navigate('/');
        });

        socket.on('game_started', ({ roundNumber: rn, totalRounds: tr, wordLength: wl }) => {
            setRoundNumber(rn);
            setTotalRounds(tr);
            if (wl) setWordLength(wl);
        });

        return () => {
            socket.off('new_round');
            socket.off('your_turn');
            socket.off('turn_changed');
            socket.off('guess_result');
            socket.off('turn_timeout');
            socket.off('player_surrendered');
            socket.off('player_eliminated');
            socket.off('round_over');
            socket.off('game_over');
            socket.off('player_joined');
            socket.off('player_left');
            socket.off('host_changed');
            socket.off('back_to_lobby');
            socket.off('error');
            socket.off('game_started');
            clearInterval(timerRef.current);
            clearInterval(globalTimerRef.current);
            clearInterval(cdRef.current);
        };
    }, [roomCode, myId]);

    const submitGuess = useCallback(() => {
        if (!isMyTurn || currentInput.length !== wordLength || isSubmitting) return;
        setIsSubmitting(true);
        socket.emit('submit_guess', { roomCode, guess: currentInput });
    }, [isMyTurn, currentInput, roomCode, wordLength, isSubmitting]);

    const handleKey = useCallback((key) => {
        if (!isMyTurn || roundOverData || gameOverData) return;
        if (key === 'ENTER') {
            if (currentInput.length !== wordLength) {
                setShaking(true);
                addToast(`Word must be ${wordLength} letters!`);
                setTimeout(() => setShaking(false), 400);
                return;
            }
            submitGuess();
        } else if (key === 'BACKSPACE') {
            setCurrentInput(prev => prev.slice(0, -1));
        } else if (/^[A-Z]$/.test(key) && currentInput.length < wordLength) {
            setCurrentInput(prev => prev + key);
        }
    }, [isMyTurn, currentInput, wordLength, submitGuess, roundOverData, gameOverData]);

    useEffect(() => {
        function onKeyDown(e) {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.key === 'Enter') handleKey('ENTER');
            else if (e.key === 'Backspace') handleKey('BACKSPACE');
            else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleKey]);

    function handleSurrender() { socket.emit('surrender', { roomCode }); }
    function handleNextRound() { socket.emit('next_round', { roomCode }); }
    function handlePlayAgain() { socket.emit('play_again', { roomCode }); }
    function handleLeave() {
        socket.emit('leave_room', { roomCode });
        navigate('/');
    }

    const activePlayer = players.find(p => p.id === activePlayerId);

    return (
        <div className="game-page">
            {/* Top bar */}
            <div className="game-topbar">
                <span className="topbar-round">Round <strong>{roundNumber}</strong> of <strong>{totalRounds}</strong></span>

                {/* Global Master Timer */}
                {globalTimeLeft !== null && !roundOverData && !gameOverData && (
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#f5c518', letterSpacing: '1px' }}>
                        {Math.floor(globalTimeLeft / 60)}:{(globalTimeLeft % 60).toString().padStart(2, '0')}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isMyTurn && timeLeft !== null && (
                        <Timer timeLeft={timeLeft} total={timerSeconds} />
                    )}
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '5px 11px', fontSize: '0.8rem' }}
                        onClick={() => setShowRules(true)}
                        title="Rules"
                    >📖</button>
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '5px 11px', fontSize: '0.8rem' }}
                        onClick={toggleTheme}
                        title="Toggle theme"
                    >{theme === 'dark' ? '☀️' : '🌙'}</button>
                    <button
                        className="btn btn-danger"
                        style={{ padding: '5px 14px', fontSize: '0.8rem' }}
                        onClick={handleLeave}
                        title="Leave game"
                    >Leave</button>
                </div>
                <span className="room-tag">{roomCode}</span>
            </div>

            {/* Main body */}
            <div className="game-body">
                <div className="game-main">
                    {/* Turn banner */}
                    {!roundOverData && !gameOverData && (
                        <div className={`turn-banner ${isMyTurn ? 'your-turn' : 'others-turn'}`}>
                            {isMyTurn ? `🟦 Your turn — Enter a ${wordLength}-letter word!` : `⏳ ${activePlayer?.name || '…'} is guessing…`}
                        </div>
                    )}
                    {roundOverData && (
                        <div className="turn-banner round-over">
                            {roundOverData.winnerId
                                ? `🎉 ${players.find(p => p.id === roundOverData.winnerId)?.name || 'Someone'} guessed it! Word: ${roundOverData.word}`
                                : `⏱️ Nobody guessed it. The word was: ${roundOverData.word}`}
                        </div>
                    )}

                    {/* Board */}
                    <Board
                        sharedGuesses={sharedGuesses}
                        wordLength={wordLength}
                        currentInput={currentInput}
                        myId={myId}
                        myName={myName}
                        isMyTurn={isMyTurn}
                        shaking={shaking}
                    />

                    {/* Keyboard */}
                    <Keyboard
                        onKey={handleKey}
                        keyColors={keyColors}
                        disabled={!isMyTurn || !!roundOverData || !!gameOverData}
                    />
                </div>

                {/* Sidebar */}
                <div className="game-sidebar">
                    <div className="sidebar-header">Players</div>
                    <div className="sidebar-body">
                        <PlayerList
                            players={players}
                            hostId={hostId}
                            activePlayerId={activePlayerId}
                            myId={myId}
                            onSurrender={handleSurrender}
                        />
                    </div>
                </div>
            </div>

            {/* Round over modal */}
            {roundOverData && !gameOverData && (
                <Scoreboard
                    mode="round"
                    data={roundOverData}
                    players={players}
                    countdown={roundCountdown}
                    isHost={isHost}
                    onNextRound={handleNextRound}
                    onClose={() => setRoundOverData(null)}
                />
            )}

            {/* Game over modal */}
            {gameOverData && (
                <Scoreboard
                    mode="final"
                    data={gameOverData}
                    players={players}
                    isHost={isHost}
                    onPlayAgain={handlePlayAgain}
                    onLeave={handleLeave}
                />
            )}

            {/* Rules modal */}
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            {/* Toasts */}
            <Toast toasts={toasts} />
        </div>
    );
}
