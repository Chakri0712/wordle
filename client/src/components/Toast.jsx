export default function Toast({ toasts }) {
    return (
        <div className="toast-container" id="toast-container">
            {toasts.map(t => (
                <div key={t.id} className="toast">{t.msg}</div>
            ))}
        </div>
    );
}
