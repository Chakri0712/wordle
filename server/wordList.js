// Online word source + local fallback for variable word length (5-8)
const fs = require('fs');
const path = require('path');

// Fallback local words by length
let fallbackWords = null;
function getFallback() {
    if (fallbackWords) return fallbackWords;
    try {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
        const all = [...(raw.easy || []), ...(raw.hard || [])].map(w => w.toUpperCase());
        fallbackWords = {};
        for (const w of all) {
            const l = w.length;
            if (l >= 5 && l <= 8) {
                if (!fallbackWords[l]) fallbackWords[l] = [];
                fallbackWords[l].push(w);
            }
        }
    } catch (e) {
        fallbackWords = {};
    }
    return fallbackWords;
}

async function getRandomWord(length = 5) {
    length = Number(length);
    try {
        const url = `https://random-word-api.vercel.app/api?words=1&length=${length}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]) {
                const w = data[0].toUpperCase();
                if (w.length === length && /^[A-Z]+$/.test(w)) return w;
            }
        }
    } catch (_) { /* fall through to local */ }
    // Local fallback
    const fb = getFallback();
    const list = fb[length] || fb[5] || [];
    if (list.length === 0) return 'CRANE'; // absolute last resort
    return list[Math.floor(Math.random() * list.length)];
}

async function isValidWord(word) {
    const upper = word.toUpperCase();
    if (!/^[A-Z]+$/.test(upper)) return false;
    try {
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${upper.toLowerCase()}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) return true;
        if (res.status === 404) return false;
    } catch (_) { /* network issue — fall back to accepting the word */ }
    // On network failure: check local fallback to avoid hard-blocking the game
    const fb = getFallback();
    const all = Object.values(fb).flat();
    return all.includes(upper);
}

module.exports = { getRandomWord, isValidWord };
