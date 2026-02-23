export default function RulesModal({ onClose }) {
    return (
        <div className="modal-overlay" id="rules-modal" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ marginBottom: 0 }}>📖 How to Play</h2>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px 12px' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <section>
                        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 8 }}>Objective</h3>
                        <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                            Be the first player to correctly guess the hidden word. The word is chosen by the server — no one sees it until the round ends.
                        </p>
                    </section>

                    <section>
                        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 8 }}>Turn Order</h3>
                        <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                            Players take turns in randomized order. On your turn you have a timer to submit a valid word of the correct length. Missing the timer counts as a timeout.
                        </p>
                    </section>

                    <section>
                        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 8 }}>Color Clues</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, background: 'var(--tile-correct)', borderRadius: 4, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>Green</strong> — correct letter, correct position</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, background: 'var(--tile-present)', borderRadius: 4, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>Yellow</strong> — letter is in the word but wrong position</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, background: 'var(--tile-absent)', borderRadius: 4, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>Grey</strong> — letter is not in the word</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 8 }}>Scoring</h3>
                        <ul style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text-muted)', paddingLeft: 18 }}>
                            <li><strong style={{ color: 'var(--text)' }}>+3 pts</strong> for guessing correctly</li>
                            <li><strong style={{ color: 'var(--text)' }}>+1 pt</strong> bonus for guessing in ≤ 2 turns</li>
                            <li><strong style={{ color: 'var(--text)' }}>+1 pt</strong> bonus for being first to guess correctly</li>
                        </ul>
                    </section>

                    <section>
                        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 8 }}>End of Round</h3>
                        <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                            The round ends when a player guesses the word correctly, or the global Round Time runs out. You have infinite guesses. Missing a turn timer skips your turn but does not eliminate you. You can voluntarily surrender using the 🏳 button.
                        </p>
                    </section>
                </div>

                <div className="modal-actions" style={{ marginTop: 24 }}>
                    <button className="btn btn-primary" onClick={onClose}>Got it!</button>
                </div>
            </div>
        </div>
    );
}
