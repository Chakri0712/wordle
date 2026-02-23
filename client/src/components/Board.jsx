import { useEffect, useRef } from 'react';

export default function Board({ sharedGuesses, wordLength, currentInput, isMyTurn, shaking, myId, myName }) {
    const wl = wordLength || 5;
    const rows = [];
    const bottomRef = useRef(null);

    // Auto-scroll to bottom when guesses change or it becomes our turn
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [sharedGuesses.length, isMyTurn, currentInput.length]);

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
    if (isMyTurn) {
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

    // Always render 1 empty placeholder row at the bottom for visual continuity
    rows.push(
        <div key="empty-lead" className="guess-row">
            <span className="guess-row-label"></span>
            <div className="guess-tiles">
                {Array.from({ length: wl }, (_, i) => (
                    <div key={i} className="tile empty-slot" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="board-wrap" style={{ overflowY: 'auto' }}>
            <div className="board shared-board">
                {rows}
                <div ref={bottomRef} style={{ height: 1, flexShrink: 0 }} />
            </div>
        </div>
    );
}
