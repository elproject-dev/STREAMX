import { supabase } from '@/lib/supabase';

const SETTINGS_ROW_ID = 'global';

export async function getAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('install_android, install_windows, player_url')
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
  };

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('install_android, install_windows, player_url')
    .single();

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      install_android: data.install_android || '',
      install_windows: data.install_windows || '',
      player_url: data.player_url || '',
    },
    error: null,
  };
}
