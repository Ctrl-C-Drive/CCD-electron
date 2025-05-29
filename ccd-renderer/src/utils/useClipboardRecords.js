import { useState, useEffect, useCallback } from 'react';

const useClipboardRecords = () => {
  const [items, setItems] = useState([]);

  const refetch = useCallback(async () => {
    try {
      const response = await window.electronAPI.loadClipboardRecords(true);
      if (response.success) {
        const formatted = response.data.map((item) => ({
          ...item,
          selected: false,
          id: item.id ?? null
        }));
        setItems(formatted);
      } else {
        console.error("불러오기 실패:", response);
      }
    } catch (err) {
      console.error("에러:", err);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const toggleSelect = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  return { items, refetch, toggleSelect };
};

export default useClipboardRecords;
