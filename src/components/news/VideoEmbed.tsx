interface VideoEmbedProps {
  url: string;
  title?: string;
}

const VideoEmbed = ({ url, title }: VideoEmbedProps) => {
  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Facebook
    if (url.includes("facebook.com") || url.includes("fb.watch")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }

    // TikTok
    const tiktokMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
    if (tiktokMatch) {
      return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
    }

    // Instagram
    const instagramMatch = url.match(/instagram\.com\/(?:p|reel)\/([^\/]+)/);
    if (instagramMatch) {
      return `https://www.instagram.com/p/${instagramMatch[1]}/embed`;
    }

    // Twitter/X
    if (url.includes("twitter.com") || url.includes("x.com")) {
      // Twitter embeds are handled differently - return null for now
      return null;
    }

    return null;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    // Return a clickable link for unsupported platforms
    return (
      <div className="bg-muted rounded-lg p-4 text-center">
        <p className="text-muted-foreground mb-2">فيديو خارجي</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          مشاهدة الفيديو
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title={title || "فيديو"}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};

export default VideoEmbed;
