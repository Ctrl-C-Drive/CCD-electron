import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";
import useClipboardRecords from "../../utils/useClipboardRecords"

import LoginModal from '../Login/LoginModal';


const SearchBar =() => {
 const options = ['일반 검색', '고급 검색'];

 const [isMobileNetv3] = useState(['일반 검색', '고급 검색']);
  const [currentSelection, setCurrentSelection] = useState('일반 검색');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
const [keyword, setKeyword] = useState("");
const { items, setItems, refetch } = useClipboardRecords();


const handleSearch = async () => {
  const model = currentSelection === "일반 검색" ? "mobilenet" : "clip";
  const result = await window.electronAPI.searchKeyword(keyword, model);
  console.log("this is Search model: ", model);
  if (result.sendResult) {
     setItems(result.sendData); //기록보기 창 리렌더링링
  } else {
    console.error("검색 실패", result);
  }
};

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false);
        }
    };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative flex">
          <div className="
            flex
            w-[28rem]
            h-[4.9rem]
            rounded-[1.265rem]
            bg-white/70
            shadow-[0_0.253rem_2.53rem_0_rgba(83,83,83,0.25)]
            py-[1.2rem]
            relative
          ">
            {/* 입력 영역 */}
            <div className="flex items-center gap-[0.7rem] pl-[1.3rem]">
              <img className="" alt="search-icon" src="search.svg" />
              <input
                type="text"
                placeholder="Search"
                className="
                  bg-transparent focus:outline-none 
                  text-[var(--blue-300)] font-[var(--font-rg)]
                  text-[1.5rem] w-full
                  placeholder-[var(--blue-100)]
                "
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              />
            </div>

            {/* 구분선 */}
            <div className="border-l border-gray-300 h-[2.5rem]"></div>

            {/* 드롭다운 메뉴 */}
            <div
              className="
                relative flex flex-col items-end
                w-[13rem] pr-[1.4rem]
              "
              ref={dropdownRef}
            >
               <button
                className="
                    flex items-center gap-[1rem] 
                    text-[var(--blue-200)]
                    !font-pretendard
                    text-[1.4rem]
                    font-[var(--font-md)] !font-pretendard"
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                {currentSelection}
                <div className="
                  text-[var(--blue-200)]
                  !font-pretendard
                  text-[1.4rem]
                  font-[var(--font-md)]
                ">
                  ▼
                </div>
              </button>       
            {dropdownOpen && (
              <div className="
                h-[6rem] w-[11rem] 
                py-[0.5rem]
                absolute right-0 top-[3.8rem]
                bg-white border rounded-xl shadow-md pl-[1.3rem]
                flex flex-col gap-2 z-[30]
              ">
                {isMobileNetv3.map((opt) => (
                  <div
                    key={opt}
                    className="
                      cursor-pointer
                      text-[var(--blue-200)]
                      !font-pretendard
                      !text-[1.3rem]
                      !font-[var(--font-md)]
                      leading-normal
                      w-[7.8rem] h-[1.7rem]
                    "
                    onClick={() => {
                      setCurrentSelection(opt);
                      setDropdownOpen(false);
                      console.log(opt);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          <LoginModal />
        </div>

  );

}
export default SearchBar;