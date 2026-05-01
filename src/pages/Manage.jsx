import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Film, Eye, ArrowLeft, Save, X, Star, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CATEGORIES = ['film', 'series', 'documentary', 'animation', 'short_film', 'music_video'];
const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

const emptyForm = {
  title: '', description: '', thumbnail_url: '', drive_file_id: '',
  category: '', genre: '', year: '', duration: '', rating: '', is_featured: false,
};

export default function Manage() {
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos-manage'],
    queryFn: () => base44.entities.Video.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Video.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos-manage'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      resetForm();
      toast.success('Video berhasil ditambahkan!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Video.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos-manage'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      resetForm();
      toast.success('Video berhasil diperbarui!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Video.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos-manage'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video berhasil dihapus!');
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingVideo(null);
    setShowForm(false);
  };

  const handleEdit = (video) => {
    setForm({
      title: video.title || '',
      description: video.description || '',
      thumbnail_url: video.thumbnail_url || '',
      drive_file_id: video.drive_file_id || '',
      category: video.category || '',
      genre: video.genre || '',
      year: video.year || '',
      duration: video.duration || '',
      rating: video.rating || '',
      is_featured: video.is_featured || false,
    });
    setEditingVideo(video);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      year: form.year ? Number(form.year) : undefined,
    };
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, thumbnail_url: file_url }));
    setUploading(false);
    toast.success('Thumbnail berhasil diupload!');
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background pt-24 md:pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kelola Video</h1>
            <p className="text-muted-foreground mt-1">{videos.length} video dalam koleksi</p>
          </div>
          <Button
            onClick={() => { setShowForm(true); setEditingVideo(null); setForm(emptyForm); }}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Judul Video *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Masukkan judul video"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Google Drive File ID *</Label>
                    <Input
                      value={form.drive_file_id}
                      onChange={(e) => setForm({ ...form, drive_file_id: e.target.value })}
                      placeholder="ID file dari Google Drive"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Contoh: dari URL drive.google.com/file/d/<strong>FILE_ID</strong>/view
                    </p>
                  </div>
                </div>

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
                    <Label>Thumbnail</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.thumbnail_url}
                        onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                        placeholder="URL thumbnail atau upload"
                        className="flex-1"
                      />
                      <label className="shrink-0">
                        <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                        <Button type="button" variant="outline" asChild disabled={uploading}>
                          <span className="cursor-pointer">
                            <Upload className="w-4 h-4" />
                          </span>
                        </Button>
                      </label>
                    </div>
                    {form.thumbnail_url && (
                      <img src={form.thumbnail_url} alt="Preview" className="w-32 h-20 object-cover rounded-lg mt-2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 gap-2" disabled={isSaving}>
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Menyimpan...' : editingVideo ? 'Perbarui' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

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
          ) : videos.length > 0 ? (
            videos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:border-primary/30 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-full sm:w-44 h-28 bg-secondary rounded-lg overflow-hidden shrink-0">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate flex items-center gap-2">
                        {video.title}
                        {video.is_featured && <Star className="w-4 h-4 text-primary fill-primary shrink-0" />}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{video.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {video.category && (
                          <span className="px-2 py-0.5 bg-secondary rounded-full">
                            {video.category.replace('_', ' ')}
                          </span>
                        )}
                        {video.genre && <span>{video.genre}</span>}
                        {video.year && <span>• {video.year}</span>}
                        {video.duration && <span>• {video.duration}</span>}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {video.view_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link to={`/watch?id=${video.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(video)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm('Yakin ingin menghapus video ini?')) {
                            deleteMutation.mutate(video.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16">
              <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Belum ada video</h3>
              <p className="text-muted-foreground text-sm">Klik "Tambah Video" untuk memulai</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}