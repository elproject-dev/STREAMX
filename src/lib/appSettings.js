import { supabase } from '@/lib/supabase';

const SETTINGS_ROW_ID = 'global';

export async function getAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('install_android, install_windows, player_url, app_version_latest, update_title, update_message, update_changelog, force_update')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return {
    data: data
      ? {
          install_android: data.install_android || '',
          install_windows: data.install_windows || '',
          player_url: data.player_url || '',
          app_version_latest: data.app_version_latest || '1.0.0',
          update_title: data.update_title || 'Update Tersedia!',
          update_message: data.update_message || 'Versi terbaru sudah tersedia. Silakan perbarui aplikasi Anda.',
          update_changelog: data.update_changelog || '',
          force_update: data.force_update || false,
        }
      : null,
    error: null,
  };
}

export async function saveAppSettings(settings) {
  const payload = {
    id: SETTINGS_ROW_ID,
    install_android: settings.install_android ?? null,
    install_windows: settings.install_windows ?? null,
    player_url: settings.player_url ?? null,
    app_version_latest: settings.app_version_latest ?? null,
    update_title: settings.update_title ?? null,
    update_message: settings.update_message ?? null,
    update_changelog: settings.update_changelog ?? null,
    force_update: settings.force_update ?? null,
  };

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('install_android, install_windows, player_url, app_version_latest, update_title, update_message, update_changelog, force_update')
    .single();

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      install_android: data.install_android || '',
      install_windows: data.install_windows || '',
      player_url: data.player_url || '',
      app_version_latest: data.app_version_latest || '1.0.0',
      update_title: data.update_title || 'Update Tersedia!',
      update_message: data.update_message || 'Versi terbaru sudah tersedia. Silakan perbarui aplikasi Anda.',
      update_changelog: data.update_changelog || '',
      force_update: data.force_update || false,
    },
    error: null,
  };
}
