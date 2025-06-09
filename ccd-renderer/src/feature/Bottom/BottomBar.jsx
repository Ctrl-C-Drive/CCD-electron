import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";
import SettingModal from '../Setting/SettingModal';
import useClipboardRecords from '../../utils/useClipboardRecords';


const Toast = ({ message, type }) => {
  // const baseStyle = 'px-3 py-1 rounded-xl shadow bg-white border mt-2 relative';
  // const pointerStyle = 'absolute -bottom-1 left-4 w-3 h-3 bg-white rotate-45 border-l border-b';
  const textColor = type === 'error' ? 'text-red-700' : 'text-blue-700';

 return (
    <div className="relative flex items-center gap-2 z-20 bottom-[1rem]">
      <div className={`
        fixed left-4 bottom-0 !text-[1.4rem]  
        text-[var(--blue-300)]
          text-center
          !font-pretendard
          text-[1.4rem]
          not-italic
          font-[var(--font-rg)]
          leading-normal
          w-[9.6rem]
          h-[3.5rem]
          bg-white
          shadow-xl
          rounded-xl
          !justify-center
          !items-center
          text-center
          bottom-[3rem]
          left-[3rem]
          flex
        ${textColor}`}>
        {message}
      </div>
    </div>
  );
};

  const BottomBar = ({getSelectedItemIds }) => {
      const [toasts, setToasts] = useState([]);

    const showToast = (message, type) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 1000);
            // }, 100000);

    };
    // const { getSelectedItemIds } = useClipboardRecords();

    return (
      <div className="flex justify-between items-center px-6 mt-[3rem] ">
        {/* 왼쪽 업로드 / 다운로드 */}
        <div className="flex gap-6 items-center">
          <div 
            className="flex flex-col items-center text-blue-700 cursor-pointer"
            onClick={async () => {
              const selectedIds = getSelectedItemIds(); 
              console.log("선택된 id 목록: ::",selectedIds);
              if (selectedIds.length === 0) {
                showToast('선택된 항목이 없습니다.', 'error');
                return;
              }

              showToast('업로드 중...', 'info');
              try {
                const result = await window.electronAPI.uploadSelectedItems(selectedIds);
                console.log("자자자 ~~~ ",result);
               if (result.successCount > 0) {
                  showToast('업로드 성공!', 'info');
                  console.log("성공!")
                } else {
                  showToast('업로드 실패', 'error');
                  console.log("실패~!")
             
                }
              } catch (err) {
                console.error("업로드 중 오류:", err);
                showToast('오류 발생', 'error');
              }
            }}

            >
            <img src="UploadCloud.svg" alt="Upload" className="w-[3.2rem] h-[3.2rem] mb-1" />
            <span className="text-xs underline">Upload</span>
          </div>
          <div 
              className="flex flex-col items-center text-blue-700 cursor-pointer"
              onClick={async () => {
                const selectedIds = getSelectedItemIds(); 
                console.log("selectedIds:", selectedIds);

                if (selectedIds.length === 0) {
                  showToast('선택된 항목이 없습니다.', 'error');
                  return;
                }

                showToast('다운로드 중...', 'info');
                try {
                  const result = await window.electronAPI.downloadSelectedItems(selectedIds);
                  console.log("📥 다운로드 결과:", result);
                  if (result.downloadResult) {
                    showToast('다운로드 성공!', 'info');
                  } else {
                    showToast('다운로드 실패', 'error');
                  }
                } catch (err) {
                  console.error("다운로드 중 오류:", err);
                  showToast('오류 발생', 'error');
                }
              }}

>
            <img src="DownloadCloud.svg" alt="Download" className="w-[3.2rem] h-[3.2rem] mb-1" />
            <span className="text-xs underline">Download</span>
          </div>
        </div>

        {/* 오른쪽 환경설정 아이콘 */}
        {/* <div className="cursor-pointer">
          <img src="settings.svg" alt="Settings" className="w-6 h-6 text-blue-700" />
        </div> */}
          <SettingModal />
        <div className="absolute top-[48rem] flex flex-col items-end z-50">
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </div>
      </div>
    );
  };
  export default BottomBar;