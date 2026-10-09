import React, { useState, useMemo } from 'react';
import { VideoStore, fetchTmdbData } from '@/lib/videoStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Film, Eye, ArrowLeft, X, Star, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const RATINGS = ['PG-13'];

const emptyForm = {
  title: '', description: '', thumbnail_url: '',
  category: '', genre: '', year: '', duration: '', rating: '', is_featured: false,
  tmdb_id: '', content_type: 'movie', season: '', episode: '',
  backdrop_url: '', poster_url: '', score: '', imdb_score: '', imdb_votes: '',
};

export default function Manage() {
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fetchingTmdb, setFetchingTmdb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const queryClient = useQueryClient();

  const { data: videosManage = [], isLoading } = useQuery({
    queryKey: ['videos-manage'],
    queryFn: () => VideoStore.list('-created_date', null),
    refetchOnWindowFocus: true,
  });

  const videos = videosManage;

  const createMutation = useMutation({
    mutationFn: (data) => VideoStore.create(data),
    onSuccess: () => {
      console.log('Create success');
      queryClient.invalidateQueries({ queryKey: ['videos-manage'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      resetForm();
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      toast.success("Video berhasil ditambahkan!");
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => VideoStore.update(id, data),
    onSuccess: () => {
      console.log('Update success');
      queryClient.invalidateQueries({ queryKey: ['videos-manage'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      resetForm();
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      toast.success("Video berhasil diperbarui!");
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => VideoStore.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos-manage'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success("Video berhasil dihapus!");
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingVideo(null);
    setShowForm(false);
    setSearchQuery('');
  };

  const handleEdit = (video) => {
    setForm({
      title: video.title || '',
      description: video.description || '',
      thumbnail_url: video.thumbnail_url || '',
      category: video.category || '',
      genre: video.genre || '',
      year: video.year ? String(video.year) : '',
      duration: video.duration || '',
      rating: video.rating || '',
      is_featured: video.is_featured || false,
      tmdb_id: video.tmdb_id || '',
      content_type: video.content_type || 'movie',
      season: video.season ? String(video.season) : '',
      episode: video.episode ? String(video.episode) : '',
      backdrop_url: video.backdrop_url || '',
      poster_url: video.poster_url || '',
      score: video.score || '',
      imdb_score: video.imdb_score || '',
      imdb_votes: video.imdb_votes || '',
    });
    setEditingVideo(video);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [checkingServer, setCheckingServer] = useState(false);

  const handleCheckServer = async (tmdbId, contentType) => {
    if (!tmdbId) return;
    
    // Validasi: Cek apakah user memasukkan IMDb ID (dimulai dengan 'tt')
    if (tmdbId.startsWith('tt')) {
      toast.error("Anda memasukkan IMDb ID (dimulai dengan 'tt'). Silakan gunakan TMDB ID (angka saja).");
      return;
    }

    // Validasi: Pastikan ID hanya berisi angka
    if (!/^[0-9]+$/.test(tmdbId)) {
      toast.error("TMDB ID harus berupa angka saja. Contoh: 550");
      return;
    }

    setCheckingServer(true);
    
    try {
      const baseUrl = 'https://vidsrcme.ru/embed/';
      const checkUrl = contentType === 'tv' 
        ? `${baseUrl}tv?tmdb=${tmdbId}&season=1&episode=1`
        : `${baseUrl}movie?tmdb=${tmdbId}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik timeout

      try {
        const response = await fetch(checkUrl, { 
          signal: controller.signal,
          headers: { 'Referer': 'https://vidsrcme.ru/' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          toast.success("Video tersedia dan dapat diputar.");
        } else if (response.status === 404) {
          toast.error("Film ini belum tersedia di server streaming (404).");
        } else {
          toast.error(`Server merespon dengan status ${response.status}.`);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error("Server streaming terlalu lambat merespon (Timeout).");
        }
        throw err;
      }
    } catch (error) {
      console.error('Check Server Error:', error);
      toast.error(error.message || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setCheckingServer(false);
    }
  };

  const handleFetchTmdb = async (tmdbId, contentType) => {
    if (!tmdbId) return;
    setFetchingTmdb(true);
    try {
      const tmdbData = await fetchTmdbData(tmdbId, contentType);
      if (Object.keys(tmdbData).length === 0) {
        toast.error('Gagal mengambil data dari TMDB. Periksa ID dan tipe konten.');
        setFetchingTmdb(false);
        return;
      }
      setForm(prev => ({
        ...prev,
        // Update data dari TMDB (timpa data lama agar ID baru sinkron)
        title: tmdbData.title || prev.title || '',
        description: tmdbData.description || prev.description || '',
        genre: tmdbData.genre || prev.genre || '',
        year: tmdbData.year || prev.year || '',
        duration: tmdbData.duration || prev.duration || '',
        rating: tmdbData.rating || prev.rating || '',
        score: tmdbData.score || prev.score || '',
        imdb_score: tmdbData.imdb_score || prev.imdb_score || '',
        imdb_votes: tmdbData.imdb_votes || prev.imdb_votes || '',
        thumbnail_url: tmdbData.poster_url || prev.thumbnail_url || '',
        poster_url: tmdbData.poster_url || prev.poster_url || '',
        backdrop_url: tmdbData.backdrop_url || prev.backdrop_url || '',
      }));
      setFetchingTmdb(false);
      toast.success("Data TMDB berhasil diambil!");
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat mengambil data");
      setFetchingTmdb(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form:', form);
    
    // Cek apakah TMDB ID sudah ada di koleksi (duplikat)
    if (form.tmdb_id) {
      console.log('Checking for duplicate TMDB ID:', form.tmdb_id);
      const isDuplicate = videos.some(v => 
        v.tmdb_id && 
        String(v.tmdb_id) === String(form.tmdb_id) && 
        v.id !== editingVideo?.id
      );
      
      if (isDuplicate) {
        console.warn('Duplicate TMDB ID found!');
        toast.error(`Video dengan ID ${form.tmdb_id} sudah terdaftar di koleksi Anda.`);
        return;
      }
    }

    // Auto-set category based on content_type
    const autoCategory = form.content_type === 'movie' ? 'film' : 'series';

    let data = {
      ...form,
      category: autoCategory,
      year: form.year ? Number(form.year) : undefined,
      season: form.season ? Number(form.season) : undefined,
      episode: form.episode ? Number(form.episode) : undefined,
      tmdb_id: form.tmdb_id || undefined,
      score: form.score ? Number(form.score) : undefined,
      imdb_score: form.imdb_score ? Number(form.imdb_score) : undefined,
      imdb_votes: form.imdb_votes || undefined,
      // Sinkronkan poster_url dengan thumbnail_url agar konsisten di semua halaman
      poster_url: form.thumbnail_url || form.poster_url || undefined,
    };

    console.log('Processed data:', data);

    try {
      // Auto-fetch TMDB data if tmdb_id is set but score or backdrop missing
      if (form.tmdb_id && (!form.backdrop_url || !form.score)) {
        console.log('Fetching missing TMDB data...');
        const tmdbData = await fetchTmdbData(form.tmdb_id, form.content_type);
        data = { ...data, ...tmdbData };
        if (!data.thumbnail_url && tmdbData.poster_url) data.thumbnail_url = tmdbData.poster_url;
      }

      console.log('Final data to be sent:', data);

      if (editingVideo) {
        console.log('Updating video:', editingVideo.id);
        updateMutation.mutate({ id: editingVideo.id, data });
      } else {
        console.log('Creating new video');
        createMutation.mutate(data);
      }
      console.log('Mutation initiated');
    } catch (err) {
      console.error('Error during submission:', err);
      toast.error("Terjadi kesalahan saat memproses data");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const filteredVideos = videos.filter(v => 
    v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVideos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVideos, currentPage]);

  // Reset to first page when searching
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background pt-24 md:pt-28 pb-16">
      <div className="w-full px-4 md:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kelola Video</h1>
            <p className="text-xs text-muted-foreground mt-1">{videos.length} video dalam koleksi</p>
          </div>
          <Button
            onClick={() => { setShowForm(true); setEditingVideo(null); setForm(emptyForm); }}
            size="sm"
            className="bg-primary hover:bg-primary/90 gap-1.5 mt-8"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Video
          </Button>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingVideo ? 'Edit Video' : 'Tambah Video Baru'}
                  </h2>
                  <button type="button" onClick={resetForm} className="p-1.5 hover:bg-secondary rounded-lg">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-2">
                  <Label>Judul Video *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Masukkan judul video"
                    required
                  />
                </div>

                {/* VidSrc / TMDB */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Tipe Konten</Label>
                    <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie">Movie</SelectItem>
                        <SelectItem value="tv">TV Series</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>TMDB ID</Label>
                    <Input
                      value={form.tmdb_id}
                      onChange={(e) => setForm({ ...form, tmdb_id: e.target.value })}
                      placeholder="Contoh: 927085"
                      className="h-11"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 px-6 flex-1"
                        onClick={() => handleFetchTmdb(form.tmdb_id, form.content_type)}
                        disabled={fetchingTmdb || !form.tmdb_id}
                      >
                        {fetchingTmdb ? '...' : 'Ambil Data'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 px-6 flex-1"
                        onClick={() => handleCheckServer(form.tmdb_id, form.content_type)}
                        disabled={checkingServer || !form.tmdb_id}
                      >
                        {checkingServer ? '...' : 'Cek Server'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID dari themoviedb.org
                    </p>
                  </div>
                </div>

                {form.content_type === 'tv' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Season</Label>
                      <Input
                        type="number"
                        value={form.season}
                        onChange={(e) => setForm({ ...form, season: e.target.value })}
                        placeholder="1"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Episode</Label>
                      <Input
                        type="number"
                        value={form.episode}
                        onChange={(e) => setForm({ ...form, episode: e.target.value })}
                        placeholder="1"
                        className="h-11"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Sinopsis atau deskripsi video..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Poster</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.thumbnail_url}
                        onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value, poster_url: e.target.value })}
                        placeholder="URL poster atau upload"
                        className="flex-1"
                      />
                    </div>
                    {form.thumbnail_url && (
                      <img src={form.thumbnail_url} alt="Preview" className="w-32 md:w-48 aspect-[2/3] object-cover rounded-lg mt-2 border border-border" onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Hero Banner</Label>
                    <Input
                      value={form.backdrop_url}
                      onChange={(e) => setForm({ ...form, backdrop_url: e.target.value })}
                      placeholder="URL gambar backdrop untuk hero banner"
                    />
                    {form.backdrop_url && (
                      <img src={form.backdrop_url} alt="Backdrop Preview" className="w-full h-48 md:h-72 object-cover rounded-lg mt-2 border border-border" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Gambar latar untuk hero banner (otomatis dari TMDB)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Input
                      value={form.genre}
                      onChange={(e) => setForm({ ...form, genre: e.target.value })}
                      placeholder="Action, Drama..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tahun</Label>
                    <Input
                      type="number"
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                      placeholder="2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Durasi</Label>
                    <Input
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="1h 30m"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                      <SelectTrigger><SelectValue placeholder="Rating" /></SelectTrigger>
                      <SelectContent>
                        {RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_featured}
                    onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
                  />
                  <Label className="cursor-pointer">Tampilkan di Hero Banner</Label>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="grid grid-cols-2 gap-3 w-full max-w-[240px]">
                    <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 w-full h-9" disabled={isSaving}>
                      {isSaving ? '...' : editingVideo ? 'Perbarui' : 'Simpan'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={resetForm} className="w-full h-9 text-xs">Batal</Button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & List Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari video dalam koleksi..."
              className="pl-10 h-10 bg-card border-border"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-secondary rounded-full"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredVideos.length} dari {videos.length} video
          </p>
        </div>

        {/* Video List */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-card border border-border rounded-xl p-4 flex gap-4">
                <div className="w-40 h-24 bg-secondary rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-secondary rounded w-1/3" />
                  <div className="h-4 bg-secondary rounded w-2/3" />
                  <div className="h-3 bg-secondary rounded w-1/4" />
                </div>
              </div>
            ))
          ) : paginatedVideos.length > 0 ? (
            paginatedVideos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-4 hover:border-primary hover:border-2 transition-all"
              >
                {/* Poster */}
                <div className="w-16 sm:w-24 aspect-[2/3] bg-secondary rounded-lg overflow-hidden shrink-0">
                  {video.poster_url || video.thumbnail_url ? (
                    <img src={video.poster_url || video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground truncate flex items-center gap-2 text-sm sm:text-base">
                      {video.title}
                      {video.is_featured && <Star className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">{video.description}</p>
                    <div className="flex items-center gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs text-muted-foreground overflow-hidden whitespace-nowrap">
                      {video.year && <span className="shrink-0">{video.year}</span>}
                      {video.duration && <span className="shrink-0">{video.duration}</span>}
                      {video.genre && <span className="shrink min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{video.genre}</span>}
                    </div>
                  </div>

                  {/* Actions & Views */}
                  <div className="flex items-center justify-between mt-2">
                    {video.view_count > 0 ? (
                      <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-muted-foreground">
                        <Eye className="w-2.5 h-2.5" /> {video.view_count} views
                      </span>
                    ) : <span />}
                    <div className="flex items-center gap-1">
                      <Link to={`/watch/${video.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(video)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm('Yakin ingin menghapus video ini?')) {
                            deleteMutation.mutate(video.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : videos.length > 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-xl">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground">Tidak ada video yang cocok dengan pencarian "{searchQuery}"</p>
              <Button 
                variant="link" 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-primary"
              >
                Hapus pencarian
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Belum ada video</h3>
              <p className="text-muted-foreground text-sm">Klik "Tambah Video" untuk memulai</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            
            <div className="flex items-center gap-2">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Only show a few page numbers around the current page
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-9 h-9 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                } else if (
                  pageNum === currentPage - 2 || 
                  pageNum === currentPage + 2
                ) {
                  return <span key={pageNum} className="text-muted-foreground">...</span>;
                }
                return null;
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}