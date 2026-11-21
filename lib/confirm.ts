// Eigener Ja/Nein-Dialog statt Alert/window.confirm: funktioniert gleich in der App, im Browser
// und als Home-Bildschirm-Web-App (dort werden Browser-Dialoge teils stillschweigend blockiert).
import { create } from 'zustand';

export interface DialogRequest {
  message: string;
  ok: string;
  /** null = nur ein Knopf (Hinweis) */
  cancel: string | null;
  destructive: boolean;
  resolve: (v: boolean) => void;
}

export const useDialog = create<{ current: DialogRequest | null; queue: DialogRequest[] }>(() => ({ current: null, queue: [] }));

function show(req: Omit<DialogRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    const r = { ...req, resolve };
    useDialog.setState((s) => (s.current ? { queue: [...s.queue, r] } : { current: r }));
  });
}

export function closeDialog(answer: boolean): void {
  const { current, queue } = useDialog.getState();
  current?.resolve(answer);
  useDialog.setState({ current: queue[0] ?? null, queue: queue.slice(1) });
}

/** Ja/Nein-Frage. */
export function confirm(message: string, ok: string, cancel: string, destructive = false): Promise<boolean> {
  return show({ message, ok, cancel, destructive });
}

/** Hinweis mit einem Knopf. */
export function notice(message: string, ok = 'OK'): Promise<boolean> {
  return show({ message, ok, cancel: null, destructive: false });
}
