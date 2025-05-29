import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";
import useClipboardRecords from '../../utils/useClipboardRecords';


const MainView = ({isTagChecked}) => {
  // const [items, setItems] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const containerRefs = useRef({});
  const { items, refetch, toggleSelect, addItem } = useClipboardRecords();

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const toggleModal = (id) => {
    setActiveItemId((prev) => (prev === id ? null : id));
  };
  useEffect(() => {
const handleDrop = (e) => {
  e.preventDefault();

  const file = e.dataTransfer.files[0];
  if (!file) return;

  const fileType = file.type;

  if (fileType.startsWith("image/")) {
    console.log("input된 데이터는 예쁜 img네요^^");
    const reader = new FileReader();
    reader.onload = (event) => {
    const dataUrl = event.target.result;
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();      
      addItem({
        type: "image",
        src: dataUrl,
        fileName,
        ext,
        timestamp: Date.now(),
        tags: [],
      });
    };
    reader.readAsDataURL(file);
  } else if (fileType === "text/plain") {
    console.log("input된 데이터는 예쁜 text네요^^");
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const fileName = file.name;
      const ext = fileName.split('.').pop().toLowerCase();
      addItem({
        type: "text",
        content,
        fileName,
        ext,
        timestamp: Date.now(),
        tags: [],
      });
    };
    reader.readAsText(file);
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


  return (
    <div className="grid grid-cols-2 gap-3 px-6 py-4  !w-screen  "
          onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              console.log("Drop 이벤트 내부 div에서 감지됨");
            }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="w-[17rm] !h-auto relative  border border-blue-700 rounded-md overflow-hidden cursor-pointer"
          onClick={(e) => {toggleModal(item.id);   e.stopPropagation();}}
        >
          <div className="relative  h-[9.2rem] bg-blue-100">
            {item.type === "image" && item.src && (
              <img
                src={item.src}
                alt="dropped-img"
                className="w-full h-[9.2rem] object-cover"
              />
            )}
            {item.type === "text" && item.content && (
              <p className="p-2 text-sm text-gray-700">{item.content}</p>
            )}
            <div className="absolute top-1 left-1">
              <input
                type="checkbox"
                checked={item.selected}
                onClick={()=> toggleSelect(item.id)}
                onChange={() => {}}
                className="accent-blue-700 w-[1.3rem] h-[1.3rem]"
              />
            </div>
          
            <div className="absolute bottom-1 right-1">
              <img src="folder.svg" alt="folder" className="w-[1.7rem] h-[1.5rem]" />
            </div>
          </div>
            {isTagChecked && (

          <div className="
            text-[var(--blue-200)]
            !font-pretendard
            text-[1.3rem]
            font-[var(--font-rg)]
            leading-[2.8rem]
             border-t h-[2.6rem] border-[var(--blue-200)] pl-[1.6rem] "

             >
            
            {item.tags && item.tags.length > 0 ? (
              item.tags.map((t, idx) => (
                <span key={idx}># {t.tag}</span>
              ))
            ) : (
              <span># 태그 없음</span>
            )}          
            </div>
            )}
           {activeItemId === item.id && (
            <div
              ref={(el) => (containerRefs.current[item.id] = el)}
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
              ">
              <div className="py-2 hover:bg-blue-50 cursor-pointer">
                모두 삭제
              </div>
              <hr />
              <div className="py-2 hover:bg-blue-50 cursor-pointer">
                Local에서 삭제
              </div>
              <hr />
              <div className="py-2 hover:bg-blue-50 cursor-pointer">
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