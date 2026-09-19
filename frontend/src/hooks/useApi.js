import { useCallback, useEffect, useRef, useState } from "react";
import API, { errMsg } from "../services/api";

/**
 * Small data-fetching hook.
 *   const { data, loading, error, reload, setData } = useApi("/projects");
 * Pass `null` as the path to skip fetching.
 */
export default function useApi(path, { initial = null, deps = [] } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!path) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await API.get(path);
        if (alive.current) setData(res.data);
      } catch (err) {
        if (alive.current) setError(errMsg(err));
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, ...deps]
  );

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  return { data, loading, error, reload: () => load(true), setData };
}
