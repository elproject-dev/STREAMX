import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Eye, Tag, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import VideoRow from '@/components/home/VideoRow';
import { Skeleton } from '@/components/ui/skeleton';

export default function Watch() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: video, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => base44.entities.Video.filter({ id: videoId }),
    select: (data) => data[0],
    enabled: !!videoId,
  });

  const { data: relatedVideos = [] } = useQuery({
    queryKey: ['related-videos', video?.category],
    queryFn: () => video?.category
      ? base44.entities.Video.filter({ category: video.category }, '-created_date', 10)
      : base44.entities.Video.list('-created_date', 10),
    enabled: !!video,
  });

  // Increment view count
  const viewMutation = useMutation({
    mutationFn: () => base44.entities.Video.update(videoId, { view_count: (video?.view_count || 0) + 1 }),
  });

  useEffect(() => {
    if (video && videoId) {
      viewMutation.mutate();
    }
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <Skeleton className="w-full aspect-video max-w-5xl mx-auto rounded-lg" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background pt-28 text-center">
        <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Video Tidak Ditemukan</h2>
        <Link to="/" className="text-primary hover:underline">Kembali ke Home</Link>
      </div>
    );
  }

  // Build Google Drive embed URL
  const driveEmbedUrl = `https://drive.google.com/file/d/${video.drive_file_id}/preview`;

  const filteredRelated = relatedVideos.filter(v => v.id !== video.id);

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      {/* Video Player */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full bg-black"
      >
        <div className="max-w-6xl mx-auto">
          <div className="relative w-full aspect-video">
            <iframe
              src={driveEmbedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title={video.title}
            />
          </div>
        </div>
      </motion.div>

      {/* Video Info */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Main Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black text-foreground mb-4">
                {video.title}
              </h1>

              {/* Meta Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {video.category && (
                  <span className="px-3 py-1 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider rounded-full border border-primary/20">
                    {video.category.replace('_', ' ')}
                  </span>
                )}
                {video.rating && (
                  <span className="px-2.5 py-1 border border-border text-muted-foreground text-xs font-medium rounded-full">
                    {video.rating}
                  </span>
                )}
                {video.year && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {video.year}
                  </span>
                )}
                {video.duration && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {video.duration}
                  </span>
                )}
                {video.view_count > 0 && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    {video.view_count} views
                  </span>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sinopsis</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    {video.description}
                  </p>
                </div>
              )}

              {/* Genre */}
              {video.genre && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Genre: </span>
                  <span className="text-sm text-foreground font-medium">{video.genre}</span>
                </div>
              )}
            </div>

            {/* Thumbnail Sidebar */}
            {video.thumbnail_url && (
              <div className="w-full md:w-72 shrink-0">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full rounded-xl object-cover shadow-2xl"
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Related Videos */}
      {filteredRelated.length > 0 && (
        <div className="pb-16">
          <VideoRow title="Video Terkait" videos={filteredRelated} icon={Film} />
        </div>
      )}
    </div>
  );
}