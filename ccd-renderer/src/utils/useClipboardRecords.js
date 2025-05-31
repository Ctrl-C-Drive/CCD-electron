import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
const useClipboardRecords = () => {
  const [items, setItems] = useState([]);


  const refetch = useCallback(async () => {
    try {
      const response = await window.electronAPI.loadClipboardRecords(true);
      if (response.success) {
        const formatted = response.data.map((item) => ({
          ...item,
          selected: false,
           itemId: item.itemId ?? item.id ?? uuidv4(),
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
  const toggleSelect = (itemId) => {
    setItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };
 //  드래그앤드랍으로 받은 아이템 추가
const addItem = (newItem) => {
   const itemId = newItem.itemId ?? uuidv4();

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
        itemId,
        timestamp: newItem.timestamp ?? Date.now(),
        fileName: newItem.fileName ?? "unnamed",
        ext: newItem.ext ?? "unknown",
      },
      ...prev,
    ];
  });
};
const setItemsFromSearchResult = (newItems) => {
  const formatted = newItems.map((item) => ({
    ...item,
    selected: false,
    itemId: item.itemId ?? uuidv4(),
  }));
  setItems(formatted);
};
  const getSelectedItemIds = useCallback(() => {
    return items.filter(item => item.selected).map(item => item.itemId);
  }, [items]);


  return { items, refetch, toggleSelect, addItem, setItemsFromSearchResult, getSelectedItemIds   };
};

export default useClipboardRecords;
