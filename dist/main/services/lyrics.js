"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LyricsService = void 0;
class LyricsService {
    LRCLIB_API = 'https://lrclib.net/api';
    async getLyrics(title, artist, duration) {
        // Try LrcLib first
        const lrcLibResult = await this.getLrcLibLyrics(title, artist, duration);
        if (lrcLibResult)
            return lrcLibResult;
        // Fallback to search
        const searchResult = await this.searchLrcLib(title, artist);
        if (searchResult)
            return searchResult;
        return null;
    }
    async getLrcLibLyrics(title, artist, duration) {
        try {
            const params = new URLSearchParams({
                track_name: title,
                artist_name: artist,
                duration: duration.toString(),
            });
            const response = await fetch(`${this.LRCLIB_API}/get?${params}`);
            if (!response.ok)
                return null;
            const data = await response.json();
            if (data.syncedLyrics || data.plainLyrics) {
                return {
                    synced: data.syncedLyrics || null,
                    plain: data.plainLyrics || null,
                    source: 'lrclib',
                };
            }
            return null;
        }
        catch (err) {
            console.error('LrcLib error:', err);
            return null;
        }
    }
    async searchLrcLib(title, artist) {
        try {
            const params = new URLSearchParams({
                q: `${title} ${artist}`,
            });
            const response = await fetch(`${this.LRCLIB_API}/search?${params}`);
            if (!response.ok)
                return null;
            const results = await response.json();
            if (results && results.length > 0) {
                const best = results[0];
                return {
                    synced: best.syncedLyrics || null,
                    plain: best.plainLyrics || null,
                    source: 'lrclib',
                };
            }
            return null;
        }
        catch (err) {
            console.error('LrcLib search error:', err);
            return null;
        }
    }
    parseSyncedLyrics(syncedLyrics) {
        const lines = [];
        const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
        let match;
        while ((match = regex.exec(syncedLyrics)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3].padEnd(3, '0'));
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = match[4].trim();
            if (text) {
                lines.push({ time, text });
            }
        }
        return lines.sort((a, b) => a.time - b.time);
    }
}
exports.LyricsService = LyricsService;
