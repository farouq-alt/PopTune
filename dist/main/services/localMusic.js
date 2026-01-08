"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalMusicService = void 0;
const music_metadata_1 = require("music-metadata");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SUPPORTED_FORMATS = ['.mp3', '.flac', '.ogg', '.m4a', '.wav', '.aac', '.opus', '.wma'];
class LocalMusicService {
    async scanFolder(folderPath) {
        const songs = [];
        await this.scanDirectory(folderPath, songs);
        return songs;
    }
    async scanDirectory(dirPath, songs) {
        const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                await this.scanDirectory(fullPath, songs);
            }
            else if (entry.isFile()) {
                const ext = path_1.default.extname(entry.name).toLowerCase();
                if (SUPPORTED_FORMATS.includes(ext)) {
                    try {
                        const metadata = await this.getMetadata(fullPath);
                        if (metadata) {
                            songs.push(metadata);
                        }
                    }
                    catch (err) {
                        console.error(`Error reading ${fullPath}:`, err);
                    }
                }
            }
        }
    }
    async getMetadata(filePath) {
        try {
            const metadata = await (0, music_metadata_1.parseFile)(filePath);
            const stats = fs_1.default.statSync(filePath);
            const picture = metadata.common.picture?.[0];
            let thumbnailUrl;
            if (picture) {
                const base64 = Buffer.from(picture.data).toString('base64');
                thumbnailUrl = `data:${picture.format};base64,${base64}`;
            }
            return {
                id: `local_${Buffer.from(filePath).toString('base64').slice(0, 32)}`,
                title: metadata.common.title || path_1.default.basename(filePath, path_1.default.extname(filePath)),
                artist: metadata.common.artist || metadata.common.artists?.join(', ') || 'Unknown Artist',
                album: metadata.common.album || 'Unknown Album',
                duration: Math.floor(metadata.format.duration || 0),
                thumbnailUrl,
                isLocal: true,
                localPath: filePath,
                trackNumber: metadata.common.track?.no ?? undefined,
                discNumber: metadata.common.disk?.no ?? undefined,
                year: metadata.common.year,
                genre: metadata.common.genre?.join(', '),
                bitrate: metadata.format.bitrate,
                sampleRate: metadata.format.sampleRate,
                fileSize: stats.size,
            };
        }
        catch (err) {
            console.error(`Failed to parse metadata for ${filePath}:`, err);
            return null;
        }
    }
}
exports.LocalMusicService = LocalMusicService;
