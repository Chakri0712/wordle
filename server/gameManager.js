const { getRandomWord, isValidWord } = require('./wordList');

const rooms = {};

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms[code] ? generateCode() : code;
}

function createRoom(hostId, playerName) {
    const roomCode = generateCode();
    rooms[roomCode] = {
        roomCode,
        hostId,
        players: [{ id: hostId, name: playerName, score: 0, connected: true, surrendered: false }],
        settings: { totalRounds: 5, timerSeconds: 15, difficulty: 'easy', wordLength: 5 },
        status: 'lobby',
        currentRound: 0,
        currentWord: null,
        turnOrder: [],
        currentTurnIndex: 0,
        guesses: [],
        playerGuesses: {},      // playerId -> guess[]
        turnTimer: null,
        timeoutCount: {},
        eliminatedThisRound: new Set(),
        roundGuessCount: {},
    };
    return rooms[roomCode];
}

function getRoom(roomCode) {
    return rooms[roomCode] || null;
}

function getAllRooms() {
    return Object.keys(rooms);
}

function joinRoom(roomCode, playerId, playerName) {
    const room = rooms[roomCode];
    if (!room) return { error: 'Room not found.' };
    if (room.players.length >= 8) return { error: 'Room is full (8 players max).' };
    if (room.status !== 'lobby') return { error: 'Game already in progress.' };
    if (room.players.find(p => p.id === playerId)) return { room };
    room.players.push({ id: playerId, name: playerName, score: 0, connected: true, surrendered: false });
    return { room };
}

function updateSettings(roomCode, settings) {
    const room = rooms[roomCode];
    if (!room) return;
    Object.assign(room.settings, settings);
}

function computeColors(guess, word) {
    const len = word.length;
    const result = new Array(len).fill('absent');
    const wordArr = word.split('');
    const used = new Array(len).fill(false);
    // Pass 1: greens
    for (let i = 0; i < len; i++) {
        if (guess[i] === wordArr[i]) {
            result[i] = 'correct';
            used[i] = true;
        }
    }
    // Pass 2: yellows
    for (let i = 0; i < len; i++) {
        if (result[i] === 'correct') continue;
        for (let j = 0; j < len; j++) {
            if (!used[j] && guess[i] === wordArr[j]) {
                result[i] = 'present';
                used[j] = true;
                break;
            }
        }
    }
    return result;
}

function startGame(roomCode, io) {
    const room = rooms[roomCode];
    if (!room) return;
    room.status = 'playing';
    room.currentRound = 0;
    room.players.forEach(p => { p.score = 0; p.surrendered = false; });
    startRound(roomCode, io);
}

async function startRound(roomCode, io) {
    const room = rooms[roomCode];
    if (!room) return;
    room.currentRound++;
    room.currentWord = await getRandomWord(room.settings.wordLength);
    room.guesses = [];
    room.playerGuesses = {};
    room.timeoutCount = {};
    room.eliminatedThisRound = new Set();
    room.roundGuessCount = {};
    room.players.forEach(p => {
        p.surrendered = false;
        room.roundGuessCount[p.id] = 0;
        room.playerGuesses[p.id] = [];
    });
    // Shared guess pool: numConnectedPlayers × 5
    const eligible = room.players.filter(p => p.connected);
    room.totalGuessLimit = eligible.length * 5;
    room.turnOrder = shuffle(eligible.map(p => p.id));
    room.currentTurnIndex = 0;
    room.status = 'playing';

    io.to(roomCode).emit('new_round', {
        roundNumber: room.currentRound,
        totalRounds: room.settings.totalRounds,
        turnOrder: room.turnOrder,
        players: room.players,
        wordLength: room.settings.wordLength,
        totalGuessLimit: room.totalGuessLimit,
    });

    // Delay scheduleTurn so clients have time to navigate to game page and register listeners
    setTimeout(() => scheduleTurn(roomCode, io), 350);
}

function scheduleTurn(roomCode, io) {
    const room = rooms[roomCode];
    if (!room) return;
    clearTimeout(room.turnTimer);

    const activeId = getCurrentPlayerId(room);
    if (!activeId) {
        endRound(roomCode, null, io);
        return;
    }

    io.to(roomCode).emit('turn_changed', { activePlayerId: activeId });
    const activeSocket = io.sockets.sockets.get(activeId);
    if (activeSocket) activeSocket.emit('your_turn', { timeLimit: room.settings.timerSeconds });

    room.turnTimer = setTimeout(() => {
        handleTimeout(roomCode, activeId, io);
    }, room.settings.timerSeconds * 1000);
}

function getCurrentPlayerId(room) {
    const len = room.turnOrder.length;
    for (let i = 0; i < len; i++) {
        const idx = room.currentTurnIndex % len;
        const pid = room.turnOrder[idx];
        const player = room.players.find(p => p.id === pid);
        // Skip disconnected, surrendered, or timeout-eliminated players
        if (player && player.connected && !player.surrendered && !room.eliminatedThisRound.has(pid)) {
            return pid;
        }
        room.currentTurnIndex = (room.currentTurnIndex + 1) % len;
    }
    return null;
}

function handleTimeout(roomCode, playerId, io) {
    const room = rooms[roomCode];
    if (!room) return;
    room.timeoutCount[playerId] = (room.timeoutCount[playerId] || 0) + 1;
    io.to(roomCode).emit('turn_timeout', { playerId });

    if (room.timeoutCount[playerId] >= 3) {
        room.eliminatedThisRound.add(playerId);
        io.to(roomCode).emit('player_eliminated', { playerId });
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;

    const stillIn = getStillIn(room);
    if (stillIn.length === 0) {
        endRound(roomCode, null, io);
        return;
    }
    scheduleTurn(roomCode, io);
}

function getStillIn(room) {
    return room.turnOrder.filter(pid => {
        const p = room.players.find(pl => pl.id === pid);
        return p && p.connected && !p.surrendered && !room.eliminatedThisRound.has(pid);
    });
}

async function submitGuess(roomCode, playerId, guess, io) {
    const room = rooms[roomCode];
    if (!room) return { error: 'Room not found.' };
    if (room.status !== 'playing') return { error: 'No active game.' };

    const activeId = room.turnOrder[room.currentTurnIndex % room.turnOrder.length];
    if (playerId !== activeId) return { error: 'It is not your turn.' };

    const wordLen = room.settings.wordLength;
    const upperGuess = guess.toUpperCase();
    if (upperGuess.length !== wordLen) return { error: `Guess must be ${wordLen} letters.` };

    const valid = await isValidWord(upperGuess);
    if (!valid) return { error: 'Not a valid word.' };

    clearTimeout(room.turnTimer);
    room.timeoutCount[playerId] = 0;

    const colors = computeColors(upperGuess, room.currentWord);
    room.roundGuessCount[playerId] = (room.roundGuessCount[playerId] || 0) + 1;
    if (!room.playerGuesses[playerId]) room.playerGuesses[playerId] = [];
    room.playerGuesses[playerId].push({ guess: upperGuess, colors });

    const guessEntry = { playerId, guess: upperGuess, colors };
    room.guesses.push(guessEntry);

    const isCorrect = colors.every(c => c === 'correct');
    io.to(roomCode).emit('guess_result', { playerId, guess: upperGuess, colors, isCorrect });

    if (isCorrect) {
        const player = room.players.find(p => p.id === playerId);
        let pts = 3;
        const guessNum = room.playerGuesses[playerId].length;
        if (guessNum <= 2) pts += 1;
        // First correct bonus
        const correctCount = room.guesses.filter(g => g.colors.every(c => c === 'correct')).length;
        if (correctCount === 1) pts += 1;
        if (player) player.score += pts;
        return endRound(roomCode, playerId, io);
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;

    // End round when shared guess pool is exhausted
    if (room.guesses.length >= room.totalGuessLimit) {
        return endRound(roomCode, null, io);
    }

    const stillIn = getStillIn(room);
    if (stillIn.length === 0) {
        return endRound(roomCode, null, io);
    }

    scheduleTurn(roomCode, io);
    return { ok: true };
}

function surrender(roomCode, playerId, io) {
    const room = rooms[roomCode];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) player.surrendered = true;
    io.to(roomCode).emit('player_surrendered', { playerId });

    const activeId = room.turnOrder[room.currentTurnIndex % room.turnOrder.length];
    if (activeId === playerId) {
        clearTimeout(room.turnTimer);
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    }

    const stillIn = getStillIn(room);
    if (stillIn.length === 0) {
        endRound(roomCode, null, io);
        return;
    }
    if (activeId === playerId) scheduleTurn(roomCode, io);
}

function endRound(roomCode, winnerId, io) {
    const room = rooms[roomCode];
    if (!room) return;
    clearTimeout(room.turnTimer);
    room.status = 'round_over';

    const scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
    io.to(roomCode).emit('round_over', {
        winnerId,
        word: room.currentWord,
        scores,
        roundNumber: room.currentRound,
        totalRounds: room.settings.totalRounds,
    });

    if (room.currentRound >= room.settings.totalRounds) {
        setTimeout(() => endGame(roomCode, io), 6000);
    }
    return { ok: true };
}

function endGame(roomCode, io) {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.status === 'game_over') return; // guard against double-fire
    room.status = 'game_over';
    const finalScores = [...room.players].sort((a, b) => b.score - a.score);
    const winnerId = finalScores[0]?.id || null;
    io.to(roomCode).emit('game_over', { finalScores, winnerId });
}

function playAgain(roomCode, io) {
    const room = rooms[roomCode];
    if (!room) return;
    room.players.forEach(p => { p.score = 0; p.surrendered = false; });
    room.currentRound = 0;
    room.guesses = [];
    room.status = 'lobby';
    io.to(roomCode).emit('back_to_lobby', { players: room.players, settings: room.settings });
}

function removePlayer(roomCode, playerId, io) {
    const room = rooms[roomCode];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) player.connected = false;
    io.to(roomCode).emit('player_left', { playerId });

    // Host promotion
    if (room.hostId === playerId) {
        const next = room.players.find(p => p.connected);
        if (next) {
            room.hostId = next.id;
            io.to(roomCode).emit('host_changed', { newHostId: next.id });
        }
    }

    const connected = room.players.filter(p => p.connected);
    if (connected.length === 0) {
        delete rooms[roomCode];
        return;
    }

    // End game immediately if fewer than 2 players remain during a game
    // Also covers 'round_over' status (waiting for host to start next round)
    if ((room.status === 'playing' || room.status === 'round_over') && connected.length < 2) {
        clearTimeout(room.turnTimer);
        endGame(roomCode, io);
        return;
    }

    // If game is playing and it was their turn, advance
    if (room.status === 'playing') {
        const activeId = room.turnOrder[room.currentTurnIndex % (room.turnOrder.length || 1)];
        if (activeId === playerId) {
            clearTimeout(room.turnTimer);
            room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
            scheduleTurn(roomCode, io);
        }
    }
}

function nextRound(roomCode, io) {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.currentRound >= room.settings.totalRounds) {
        endGame(roomCode, io);
        return;
    }
    startRound(roomCode, io);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

module.exports = {
    createRoom, getRoom, getAllRooms, joinRoom, updateSettings,
    startGame, submitGuess, surrender, removePlayer,
    playAgain, nextRound, scheduleTurn,
};
