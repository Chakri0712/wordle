const ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

export default function Keyboard({ onKey, keyColors, disabled }) {
    return (
        <div className="keyboard" id="on-screen-keyboard">
            {ROWS.map((row, ri) => (
                <div key={ri} className="keyboard-row">
                    {row.map(key => {
                        const colorClass = key.length === 1 ? (keyColors[key] || '') : '';
                        return (
                            <button
                                key={key}
                                className={`key ${key.length > 1 ? 'wide' : ''} ${colorClass}`}
                                disabled={disabled}
                                onPointerDown={e => { e.preventDefault(); onKey(key); }}
                                aria-label={key}
                            >
                                {key === 'BACKSPACE' ? '⌫' : key}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
