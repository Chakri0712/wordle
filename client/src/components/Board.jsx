export default function Board({ sharedGuesses, totalGuessLimit, wordLength, currentInput, isMyTurn, shaking, myId, myName }) {
    const wl = wordLength || 5;
    const total = totalGuessLimit || 6;
    const rows = [];

    // Submitted guesses (all players, chronological)
    for (let r = 0; r < sharedGuesses.length; r++) {
        const { playerId, playerName, guess, colors } = sharedGuesses[r];
        const isMe = playerId === myId;
        rows.push(
            <div key={`g-${r}`} className={`guess-row${isMe ? ' my-guess-row' : ''}`}>
                <span className="guess-row-label">{isMe ? (myName || 'You') : playerName}</span>
                <div className={`guess-tiles${r === sharedGuesses.length - 1 ? ' last-guess' : ''}`}>
                    {guess.split('').map((letter, i) => (
                        <div
                            key={i}
                            className={`tile tile-flip ${colors[i]}`}
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            {letter}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Active input row (current player's turn)
    const inputRowIndex = sharedGuesses.length;
    if (isMyTurn && inputRowIndex < total) {
        rows.push(
            <div key="input" className="guess-row my-guess-row">
                <span className="guess-row-label">{myName || 'You'}</span>
                <div className={`guess-tiles ${shaking ? 'shake' : ''}`}>
                    {Array.from({ length: wl }, (_, i) => {
                        const letter = currentInput[i] || '';
                        return (
                            <div key={i} className={`tile ${letter ? 'filled' : 'empty-slot'}`}>
                                {letter}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Empty placeholder rows
    const filledCount = sharedGuesses.length + (isMyTurn ? 1 : 0);
    for (let r = filledCount; r < total; r++) {
        rows.push(
            <div key={`e-${r}`} className="guess-row">
                <span className="guess-row-label"></span>
                <div className="guess-tiles">
                    {Array.from({ length: wl }, (_, i) => (
                        <div key={i} className="tile empty-slot" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="board-wrap">
            <div className="board shared-board">
                {rows}
            </div>
        </div>
    );
}
