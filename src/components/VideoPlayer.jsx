import React, { useEffect, useRef, useMemo } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export default function VideoPlayer({ src, subtitleVtt, subtitleLabel, poster, onError }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const subtitleBlobUrl = useMemo(() => {
    if (!subtitleVtt) return null;
    const blob = new Blob([subtitleVtt], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  }, [subtitleVtt]);

  useEffect(() => {
    if (!videoRef.current) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: false,
      responsive: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'playbackRateMenuButton',
          'subsCapsButton',
          'fullscreenToggle',
        ],
      },
    });

    playerRef.current = player;

    player.on('error', () => {
      if (onError) onError();
    });

    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, []);

  // Update source when src changes
  useEffect(() => {
    if (!playerRef.current || !src) return;
    playerRef.current.src({ src, type: 'video/mp4' });
  }, [src]);

  // Update subtitle track
  useEffect(() => {
    if (!playerRef.current) return;
    const player = playerRef.current;

    // Remove existing tracks
    const tracks = player.textTracks();
    for (let i = 0; i < tracks.length; i++) {
      player.removeRemoteTextTrack(tracks[i]);
    }

    // Add new track if subtitle exists
    if (subtitleBlobUrl) {
      player.addRemoteTextTrack({
        kind: 'subtitles',
        src: subtitleBlobUrl,
        srclang: 'id',
        label: subtitleLabel || 'Indonesia',
        default: true,
      }, false);

      // Auto-enable the track
      setTimeout(() => {
        const t = player.textTracks();
        for (let i = 0; i < t.length; i++) {
          if (t[i].kind === 'subtitles') {
            t[i].mode = 'showing';
          }
        }
      }, 500);
    }
  }, [subtitleBlobUrl, subtitleLabel]);

  return (
    <div data-vjs-player className="w-full h-full">
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered vjs-theme-factory"
        playsInline
        poster={poster || undefined}
      />
    </div>
  );
}
