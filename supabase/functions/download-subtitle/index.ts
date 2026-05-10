// @ts-nocheck — File ini berjalan di Deno runtime Supabase, bukan local TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { file_id, filename } = await req.json()
    const apiKey = Deno.env.get('OPENSUBTITLES_API_KEY')

    if (!file_id) {
      throw new Error('file_id is required')
    }

    // 1. Dapatkan Link Download dari OpenSubtitles
    const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey || '',
        'Content-Type': 'application/json',
        'User-Agent': 'StreamX v1.0'
      },
      body: JSON.stringify({ file_id: Number(file_id) })
    })

    if (!downloadRes.ok) {
      const errorText = await downloadRes.text()
      throw new Error(`OpenSubtitles API error: ${errorText}`)
    }

    const { link } = await downloadRes.json()

    if (!link) {
      throw new Error('No download link returned from OpenSubtitles')
    }

    // 2. Ambil File SRT asli dari link yang diberikan
    const fileRes = await fetch(link)
    if (!fileRes.ok) throw new Error('Failed to fetch actual subtitle file')
    
    const arrayBuffer = await fileRes.arrayBuffer()

    // 3. Kirim kembali sebagai file download
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-subrip',
        'Content-Disposition': `attachment; filename="${filename || 'subtitle.srt'}"`,
      },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
