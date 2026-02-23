const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const gm = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../client/dist');
    if (require('fs').existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('(.*)', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }
}

io.on('connection', (socket) => {
    console.log('connected:', socket.id);

    socket.on('create_room', ({ playerName }) => {
        const room = gm.createRoom(socket.id, playerName);
        socket.join(room.roomCode);
        socket.emit('room_created', {
            roomCode: room.roomCode,
            playerId: socket.id,
            players: room.players,
            settings: room.settings,
        });
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
        const code = (roomCode || '').toUpperCase().trim();
        const result = gm.joinRoom(code, socket.id, playerName);
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }
        socket.join(code);
        socket.emit('room_joined', {
            roomCode: code,
            playerId: socket.id,
            players: result.room.players,
            settings: result.room.settings,
        });
        socket.to(code).emit('player_joined', {
            player: result.room.players.find(p => p.id === socket.id),
        });
    });

    socket.on('update_settings', ({ roomCode, rounds, timerSeconds, roundMinutes, difficulty, wordLength }) => {
        const room = gm.getRoom(roomCode);
        if (!room || room.hostId !== socket.id) return;
        const settings = {};
        if (rounds !== undefined) settings.totalRounds = rounds;
        if (timerSeconds !== undefined) settings.timerSeconds = timerSeconds;
        if (roundMinutes !== undefined) settings.roundMinutes = roundMinutes;
        if (difficulty !== undefined) settings.difficulty = difficulty;
        if (wordLength !== undefined) settings.wordLength = wordLength;
        gm.updateSettings(roomCode, settings);
        io.to(roomCode).emit('settings_updated', { settings: gm.getRoom(roomCode).settings });
    });

    socket.on('start_game', ({ roomCode }) => {
        const room = gm.getRoom(roomCode);
        if (!room || room.hostId !== socket.id) return;
        if (room.players.filter(p => p.connected).length < 2) {
            socket.emit('error', { message: 'Need at least 2 players to start.' });
            return;
        }
        io.to(roomCode).emit('game_started', {
            roundNumber: 1,
            totalRounds: room.settings.totalRounds,
            wordLength: room.settings.wordLength,
        });
        // Delay startGame so all clients have time to navigate from Lobby to
        // Game and register their socket listeners before the first turn fires.
        setTimeout(() => gm.startGame(roomCode, io), 1500);
    });

    socket.on('submit_guess', async ({ roomCode, guess }) => {
        const result = await gm.submitGuess(roomCode, socket.id, guess, io);
        if (result && result.error) {
            socket.emit('error', { message: result.error });
        }
    });

    socket.on('surrender', ({ roomCode }) => {
        gm.surrender(roomCode, socket.id, io);
    });

    socket.on('next_round', ({ roomCode }) => {
        const room = gm.getRoom(roomCode);
        if (!room || room.hostId !== socket.id) return;
        gm.nextRound(roomCode, io);
    });

    socket.on('play_again', ({ roomCode }) => {
        const room = gm.getRoom(roomCode);
        if (!room || room.hostId !== socket.id) return;
        gm.playAgain(roomCode, io);
    });

    socket.on('leave_room', ({ roomCode }) => {
        gm.removePlayer(roomCode, socket.id, io);
        socket.leave(roomCode);
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(roomCode => {
            if (roomCode !== socket.id) {
                gm.removePlayer(roomCode, socket.id, io);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
