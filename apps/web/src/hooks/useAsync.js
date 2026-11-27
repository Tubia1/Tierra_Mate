import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync(load, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const pending = useRef(null);
  const run = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await load({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setState({ data, loading: false, error: null });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ data: null, loading: false, error });
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); return () => pending.current?.abort(); }, [run]);
  return { ...state, retry: run };
}
