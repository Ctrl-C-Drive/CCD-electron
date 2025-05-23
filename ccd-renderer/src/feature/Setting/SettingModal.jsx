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
    const [localLimit, setLocalLimit] = useState('무제한');
    const modalRef = useRef(null);

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
    const limitOptions = ['10개', '50개', '100개', '500개', '무제한'];

    return (
      <div className="relative">
        <div className="cursor-pointer" onClick={() => setIsVisible(true)}>
          <img src="settings.svg" alt="Settings" className="w-[3.2rem] h-[3.2rem] text-blue-700" />
        </div>

        {isVisible && (
          <div className="    
            bg-[var(--white)]
            shadow-[0_0.1rem_2.5rem_0_rgba(0,0,0,0.10)]
            rounded-[0.7rem]
            pl-[0.8rem] py-[0.75rem]
            gap-2  text-blue-700 
            h-[18.6rem] w-[26rem]
            flex justify-between flex-row
            pr-[0.6rem]
            ">
          <div
            ref={modalRef}
            className="absolute right-0 bottom-0 w-56 
 
            "
          >
            <div className="text-blue-700 font-bold text-center mb-2">설정</div>
            {/* 보관 기간 설정 */}
            <div className="mb-4">
              <div className="text-sm text-blue-700 mb-1">보관 기간</div>
              <div
                className=" rounded px-2 py-1 text-blue-700 cursor-pointer"
                onClick={() => {
                  setRetentionOpen(!retentionOpen);
                  setLocalLimitOpen(false);
                  setCloudLimitOpen(false);
                }}
              >
                {retention} ▼
              </div>
              {retentionOpen && (
                <div className="bg-white border mt-1 rounded shadow text-sm">
                  {retentionOptions.map((opt) => (
                    <div
                      key={opt}
                      className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-blue-700"
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

            {/* 로컬 최대 개수 설정 */}
            <div className="mb-4">
              <div className="text-sm text-blue-700 mb-1">로컬 최대 개수</div>
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
              {localLimitOpen && (
                <div className="bg-white border mt-1 rounded shadow text-sm">
                  {limitOptions.map((opt) => (
                    <div
                      key={opt + '-local'}
                      className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-blue-700"
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

            {/* 클라우드 최대 개수 설정 */}
            <div>
              <div className="text-sm text-blue-700 mb-1">클라우드 최대 개수</div>
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
              {cloudLimitOpen && (
                <div className="bg-white border mt-1 rounded shadow text-sm">
                  {limitOptions.map((opt) => (
                    <div
                      key={opt + '-cloud'}
                      className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-blue-700"
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
          
        </div>)
        
        }
      </div>
    );
  };
export default SettingModal;