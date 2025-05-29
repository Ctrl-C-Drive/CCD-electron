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
  useEffect(() => {
    console.log("🧾 현재 items 상태:", items);
  }, [items]);
  const toggleSelect = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };
 //  드래그앤드랍으로 받은 아이템 추가
const addItem = (newItem) => {
  setItems((prev) => {
    const isDuplicate = prev.some(
      (item) =>
        item.fileName === newItem.fileName &&
        item.timestamp === newItem.timestamp
    );
    if (isDuplicate) return prev;

    return [
      {
        ...newItem,
        selected: false,
        id: newItem.id ?? `temp-${Date.now()}`,
        timestamp: newItem.timestamp ?? Date.now(),
        fileName: newItem.fileName ?? "unnamed",
        ext: newItem.ext ?? "unknown",
      },
      ...prev,
    ];
  });
};
  return { items, refetch, toggleSelect, addItem  };
};

export default useClipboardRecords;
