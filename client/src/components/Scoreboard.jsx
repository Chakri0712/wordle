const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ mode, data, players, countdown, isHost, onNextRound, onClose, onPlayAgain, onLeave }) {
    if (mode === 'round') {
        const { winnerId, word, scores, rn, tr } = data;
        const winner = players.find(p => p.id === winnerId);
        const sorted = [...scores].sort((a, b) => b.score - a.score);

        return (
            <div className="modal-overlay" id="round-over-modal">
                <div className="modal">
                    <h2>{winnerId ? `🎉 ${winner?.name || 'Someone'} wins the round!` : '😮 Nobody guessed it!'}</h2>
                    <div className="round-word-reveal">{word}</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4, marginTop: 4 }}>Round {rn} of {tr}</p>

                    <table className="scoreboard-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((s, i) => (
                                <tr key={s.id}>
                                    <td>{MEDALS[i] || i + 1}</td>
                                    <td>{players.find(p => p.id === s.id)?.name || '?'}</td>
                                    <td><strong>{s.score}</strong> pts</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {rn < tr ? (
                        <>
                            {countdown !== null && countdown > 0 && (
                                <p className="countdown">{countdown}</p>
                            )}
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                                {countdown !== null && countdown > 0 ? 'Next round starting soon…' : 'Waiting for host to start…'}
                            </p>
                            <div className="modal-actions">
                                {isHost && (
                                    <button id="next-round-btn" className="btn btn-primary" onClick={onNextRound}>
                                        ▶ Start Next Round
                                    </button>
                                )}
                                <button className="btn btn-ghost" onClick={onClose}>Dismiss</button>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Final scores loading…</p>
                    )}
                </div>
            </div>
        );
    }

    // Final game over
    if (mode === 'final') {
        const { finalScores, winnerId } = data;
        const winner = players.find(p => p.id === winnerId);

        return (
            <div className="modal-overlay" id="game-over-modal">
                <div className="modal">
                    <h2>🏆 Game Over!</h2>
                    <p style={{ fontSize: '1.05rem', color: 'var(--accent-light)', fontWeight: 700, marginBottom: 4 }}>
                        {winner ? `${winner.name} wins the game!` : "It's a draw!"}
                    </p>

                    <table className="scoreboard-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Final Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {finalScores.map((s, i) => (
                                <tr key={s.id}>
                                    <td className={i === 0 ? 'medal-1' : i === 1 ? 'medal-2' : i === 2 ? 'medal-3' : ''}>{MEDALS[i] || i + 1}</td>
                                    <td>{players.find(p => p.id === s.id)?.name || s.name || '?'}</td>
                                    <td><strong>{s.score}</strong> pts</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="modal-actions">
                        {isHost && (
                            <button id="play-again-btn" className="btn btn-primary" onClick={onPlayAgain}>
                                🔄 Play Again
                            </button>
                        )}
                        <button id="leave-room-btn" className="btn btn-ghost" onClick={onLeave}>
                            🚪 Leave Room
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
