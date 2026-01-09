"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeService = void 0;
const youtubei_js_1 = __importDefault(require("youtubei.js"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Cache stream URLs (they expire after ~6 hours, we cache for 30 min)
const streamCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
// YouTube Music InnerTube API endpoint
const INNERTUBE_API_URL = 'https://music.youtube.com/youtubei/v1';
class YouTubeService {
    innertube = null;
    authService = null;
    setAuthService(authService) {
        this.authService = authService;
    }
    async init() {
        try {
            console.log('Initializing YouTube service...');
            this.innertube = await youtubei_js_1.default.create({
                lang: 'en',
                location: 'US',
                retrieve_player: false,
            });
            console.log('YouTube service initialized successfully');
        }
        catch (err) {
            console.error('Failed to initialize YouTube service:', err);
            throw err;
        }
    }
    /**
     * Make authenticated request to YouTube Music InnerTube API
     */
    async innertubeRequest(endpoint, body) {
        if (!this.authService?.isLoggedIn()) {
            throw new Error('Not logged in');
        }
        const cookie = this.authService.getCookie();
        const sapisidHash = this.authService.generateSAPISIDHash();
        const visitorData = this.authService.getVisitorData();
        const dataSyncId = this.authService.getDataSyncId();
        // Build context matching OuterTune's format
        const context = {
            client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20241106.01.00',
                gl: 'US',
                hl: 'en',
            },
            user: {
                onBehalfOfUser: dataSyncId || undefined,
            },
        };
        const requestBody = {
            context,
            ...body,
        };
        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Format-Version': '1',
            'X-YouTube-Client-Name': '67', // WEB_REMIX client ID
            'X-YouTube-Client-Version': '1.20241106.01.00',
            'X-Origin': 'https://music.youtube.com',
            'Origin': 'https://music.youtube.com',
            'Referer': 'https://music.youtube.com/',
        };
        if (cookie) {
            headers['Cookie'] = cookie;
        }
        if (sapisidHash) {
            headers['Authorization'] = `SAPISIDHASH ${sapisidHash}`;
        }
        if (visitorData) {
            headers['X-Goog-Visitor-Id'] = visitorData;
        }
        console.log('Making InnerTube request to:', endpoint);
        console.log('DataSyncId:', dataSyncId ? 'present' : 'missing');
        const response = await fetch(`${INNERTUBE_API_URL}/${endpoint}?prettyPrint=false`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const text = await response.text();
            console.error('InnerTube request failed:', response.status, text.slice(0, 500));
            throw new Error(`InnerTube request failed: ${response.status}`);
        }
        return response.json();
    }
    /**
     * Get account info from YouTube Music
     */
    async getAccountInfo() {
        try {
            const response = await this.innertubeRequest('account/account_menu', {
                deviceTheme: 'DEVICE_THEME_SELECTED',
                userInterfaceTheme: 'USER_INTERFACE_THEME_DARK',
            });
            const header = response?.actions?.[0]?.openPopupAction?.popup?.multiPageMenuRenderer?.header?.activeAccountHeaderRenderer;
            if (header) {
                return {
                    name: header.accountName?.runs?.[0]?.text || '',
                    email: header.email?.runs?.[0]?.text || '',
                    channelHandle: header.channelHandle?.runs?.[0]?.text || '',
                };
            }
            return null;
        }
        catch (err) {
            console.error('Failed to get account info:', err);
            return null;
        }
    }
    /**
     * Get user's YouTube Music library playlists
     */
    async getLibraryPlaylists() {
        try {
            const response = await this.innertubeRequest('browse', {
                browseId: 'FEmusic_liked_playlists',
            });
            const contents = response?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
                ?.tabRenderer?.content?.sectionListRenderer?.contents?.[0];
            let items = [];
            // Handle grid renderer (most common)
            if (contents?.gridRenderer?.items) {
                items = contents.gridRenderer.items;
            }
            // Handle music shelf renderer
            else if (contents?.musicShelfRenderer?.contents) {
                items = contents.musicShelfRenderer.contents;
            }
            const playlists = items
                .map((item) => this.parseLibraryPlaylistItem(item))
                .filter((p) => p !== null && p.id !== 'LM' && p.id !== 'SE'); // Filter out Liked Music and Episodes
            return playlists;
        }
        catch (err) {
            console.error('Failed to get library playlists:', err);
            return [];
        }
    }
    parseLibraryPlaylistItem(item) {
        // Handle musicTwoRowItemRenderer (grid items)
        const twoRow = item?.musicTwoRowItemRenderer;
        if (twoRow) {
            const browseId = twoRow.navigationEndpoint?.browseEndpoint?.browseId;
            if (!browseId)
                return null;
            return {
                id: browseId,
                title: twoRow.title?.runs?.[0]?.text || 'Unknown Playlist',
                thumbnailUrl: twoRow.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url,
                songCount: twoRow.subtitle?.runs?.[0]?.text || '',
                isYouTubeMusic: true,
            };
        }
        // Handle musicResponsiveListItemRenderer (list items)
        const listItem = item?.musicResponsiveListItemRenderer;
        if (listItem) {
            const browseId = listItem.navigationEndpoint?.browseEndpoint?.browseId ||
                listItem.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
                    ?.playNavigationEndpoint?.watchEndpoint?.playlistId;
            if (!browseId)
                return null;
            return {
                id: browseId,
                title: listItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Unknown Playlist',
                thumbnailUrl: listItem.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url,
                songCount: listItem.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || '',
                isYouTubeMusic: true,
            };
        }
        return null;
    }
    /**
     * Get user's liked songs from YouTube Music
     */
    async getLikedSongs() {
        try {
            console.log('Fetching liked songs...');
            // Use the playlist endpoint with LM (Liked Music)
            return this.getPlaylistSongs('LM');
        }
        catch (err) {
            console.error('Failed to get liked songs:', err);
            return [];
        }
    }
    /**
     * Get songs from a YouTube Music playlist
     */
    async getPlaylistSongs(playlistId) {
        try {
            console.log('Fetching playlist songs for:', playlistId);
            // Always prefix with VL for playlist browse
            const browseId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`;
            const response = await this.innertubeRequest('browse', {
                browseId: browseId,
            });
            console.log('Playlist response received');
            // Try to find contents - OuterTune uses twoColumnBrowseResultsRenderer
            let contents = [];
            // Path 1: twoColumnBrowseResultsRenderer (main path for playlists)
            const twoColumn = response?.contents?.twoColumnBrowseResultsRenderer;
            if (twoColumn?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents) {
                contents = twoColumn.secondaryContents.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents;
                console.log('Found contents in twoColumnBrowseResultsRenderer:', contents.length);
            }
            // Path 2: singleColumnBrowseResultsRenderer
            else {
                const tabs = response?.contents?.singleColumnBrowseResultsRenderer?.tabs;
                const tabContent = tabs?.[0]?.tabRenderer?.content;
                if (tabContent?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents) {
                    contents = tabContent.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents;
                    console.log('Found contents in singleColumnBrowseResultsRenderer (musicPlaylistShelfRenderer):', contents.length);
                }
                else if (tabContent?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents) {
                    contents = tabContent.sectionListRenderer.contents[0].musicShelfRenderer.contents;
                    console.log('Found contents in singleColumnBrowseResultsRenderer (musicShelfRenderer):', contents.length);
                }
                else if (tabContent?.sectionListRenderer?.contents) {
                    // Look through all sections
                    for (const section of tabContent.sectionListRenderer.contents) {
                        if (section.musicPlaylistShelfRenderer?.contents) {
                            contents = section.musicPlaylistShelfRenderer.contents;
                            console.log('Found contents in section musicPlaylistShelfRenderer:', contents.length);
                            break;
                        }
                        if (section.musicShelfRenderer?.contents) {
                            contents = section.musicShelfRenderer.contents;
                            console.log('Found contents in section musicShelfRenderer:', contents.length);
                            break;
                        }
                    }
                }
            }
            if (!contents || contents.length === 0) {
                console.log('No contents found. Response structure:', JSON.stringify(response, null, 2).slice(0, 3000));
                return [];
            }
            // Filter out continuation items and parse songs
            const songs = contents
                .filter((item) => item.musicResponsiveListItemRenderer || item.playlistVideoRenderer)
                .map((item) => this.parsePlaylistSongItem(item))
                .filter((s) => s !== null);
            console.log('Parsed playlist songs:', songs.length);
            return songs;
        }
        catch (err) {
            console.error('Failed to get playlist songs:', err);
            return [];
        }
    }
    parsePlaylistSongItem(item) {
        const renderer = item?.musicResponsiveListItemRenderer;
        if (!renderer) {
            // Try alternative format
            if (item?.playlistVideoRenderer) {
                const pvr = item.playlistVideoRenderer;
                return {
                    id: pvr.videoId,
                    title: pvr.title?.runs?.[0]?.text || 'Unknown',
                    artist: pvr.shortBylineText?.runs?.[0]?.text || 'Unknown Artist',
                    thumbnailUrl: pvr.thumbnail?.thumbnails?.[0]?.url,
                    duration: this.parseDuration(pvr.lengthText?.simpleText),
                };
            }
            return null;
        }
        const videoId = renderer.playlistItemData?.videoId ||
            renderer.overlay?.musicItemThumbnailOverlayRenderer?.content
                ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
            renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
                ?.navigationEndpoint?.watchEndpoint?.videoId;
        if (!videoId) {
            console.log('No videoId found in item:', JSON.stringify(renderer).slice(0, 500));
            return null;
        }
        const flexColumns = renderer.flexColumns || [];
        // Extract title
        let title = 'Unknown';
        if (flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text) {
            title = flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text;
        }
        // Extract artist - might be in different positions
        let artist = 'Unknown Artist';
        if (flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs) {
            const runs = flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs;
            // Artist is usually the first run, or we join all runs
            artist = runs.map((r) => r.text).filter((t) => t !== ' • ' && t !== ' & ').join(', ');
        }
        // Extract album
        let album = '';
        if (flexColumns[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text) {
            album = flexColumns[2].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text;
        }
        // Extract thumbnail
        let thumbnailUrl = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;
        // Extract duration from fixed columns
        let duration = 0;
        if (renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text) {
            duration = this.parseDuration(renderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text);
        }
        return {
            id: videoId,
            title,
            artist,
            album,
            thumbnailUrl,
            duration,
        };
    }
    parseDuration(durationStr) {
        if (!durationStr)
            return 0;
        const parts = durationStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
    async search(query) {
        if (!this.innertube)
            throw new Error('YouTube service not initialized');
        const results = await this.innertube.music.search(query);
        let songs = [];
        let albums = [];
        let artists = [];
        let playlists = [];
        // Try the categorized results first (when using search filters)
        if (results.songs?.contents) {
            songs = results.songs.contents.map((item) => this.parseSongItem(item)).filter(Boolean);
        }
        if (results.albums?.contents) {
            albums = results.albums.contents.map((item) => this.parseAlbumItem(item)).filter(Boolean);
        }
        if (results.artists?.contents) {
            artists = results.artists.contents.map((item) => this.parseArtistItem(item)).filter(Boolean);
        }
        if (results.playlists?.contents) {
            playlists = results.playlists.contents.map((item) => this.parsePlaylistItem(item)).filter(Boolean);
        }
        // If no categorized results, parse the main contents array
        if (songs.length === 0 && results.contents) {
            for (const section of results.contents) {
                const sectionContents = section.contents || [];
                for (const rawItem of sectionContents) {
                    const item = rawItem;
                    // Check item type
                    const itemType = item.type;
                    if (itemType === 'MusicResponsiveListItem') {
                        // This could be a song - check if it has playable endpoint
                        if (item.overlay?.content?.endpoint?.watch || item.id) {
                            const song = this.parseSongItem(item);
                            if (song)
                                songs.push(song);
                        }
                    }
                    else if (itemType === 'MusicTwoRowItem') {
                        // Could be album, artist, or playlist
                        const browseId = item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id;
                        if (browseId) {
                            if (browseId.startsWith('UC')) {
                                const artist = this.parseArtistItem(item);
                                if (artist)
                                    artists.push(artist);
                            }
                            else if (browseId.startsWith('MPREb')) {
                                const album = this.parseAlbumItem(item);
                                if (album)
                                    albums.push(album);
                            }
                            else if (browseId.startsWith('VL') || browseId.startsWith('PL')) {
                                const playlist = this.parsePlaylistItem(item);
                                if (playlist)
                                    playlists.push(playlist);
                            }
                        }
                    }
                }
            }
        }
        return { songs, albums, artists, playlists };
    }
    parseSongItem(item) {
        if (!item)
            return null;
        const id = item.id || item.video_id || item.overlay?.content?.endpoint?.watch?.video_id;
        if (!id)
            return null;
        return {
            id,
            title: this.getText(item.title) || this.getText(item.flex_columns?.[0]?.title),
            artist: item.artists?.[0]?.name || this.getText(item.author) || this.getText(item.flex_columns?.[1]?.title?.runs?.[0]) || 'Unknown',
            artistId: item.artists?.[0]?.channel_id,
            album: item.album?.name || this.getText(item.flex_columns?.[2]?.title),
            albumId: item.album?.id,
            duration: item.duration?.seconds || 0,
            thumbnailUrl: this.getThumbnail(item),
        };
    }
    parseAlbumItem(item) {
        if (!item)
            return null;
        const id = item.id || item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id;
        if (!id)
            return null;
        return {
            id,
            title: this.getText(item.title),
            artist: this.getText(item.subtitle) || this.getText(item.author) || item.artists?.[0]?.name,
            artistId: item.author?.channel_id,
            thumbnailUrl: this.getThumbnail(item),
            year: this.getText(item.year),
        };
    }
    parseArtistItem(item) {
        if (!item)
            return null;
        const id = item.id || item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id;
        if (!id)
            return null;
        return {
            id,
            name: this.getText(item.title) || this.getText(item.name),
            thumbnailUrl: this.getThumbnail(item),
            subscribers: this.getText(item.subtitle) || this.getText(item.subscribers),
        };
    }
    parsePlaylistItem(item) {
        if (!item)
            return null;
        const id = item.id || item.endpoint?.browse?.id || item.navigation_endpoint?.browse?.id;
        if (!id)
            return null;
        return {
            id,
            title: this.getText(item.title),
            author: this.getText(item.subtitle) || this.getText(item.author),
            thumbnailUrl: this.getThumbnail(item),
            songCount: this.getText(item.item_count),
        };
    }
    async getHome() {
        if (!this.innertube)
            throw new Error('YouTube service not initialized');
        try {
            const home = await this.innertube.music.getHomeFeed();
            console.log('Home feed loaded:', home.sections?.length, 'sections');
            return home.sections?.map((section) => ({
                title: this.getText(section.title) || this.getText(section.header?.title) || 'Recommendations',
                contents: section.contents?.map((item) => this.parseItem(item)) || [],
            })) || [];
        }
        catch (err) {
            console.error('Failed to get home feed:', err);
            throw err;
        }
    }
    async getStreamUrl(videoId) {
        try {
            // Check cache first
            const cached = streamCache.get(videoId);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                return {
                    url: cached.url,
                    mimeType: 'audio/webm',
                    bitrate: 128,
                    duration: cached.duration,
                };
            }
            // Use yt-dlp to get URL and duration in one call
            // Try common locations for yt-dlp
            const ytdlpPaths = [
                'yt-dlp', // System PATH
                '/usr/local/bin/yt-dlp',
                '/usr/bin/yt-dlp',
                `${process.env.HOME}/.local/bin/yt-dlp`,
            ];
            let ytdlpPath = 'yt-dlp';
            for (const path of ytdlpPaths) {
                try {
                    await execAsync(`${path} --version`, { timeout: 5000 });
                    ytdlpPath = path;
                    break;
                }
                catch {
                    continue;
                }
            }
            const url = `https://www.youtube.com/watch?v=${videoId}`;
            // Get URL and duration together using JSON output
            const { stdout } = await execAsync(`${ytdlpPath} -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio" -j "${url}"`, { timeout: 15000 });
            const info = JSON.parse(stdout);
            const streamUrl = info.url;
            const duration = info.duration || 0;
            if (!streamUrl) {
                throw new Error('No stream URL returned from yt-dlp');
            }
            // Cache the result
            streamCache.set(videoId, { url: streamUrl, duration, timestamp: Date.now() });
            return {
                url: streamUrl,
                mimeType: 'audio/webm',
                bitrate: 128,
                duration,
            };
        }
        catch (err) {
            console.error('Failed to get stream URL:', err);
            throw err;
        }
    }
    async getAlbum(albumId) {
        if (!this.innertube)
            throw new Error('YouTube service not initialized');
        const album = await this.innertube.music.getAlbum(albumId);
        const header = album.header;
        return {
            id: albumId,
            title: this.getText(header?.title),
            artist: this.getText(header?.subtitle),
            thumbnailUrl: this.getThumbnail(header),
            year: this.getText(header?.year),
            songs: album.contents?.map((item) => ({
                id: item.id,
                title: this.getText(item.title),
                artist: item.artists?.[0]?.name || this.getText(header?.subtitle),
                album: this.getText(header?.title),
                albumId: albumId,
                duration: item.duration?.seconds || 0,
                thumbnailUrl: this.getThumbnail(header),
                trackNumber: this.getText(item.index),
            })) || [],
        };
    }
    async getArtist(artistId) {
        if (!this.innertube)
            throw new Error('YouTube service not initialized');
        const artist = await this.innertube.music.getArtist(artistId);
        const header = artist.header;
        return {
            id: artistId,
            name: this.getText(header?.title),
            thumbnailUrl: this.getThumbnail(header),
            description: this.getText(header?.description),
            subscribers: this.getText(header?.subtitle),
            songs: this.findSection(artist.sections, 'Songs')?.contents?.map((item) => this.parseItem(item)) || [],
            albums: this.findSection(artist.sections, 'Albums')?.contents?.map((item) => this.parseItem(item)) || [],
            singles: this.findSection(artist.sections, 'Singles')?.contents?.map((item) => this.parseItem(item)) || [],
        };
    }
    async getPlaylist(playlistId) {
        if (!this.innertube)
            throw new Error('YouTube service not initialized');
        const playlist = await this.innertube.music.getPlaylist(playlistId);
        const header = playlist.header;
        return {
            id: playlistId,
            title: this.getText(header?.title),
            author: this.getText(header?.subtitle),
            thumbnailUrl: this.getThumbnail(header),
            songCount: this.getText(header?.second_subtitle),
            songs: playlist.contents?.map((item) => ({
                id: item.id,
                title: this.getText(item.title),
                artist: item.artists?.[0]?.name || this.getText(item.author),
                artistId: item.artists?.[0]?.channel_id,
                album: item.album?.name,
                albumId: item.album?.id,
                duration: item.duration?.seconds || 0,
                thumbnailUrl: this.getThumbnail(item),
            })) || [],
        };
    }
    parseItem(item) {
        return {
            id: item.id,
            type: item.item_type || 'song',
            title: this.getText(item.title),
            subtitle: this.getText(item.subtitle),
            thumbnailUrl: this.getThumbnail(item),
            artist: item.artists?.[0]?.name || this.getText(item.author),
            artistId: item.artists?.[0]?.channel_id,
            album: item.album?.name,
            albumId: item.album?.id,
            duration: item.duration?.seconds || 0,
        };
    }
    getText(obj) {
        if (!obj)
            return '';
        if (typeof obj === 'string')
            return obj;
        if (obj.text)
            return obj.text;
        if (obj.toString && typeof obj.toString === 'function')
            return obj.toString();
        return '';
    }
    getThumbnail(item) {
        if (!item)
            return undefined;
        const thumbnails = item.thumbnail?.contents || item.thumbnails || item.thumbnail;
        if (Array.isArray(thumbnails) && thumbnails.length > 0) {
            return thumbnails[0]?.url;
        }
        if (thumbnails?.url)
            return thumbnails.url;
        return undefined;
    }
    findSection(sections, title) {
        return sections?.find((s) => this.getText(s.title) === title);
    }
}
exports.YouTubeService = YouTubeService;
