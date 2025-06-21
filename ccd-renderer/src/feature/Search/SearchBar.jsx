import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";
import useClipboardRecords from "../../utils/useClipboardRecords";
import useDisableDuringSubmit from "../../utils/useDisableDuringSubmit";

import LoginModal from '../Login/LoginModal';

const SearchBar = ({ setItemsFromSearchResult, refetch }) => {
  const options = ['일반 검색', '고급 검색'];

  const searchOptions = [
    { label: "일반 검색", description: "MobilenetV3 태그" },
    { label: "고급 검색", description: "CLIP" },
  ];

  const [currentSelection, setCurrentSelection] = useState('일반 검색');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [keyword, setKeyword] = useState("");
  const [loginInfo, setLoginInfo] = useState({ isLoggedIn: false, userId: "" });
  const [modalState, setModalState] = useState(null);

  const dropdownBtnRef = useRef(null);
  useDisableDuringSubmit(modalState === "login", dropdownBtnRef);

  const handleSearch = async () => {
    const model = currentSelection === "일반 검색" ? "mobilenet" : "clip";
    const result = await window.electronAPI.searchKeyword(keyword, model);
    console.log("this is Search model: ", model);
    if (result.success) {
      console.log("이건 senddata 원본~", result);
      console.log("이건 send받은 result~: ", result.data);
      setItemsFromSearchResult(result.data); //기록보기 창 리렌더링
    } else {
      console.error("검색 실패", result);
    }
    if (keyword === "") {
      refetch(); // 전체 기록 다시 로드
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
        mx-auto
      ">
        {/* 입력 영역 */}
        <div 
          style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
          className="flex items-center gap-[0.7rem] pl-[1.3rem]">
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
              if (e.key === "Enter") { handleSearch(); console.log("엔터감지~성공~") };
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
            ref={dropdownBtnRef}
            className={clsx(
              "flex items-center gap-[1rem]",
              "text-[1.4rem] !font-pretendard font-[var(--font-md)]",
              "text-[var(--blue-200)]"
            )}
            onClick={() => setDropdownOpen((prev) => !prev)}
              style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
          >
            {currentSelection}
            <div
              className="text-[1.4rem] !font-pretendard font-[var(--font-md)] text-[var(--blue-200)]"
            >
              ▼
            </div>
          </button>

          {dropdownOpen && (
            <div className="
              h-auto w-[15rem] 
              py-[0.5rem]
              absolute right-0 top-[3.8rem]
              bg-white border rounded-xl shadow-md pl-[1.3rem] pr-[1.3rem]
              flex flex-col gap-2 z-[30]
            ">
              {searchOptions.map((opt) => {
                const isHighLevelSearch = opt.label === "고급 검색";
                const isDisabled = isHighLevelSearch && !loginInfo.isLoggedIn;

                return (
                  <div
                    key={opt.label}
                    className={clsx("cursor-pointer", isDisabled && "text-gray-400 cursor-not-allowed")}
                    onClick={() => {
                      if (isDisabled) {
                          return; //고급검색은 비로그인 상태시 그냥 무시
                      }
                        setCurrentSelection(opt.label);
                        setDropdownOpen(false);
                        console.log(opt.label);
                    }}
                     style={isDisabled ? { pointerEvents: 'auto', cursor: 'default' } : {}}
                      //비로그인 상태서 hover시 빨간금지 아이콘 안뜨게함
                  >
                    <div 
                        style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
                      className={clsx("text-[1.3rem] font-[var(--font-md)] leading-tight", isDisabled ? "text-gray-400" : "text-[var(--blue-200)]")}> 
                      {opt.label}
                    </div>
                    <div className="text-gray-400 text-[1.1rem] leading-snug">
                      {opt.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <LoginModal
        modalState={modalState}
        setModalState={setModalState}
        loginInfo={loginInfo}
        setLoginInfo={setLoginInfo}
      />
    </div>
  );
};

export default SearchBar;
