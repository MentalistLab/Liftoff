// Profilbild wählen, verkleinern und in den Storage-Bucket „avatars“ laden (Ordner = Nutzer-ID, per RLS geschützt).
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
  if (res.canceled || !res.assets[0]) return null;
  const small = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 400, height: 400 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
  const body = await (await fetch(small.uri)).arrayBuffer();
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const up = await supabase.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (error) throw error;
  // alte Bilder aufräumen
  const { data: files } = await supabase.storage.from('avatars').list(userId);
  const old = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
  if (old.length) await supabase.storage.from('avatars').remove(old);
  return url;
}
