import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/**
 * Loads data from the API and keeps it in state.
 * Returns { data, error, loading, reload }. `reload` fetches again without
 * clearing what is on screen, so lists do not flicker after a change.
 */
export function useFetch(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const latest = useRef(0);

  const load = useCallback(
    async (showLoading) => {
      const ticket = ++latest.current;
      if (showLoading) setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const data = await api.get(path);
        if (ticket === latest.current) setState({ data, error: null, loading: false });
      } catch (error) {
        if (ticket === latest.current) setState((current) => ({ ...current, error, loading: false }));
      }
    },
    [path],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const reload = useCallback(() => load(false), [load]);
  return { ...state, reload };
}
