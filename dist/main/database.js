"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDatabase = getDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db;
function initDatabase() {
    const userDataPath = electron_1.app.getPath('userData');
    const dbPath = path_1.default.join(userDataPath, 'tuner.db');
    // Ensure directory exists
    if (!fs_1.default.existsSync(userDataPath)) {
        fs_1.default.mkdirSync(userDataPath, { recursive: true });
    }
    db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    // Create tables
    db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      albumId TEXT,
      duration INTEGER,
      thumbnailUrl TEXT,
      isLocal INTEGER DEFAULT 0,
      localPath TEXT,
      liked INTEGER DEFAULT 0,
      likedAt INTEGER,
      playCount INTEGER DEFAULT 0,
      lastPlayedAt INTEGER,
      dateAdded INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      thumbnailUrl TEXT,
      isLocal INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      artistId TEXT,
      thumbnailUrl TEXT,
      year INTEGER,
      isLocal INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      thumbnailUrl TEXT,
      createdAt INTEGER,
      isLocal INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlistId TEXT,
      songId TEXT,
      position INTEGER,
      addedAt INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      PRIMARY KEY (playlistId, songId),
      FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      songId TEXT,
      position INTEGER,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_songs_liked ON songs(liked);
    CREATE INDEX IF NOT EXISTS idx_songs_lastPlayed ON songs(lastPlayedAt);
    CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlistId);
  `);
    return db;
}
function getDatabase() {
    return db;
}
