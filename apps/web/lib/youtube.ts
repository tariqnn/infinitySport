const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Converts a normal YouTube share/watch URL into a privacy-enhanced embed URL. */
export function getYouTubeEmbedUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

    let videoId = '';
    if (url.hostname.toLowerCase().endsWith('youtu.be')) {
      videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') || '';
    } else {
      const [kind, id] = url.pathname.split('/').filter(Boolean);
      if (['embed', 'live', 'shorts'].includes(kind)) videoId = id || '';
    }

    if (!YOUTUBE_VIDEO_ID.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
  } catch {
    return null;
  }
}
