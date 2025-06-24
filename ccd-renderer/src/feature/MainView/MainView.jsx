import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import "../../styles/color.css";
// import useClipboardRecords from '../../utils/useClipboardRecords';

const MainView = ({ isTagChecked, items, toggleSelect, addItem, refetch, fileType, setFileType }) => {
  // const [items, setItems] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const containerRefs = useRef({});
  // const { items, refetch, addItem } = useClipboardRecords();
  // const { items, refetch, toggleSelect, addItem } = useClipboardRecords();
  // const [fileType, setFileType] = useState("IMG");

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideSomeModal = Object.values(containerRefs.current).some(
        (ref) => ref && ref.contains(e.target)
      );
      if (!clickedInsideSomeModal) {
        setActiveItemId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleModal = (id) => {
    setActiveItemId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const handleDrop = async (e) => {
      e.preventDefault();

      // 1. 웹 이미지 URL 먼저 처리
      const uri = e.dataTransfer.getData("text/uri-list");
      const isImageUrl = uri && uri.match(/\.(jpe?g|png|gif|bmp|webp|svg)$/i);
      if (isImageUrl) {
        const result = await window.electronAPI.saveDroppedWebImage({ url: uri });
        if (result.success && result.item) addItem(result.item);
        return;
      }

      // 2. 그 외 웹 텍스트 처리
      const plainText = e.dataTransfer.getData("text/plain");
      if (plainText && plainText.trim().length > 0) {
        const result = await window.electronAPI.saveDroppedWebText({ content: plainText });
        if (result.success && result.item) addItem(result.item);
        return;
      }

      console.warn("드롭된 데이터가 유효하지 않음");
    };


    const handleDragOver = (e) => e.preventDefault();

    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);

    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
    };

  }, [addItem]);

  const handlePaste = async (id) => {
    try {
      const res = await window.electronAPI.pasteItem(id);
      if (res.paste) {
        console.log("📋 클립보드에 복사 성공!");
      } else {
        console.warn("❌ 클립보드 복사 실패:", res.error);
      }
    } catch (err) {
      console.error("IPC 에러:", err);
    }
  };

  //삭제
  const handleDelete = async (itemId, deleteOption) => {
    try {
      const res = await window.electronAPI.deleteItem(itemId, deleteOption);
      if (res.deletionResult && res.refreshReq) {
        refetch(); // 화면 갱신
        setActiveItemId(null);   //해당 item 모달 닫기
      }
    } catch (err) {
      console.error("삭제 중 오류:", err);
    }
  };

  return (
    <div
      className="grid grid-cols-2 gap-3 px-6 py-4 
       !w-full  
        !max-h-[calc(100vh-22.9rem)] 
       !overflow-y-scroll
       overflow-y-auto
       custom-scrollbar
       "
      style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        console.log("Drop 이벤트 내부 div에서 감지됨");
      }}

    >
      {items
        .filter((item) => {
          if (fileType === "img") return item.type === "image";
          if (fileType === "txt") return item.type === "text";
          return true; // "all"인 경우
        })
        .map((item) => (
          <div
            key={item.itemId}
            // onClick={() => handlePaste(item.itemId)} //클릭 이벤트 버블링 막고자, 보다 덜 포괄적인 위치로 리스너 이동
            className="w-[17rm] !h-auto  relative  border border-blue-700 rounded-md overflow-hidden cursor-pointer"
            onContextMenu={(e) => {
              e.preventDefault(); // ✅ 기본 우클릭 메뉴 차단
              e.stopPropagation(); // 이벤트 전파 차단
              toggleModal(item.itemId);
              e.stopPropagation();
              // handlePaste(item.itemId);
            }}
            style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
          >
            <div className="relative  !h-[9.2rem] bg-blue-100">
              {item.type === "image" && (
                <>
                  <img
                    src={item.thumbnail_path ?? item.src}
                    alt="dropped-img"
                    className="w-full h-[9.2rem] object-cover"
                    onClick={() => handlePaste(item.itemId)}
                  />
                </>
              )}
              {item.type === "text" && item.content && (
                <p
                  className="pt-[1rem]  px-[2rem] text-xl text-gray-700   
              line-clamp-3 h-auto"
                  onClick={() => handlePaste(item.itemId)}
                >
                  {item.content}
                </p>
              )}
              {/* 체크박스: shared가 cloud 또는 both가 아닐 때만 표시 */}
              {/* {(item.shared !== "cloud" && item.shared !== "both") && ( */}
              <div className="absolute top-1 left-1">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.itemId);
                  }}
                  className="accent-blue-700 w-[1.3rem] h-[1.3rem]"
                />
              </div>
              {/* )} */}

              <div className="absolute bottom-1 right-1 flex gap-1 items-end">
                {(item.shared === "both" || item.shared === "cloud") && (
                  <img
                    src="cloud.svg"
                    alt="cloud"
                    className="w-[1.5rem] h-[1.5rem]"
                  />
                )}
                {(item.shared === "both" || item.shared === "local") && (
                  <img
                    src="folder.svg"
                    alt="folder"
                    className="w-[1.5rem] h-[1.5rem]"
                  />
                )}
              </div>
            </div>
            {isTagChecked ? (
              <div
                className="
                text-[var(--blue-200)]
                !font-pretendard
                text-[1.3rem]
                font-[var(--font-rg)]
                leading-[2.8rem]
                border-t h-[2.6rem] border-[var(--blue-200)] pl-[1.6rem]
              "
              >
                {item.tags && item.tags.length > 0 ? (
                  <span>
                    {item.tags
                      .map((t) => `#${typeof t === "string" ? t : t.tag}`)
                      .join(" ")}
                  </span>
                ) : (
                  <span># 태그 없음</span>
                )}
              </div>
            ) : null}


            {activeItemId === item.itemId && (
              <div
                ref={(el) => (containerRefs.current[item.itemId] = el)}
                onClick={(e) => e.stopPropagation()}
                className="absolute w-[11rem] h-auto px-[1.2rem] top-[2rem] right-[2.2rem] 
            bg-white border rounded-2xl shadow-md z-50 
            text-[var(--blue-200)]
            text-center
            !font-pretendard
            text-[1.1rem]
            not-italic
            font-[var(--font-md)]
            leading-normal
            "
              >
                {(item.shared === "both" || item.shared === "all") && (
                  <>
                    <div
                      className="py-2 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleDelete(item.itemId, "both")}
                    >
                      모두 삭제
                    </div>
                    <hr />
                  </>
                )}
                {(item.shared === "local" || item.shared === "both") && (
                  <>
                    <div
                      className="py-2 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleDelete(item.itemId, "local")}
                    >
                      Local에서 삭제
                    </div>
                    <hr />
                  </>
                )}
                {(item.shared === "cloud" || item.shared === "both") && (
                  <div
                    className="py-2 hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleDelete(item.itemId, "cloud")}
                  >
                    Cloud에서 삭제
                  </div>
                )}
              </div>
            )}

          </div>

        ))}
    </div>
  );
};

export default MainView;
