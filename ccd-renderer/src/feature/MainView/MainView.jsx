import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import "../../styles/color.css";
// import useClipboardRecords from '../../utils/useClipboardRecords';

const MainView = ({ isTagChecked, items, toggleSelect, addItem, refetch }) => {
  // const [items, setItems] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const containerRefs = useRef({});
  // const { items, refetch, addItem } = useClipboardRecords();
  // const { items, refetch, toggleSelect, addItem } = useClipboardRecords();

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

      const path = e.dataTransfer.files[0]?.path; // ✅ Electron 환경이라면 존재
      console.log("✅ file.path:", path);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const fileType = file.type;
      const fileName = file.name;
      const ext = fileName.split(".").pop().toLowerCase();
      const timestamp = Date.now();

      const readFileAsDataURL = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const readFileAsText = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });

      if (fileType.startsWith("image/")) {
        const dataUrl = await readFileAsDataURL(file);

        addItem({
          type: "image",
          src: dataUrl,
          fileName,
          ext,
          timestamp,
          tags: [],
          path
        });

        const result = await window.electronAPI.addDroppedFile(path);
        if (!result.success) {
          console.warn("파일 저장 실패:", result.message || result.error);
        }
      } else if (fileType === "text/plain") {
        const content = await readFileAsText(file);

        addItem({
          type: "text",
          content,
          fileName,
          ext,
          timestamp,
          tags: [],
          path
        });

        //일단 현재 메인프로세스 코드 기준으로 path만 보냈냈
        const result = await window.electronAPI.addDroppedFile(path);
        if (!result.success) {
          console.warn("파일 저장 실패:", result.message || result.error);
        }
      } else {
        console.warn("지원하지 않는 파일 형식:", fileType);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      console.log("💨 DragOver 이벤트 감지됨");
    };

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
      }
    } catch (err) {
      console.error("삭제 중 오류:", err);
    }
  };

  return (
    <div
      className="grid grid-cols-2 gap-3 px-6 py-4  !w-screen  "
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        console.log("Drop 이벤트 내부 div에서 감지됨");
      }}
    >
      {items.map((item) => (
        <div
          key={item.itemId}
          // onClick={() => handlePaste(item.itemId)} //클릭 이벤트 버블링 막고자, 보다 덜 포괄적인 위치로 리스너 이동동
          className="w-[17rm] !h-auto relative  border border-blue-700 rounded-md overflow-hidden cursor-pointer"
          onContextMenu={(e) => {
            e.preventDefault(); // ✅ 기본 우클릭 메뉴 차단
            e.stopPropagation(); // 이벤트 전파 차단
            toggleModal(item.itemId);
            e.stopPropagation();
            // handlePaste(item.itemId);
          }}
        >
          <div className="relative  h-[9.2rem] bg-blue-100">
            {item.type === "image" && item.src && (
              <img
                src={item.src}
                alt="dropped-img"
                className="w-full h-[9.2rem] object-cover"
                onClick={() => handlePaste(item.itemId) }
              />
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

            <div className="absolute top-1 left-1">
              <input
                type="checkbox"
                // checked={item.selected}
                checked={item.selected}
                onChange={(e) => {
                  e.stopPropagation(); //  이벤트 버블링 차단
                  toggleSelect(item.itemId); //  정상 호출
                }}
                // onChange={() => {}}
                className="accent-blue-700 w-[1.3rem] h-[1.3rem]"
              />
            </div>
            <div className="absolute bottom-1 right-1 flex gap-1 items-end">
              {(item.source === "both" || item.source === "cloud") && (
                <img
                  src="cloud.svg"
                  alt="cloud"
                  className="w-[1.5rem] h-[1.5rem]"
                />
              )}
              {(item.source === "both" || item.source === "local") && (
                <img
                  src="folder.svg"
                  alt="folder"
                  className="w-[1.5rem] h-[1.5rem]"
                />
              )}
            </div>
          </div>
          {isTagChecked && (
            <div
              className="
                text-[var(--blue-200)]
                !font-pretendard
                text-[1.3rem]
                font-[var(--font-rg)]
                leading-[2.8rem]
                border-t h-[2.6rem] border-[var(--blue-200)] pl-[1.6rem] "
            >
              {item.tags && item.tags.length > 0 ? (
                item.tags.map((t, idx) =>
                  typeof t === "string" ? (
                    <span key={idx}># {t}</span>
                  ) : (
                    <span key={idx}># {t.tag}</span>
                  )
                )

              ) : (
                <span># 태그 없음</span>
              )}
            </div>
          )}

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
              <div
                className="py-2 hover:bg-blue-50 cursor-pointer"
                onClick={() => handleDelete(item.itemId, "all")}
              >
                모두 삭제
              </div>
              <hr />
              <div
                className="py-2 hover:bg-blue-50 cursor-pointer"
                onClick={() => handleDelete(item.itemId, "local")}
              >
                Local에서 삭제
              </div>
              <hr />
              <div
                className="py-2 hover:bg-blue-50 cursor-pointer"
                onClick={() => handleDelete(item.itemId, "cloud")}
              >
                Cloud에서 삭제
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MainView;
