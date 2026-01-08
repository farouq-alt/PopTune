# Tuner

A cross-platform desktop music player for YouTube Music and local files, built with Electron and React.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)

## Features

- 🎵 Stream music from YouTube Music
- 📁 Play local audio files (MP3, FLAC, OGG, M4A, WAV, etc.)
- 📝 Synchronized lyrics from LrcLib
- 🎨 Modern, dark UI with smooth animations
- 📋 Create and manage playlists
- ❤️ Like songs and build your library
- � Recentlay played history
- 🔀 Shuffle and repeat modes
- �  Volume control with mute
- �️ Cross- platform (Linux, Windows, macOS)

## Screenshots

*Coming soon*

## Requirements

- Node.js 18+
- npm or yarn
- FFmpeg (for audio transcoding)
- yt-dlp (for YouTube stream URLs)

### Installing Dependencies

**Linux (Ubuntu/Debian/Pop!_OS):**
```bash
sudo apt install ffmpeg
pip3 install --user yt-dlp
```

**Windows:**
```bash
# Install FFmpeg: https://ffmpeg.org/download.html (add to PATH)
# Install yt-dlp:
pip install yt-dlp
# Or download from: https://github.com/yt-dlp/yt-dlp/releases
```

**macOS:**
```bash
brew install ffmpeg yt-dlp
```

## Development

```bash
# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for your platform
npm run package:linux   # Linux (AppImage, deb)
```

## Tech Stack

- **Electron** - Cross-platform desktop framework
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **better-sqlite3** - Local database
- **youtubei.js** - YouTube Music API (browsing/search)
- **yt-dlp** - YouTube stream URL extraction
- **FFmpeg** - Audio transcoding
- **music-metadata** - Audio file metadata parsing

## Project Structure

```
tuner/
├── electron/           # Electron main process
│   ├── main.ts        # Main entry point
│   ├── preload.ts     # Preload script (IPC bridge)
│   ├── database.ts    # SQLite database
│   └── services/      # Backend services
│       ├── youtube.ts # YouTube Music API
│       ├── lyrics.ts  # Lyrics fetching
│       └── localMusic.ts # Local file scanning
├── src/               # React renderer
│   ├── components/    # UI components
│   ├── pages/         # Page components
│   ├── store/         # Zustand stores
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
└── assets/            # Static assets
```

## Credits

This project is inspired by and based on:
- [OuterTune](https://github.com/DD3Boh/OuterTune) by DD3Boh - Android YouTube Music client
- [InnerTune](https://github.com/z-huang/InnerTune) by z-huang - Original Android app

Special thanks to the developers of these projects for creating the foundation this desktop app is built upon.

## License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

This is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

## Disclaimer

This project is not affiliated with YouTube or Google. YouTube Music is a trademark of Google LLC.
