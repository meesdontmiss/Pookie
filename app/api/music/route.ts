import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'music')
    const entries = await fs.readdir(musicDir, { withFileTypes: true })
    const allowed = new Set(['.mp3', '.ogg', '.wav', '.webm'])
    const tracks = entries
      .filter((e) => e.isFile() && allowed.has(path.extname(e.name).toLowerCase()))
      .map((e) => ({
        url: `/music/${encodeURIComponent(e.name)}`,
        name: e.name.replace(/\.[^/.]+$/, ''),
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      )
    return NextResponse.json({ tracks })
  } catch (err) {
    return NextResponse.json({ tracks: [] })
  }
}


