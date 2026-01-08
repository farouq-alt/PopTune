import { parseFile } from 'music-metadata'
import fs from 'fs'
import path from 'path'

const SUPPORTED_FORMATS = ['.mp3', '.flac', '.ogg', '.m4a', '.wav', '.aac', '.opus', '.wma']

export class LocalMusicService {
  async scanFolder(folderPath: string): Promise<LocalSong[]> {
    const songs: LocalSong[] = []
    await this.scanDirectory(folderPath, songs)
    return songs
  }

  private async scanDirectory(dirPath: string, songs: LocalSong[]) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, songs)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (SUPPORTED_FORMATS.includes(ext)) {
          try {
            const metadata = await this.getMetadata(fullPath)
            if (metadata) {
              songs.push(metadata)
            }
          } catch (err) {
            console.error(`Error reading ${fullPath}:`, err)
          }
        }
      }
    }
  }

  async getMetadata(filePath: string): Promise<LocalSong | null> {
    try {
      const metadata = await parseFile(filePath)
      const stats = fs.statSync(filePath)

      const picture = metadata.common.picture?.[0]
      let thumbnailUrl: string | undefined

      if (picture) {
        const base64 = Buffer.from(picture.data).toString('base64')
        thumbnailUrl = `data:${picture.format};base64,${base64}`
      }

      return {
        id: `local_${Buffer.from(filePath).toString('base64').slice(0, 32)}`,
        title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
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
      }
    } catch (err) {
      console.error(`Failed to parse metadata for ${filePath}:`, err)
      return null
    }
  }
}

export interface LocalSong {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  thumbnailUrl?: string
  isLocal: boolean
  localPath: string
  trackNumber?: number
  discNumber?: number
  year?: number
  genre?: string
  bitrate?: number
  sampleRate?: number
  fileSize?: number
}
