import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";



 const SettingModal = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [retentionOpen, setRetentionOpen] = useState(false);
    const [localLimitOpen, setLocalLimitOpen] = useState(false);
    const [cloudLimitOpen, setCloudLimitOpen] = useState(false);
    const [retention, setRetention] = useState('7일');
    const [localLimit, setLocalLimit] = useState('50개');
    const modalRef = useRef(null);
    const [cloudLimit, setCloudLimit] = useState("50개");

  const [isAutoCloudSave, setIsAutoCloudSave] = useState(false);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
          setIsVisible(false);
          setRetentionOpen(false);
          setLocalLimitOpen(false);
          setCloudLimitOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const retentionOptions = ['1일', '7일', '10일', '30일', '∞'];
    const limitOptions = ['30개','10개', '50개' ];

return (
  <div className="relative">
    <div className="cursor-pointer" onClick={() => setIsVisible(true)}>
      <img src="settings.svg" alt="Settings" className="w-[3.2rem] h-[3.2rem] text-blue-700" />
    </div>

    {isVisible && (
      <div
        className="    
          bg-[var(--white)]
          shadow-[0_0.1rem_2.5rem_0_rgba(0,0,0,0.10)]
          rounded-[0.7rem]
          gap-2 text-blue-700 
          h-[18.6rem] w-[26rem]
          flex justify-between flex-row
          absolute
          z-50
          bottom-[4rem]
          right-[-1.4rem]"
      >
        <div
          ref={modalRef}
          className="absolute right-0 bottom-0 w-full
            pl-[2.6rem] pr-[1.5rem] h-full
            pt-[1.6rem]
            pb-[2rem]"
        >
          <div className="
              text-[var(--blue-200)]
              text-center
              !font-pretendard
              text-[1.4rem]
              pb-[0.9rem]
              font-[var(--font-sb)]
              leading-normal
              w-full
            ">
            Settings
          </div>
          <hr className="mb-[1.2rem]" />

          <div className="relative mb-4 flex flex-row justify-between">
            <div className="">
              <div className="
                  text-[var(--blue-200)]
                  !font-pretendard
                  text-[1.2rem]
                  not-italic
                  font-[var(--font-md)]
                  leading-normal
                ">
                보관 기간
              </div>
              <div className="
                text-[var(--blue-100)]
                !font-pretendard
                text-[0.9rem]
                not-italic
                font-[var(--font-rg)]
                leading-normal
              ">
                  최대 보관 기간 설정
              </div>
            </div>
            <div
              className="rounded px-2 py-1 text-blue-700 cursor-pointer"
              onClick={() => {
                setRetentionOpen(!retentionOpen);
                setLocalLimitOpen(false);
                setCloudLimitOpen(false);
              }}
            >
              {retention} ▼
            </div>
            {retentionOpen && (
              <div className="absolute top-6 left-[17.5rem]  w-[4.4rem] items-center flex flex-col z-[999] bg-white border mt-1 rounded shadow text-sm">
                {retentionOptions.map((opt) => (
                  <div
                    key={opt}
                    className=" px-2 py-1 hover:bg-blue-50 cursor-pointer text-blue-700 h-[2rem]" 
                    onClick={() => {
                      setRetention(opt);
                      setRetentionOpen(false);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 최대 개수 설정 */}
          <div className="mb-4 flex flex-row relative justify-between">
            <div className="">
            <div className="
                text-[var(--blue-200)]
                !font-pretendard
                text-[1.2rem]
                not-italic
                font-[var(--font-md)]
                leading-normal
              ">
              최대 개수
            </div>
            <div className="
                text-[var(--blue-100)]
                !font-pretendard
                text-[0.9rem]
                not-italic
                font-[var(--font-rg)]
                leading-normal
              ">
                  최대 보관 개수 설정
            </div>
            </div>
            <div className="flex flex-row relative">
              <div className="flex items-center gap-1">
                <img
                  src="folder.svg"
                  className="w-6 h-6 cursor-pointer"
                  onClick={() => {
                    setLocalLimitOpen(!localLimitOpen);
                    setRetentionOpen(false);
                    setCloudLimitOpen(false);
                  }}
                  alt="Local Limit"
                />
                <div
                  className="text-blue-700 text-sm cursor-pointer select-none flex items-center"
                  onClick={() => {
                    setLocalLimitOpen(!localLimitOpen);
                    setRetentionOpen(false);
                    setCloudLimitOpen(false);
                  }}
                >
                  {localLimit} ▼
                </div>
              </div>

              {localLimitOpen && (
                <div className="absolute top-6 left-2 z-[999] bg-white border mt-1 rounded shadow text-sm  w-[4.4rem] items-center flex flex-col">
                  {limitOptions.map((opt) => (
                    <div
                      key={opt + '-local'}
                      className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-blue-700 h-[2rem]"
                      onClick={() => {
                        setLocalLimit(opt);
                        setLocalLimitOpen(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-row relative">
              <div className="flex items-center gap-1">
                <img
                  src="cloud.svg"
                  className="w-6 h-6 cursor-pointer"
                  onClick={() => {
                    setCloudLimitOpen(!cloudLimitOpen);
                    setRetentionOpen(false);
                    setLocalLimitOpen(false);
                  }}
                  alt="Cloud Limit"
                />
                <div
                  className="text-blue-700 text-sm cursor-pointer select-none flex items-center"
                  onClick={() => {
                    setCloudLimitOpen(!cloudLimitOpen);
                    setRetentionOpen(false);
                    setLocalLimitOpen(false);
                  }}
                >
                  {cloudLimit} ▼
                </div>
              </div>

              {cloudLimitOpen && (
                <div className="absolute top-full left-2 mt-1 z-[999] bg-white border rounded shadow text-sm  w-[4.4rem] items-center flex flex-col">
                  {limitOptions.map((opt) => (
                    <div
                      key={opt + '-cloud'}
                      className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-blue-700 h-[2rem]"
                      onClick={() => {
                        setCloudLimit(opt);
                        setCloudLimitOpen(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        {/*클라우드 자동 업로드 여부 토글 */}
        <div className="flex items-center justify-between w-full ">
          {/* 텍스트 영역 */}
          <div className="flex flex-col">
            <div className="">
            <div className="
                text-[var(--blue-200)]
                !font-pretendard
                text-[1.2rem]
                not-italic
                font-[var(--font-md)]
                leading-normal
              ">
              자동 클라우드 저장
            </div>
              <div className="
                text-[var(--blue-100)]
                !font-pretendard
                text-[0.9rem]
                not-italic
                font-[var(--font-rg)]
                leading-normal
              ">
                  복사 항목에 대한 클라우드 자동 업로드
              </div>
            </div>
          </div>

          {/* 토글 스위치 */}
          <div
            onClick={() => setIsAutoCloudSave((prev) => !prev)}
            className={`
              w-[3.4rem] h-[1.9rem] rounded-full p-[0.2rem]
              cursor-pointer transition-all duration-200
              ${isAutoCloudSave ? 'bg-[var(--blue-200)]' : 'bg-gray-300'}
            `}
          >
            <div
              className={`
                w-[1.5rem] h-[1.5rem] rounded-full bg-white shadow
                transform transition-transform duration-200
                ${isAutoCloudSave ? 'translate-x-[1.5rem]' : 'translate-x-0'}
              `}
            />
          </div>
        </div>
       
        </div>
      </div>
    )}
  </div>
);
 }
export default SettingModal;