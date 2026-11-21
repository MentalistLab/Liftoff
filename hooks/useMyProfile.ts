import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from './useSession';

export interface MyProfile { id: string; username: string; avatar_url: string | null; is_private: boolean; country: string | null; xp: number; longest_streak: number; current_streak: number }

/** Eigenes Server-Profil (null ohne Anmeldung). */
export function useMyProfile() {
  const session = useSession();
  return useQuery({
    queryKey: ['my-profile', session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<MyProfile | null> => {
      const { data, error } = await supabase.from('profiles')
        .select('id, username, avatar_url, is_private, country, xp, longest_streak, current_streak').eq('id', session!.user.id).single();
      if (error) throw error;
      return data as MyProfile;
    },
  });
}
