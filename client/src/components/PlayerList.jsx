export default function PlayerList({ players, hostId, activePlayerId, myId, onSurrender }) {
    return (
        <div id="player-list">
            {players.map(p => {
                const isActive = p.id === activePlayerId;
                const isSurrendered = p.surrendered;
                const isDisconnected = p.connected === false;
                return (
                    <div
                        key={p.id}
                        className={`player-list-item ${isActive ? 'active-player' : ''} ${isSurrendered ? 'surrendered' : ''}`}
                    >
                        {isActive && !isSurrendered && <span title="Current turn">→</span>}
                        {p.id === hostId && <span title="Host">👑</span>}
                        <span className="player-name" title={p.name}>
                            {p.name}
                            {isDisconnected && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}> (offline)</span>}
                        </span>
                        <span className="player-score">{p.score ?? 0}pt{(p.score ?? 0) !== 1 ? 's' : ''}</span>
                        {p.id === myId && !isSurrendered && (
                            <button
                                className="surrender-btn"
                                title="Surrender this round"
                                onClick={onSurrender}
                                aria-label="Surrender"
                            >
                                🏳️
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
