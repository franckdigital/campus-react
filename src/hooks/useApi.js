import { useState, useEffect, useCallback } from 'react';

export function useApi(fetchFn, dependencies = [], immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    if (immediate) {
      execute().catch(() => {});
    }
  }, [immediate, ...dependencies]);

  return { data, loading, error, execute, refetch: execute, setData };
}

export function usePagination(fetchFn, initialPage = 1, pageSize = 20) {
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  
  const { data, loading, error, execute } = useApi(
    () => fetchFn({ page, page_size: pageSize }),
    [page],
    true
  );

  useEffect(() => {
    if (data?.count) {
      setTotalPages(Math.ceil(data.count / pageSize));
    }
  }, [data, pageSize]);

  const nextPage = () => setPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setPage(p => Math.max(p - 1, 1));
  const goToPage = (p) => setPage(p);

  return {
    data: data?.results || [],
    loading,
    error,
    page,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    refresh: execute,
  };
}

export default useApi;
