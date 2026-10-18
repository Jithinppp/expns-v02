import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';

/**
 * Minimal async-data hook for screen loads.
 *
 * Pass a `key` describing what the loader depends on (e.g. the selected month
 * as "2026-9"). When the key changes the data reloads automatically. Screens
 * kick the first load off inside useFocusEffect so returning from a modal
 * refreshes the data automatically.
 */
export function useLoad<T>(load: () => Promise<T>, key = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Keep the latest loader without re-creating the callbacks below.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(async (mode: 'reload' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await loadRef.current();
      setData(result);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      if (mode === 'refresh') setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  const reload = useCallback(() => run('reload'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  // Reload when the key changes (the first load comes from useFocusEffect).
  const keyRef = useRef(key);
  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    void run('reload');
  }, [key, run]);

  return { data, error, loading, refreshing, reload, refresh, setData };
}
