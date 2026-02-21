export default function Timer({ timeLeft, total }) {
    const pct = total > 0 ? (timeLeft / total) * 100 : 0;
    const urgent = timeLeft !== null && timeLeft <= 5;

    return (
        <div className="timer-wrap" id="turn-timer">
            <span className={`timer-num ${urgent ? 'urgent' : ''}`}>{timeLeft ?? '–'}</span>
            <div className="timer-bar-bg">
                <div
                    className={`timer-bar ${urgent ? 'urgent' : ''}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
