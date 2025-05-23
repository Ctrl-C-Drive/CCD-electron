import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";


const FilterBar = ({isTagChecked, setIsTagChecked}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [location, setLocation] = useState('ALL');
    const [isLocal, setIsLocal] = useState(false);
    const [isCloud, setIsCloud] = useState(false);
    const [isOpenFilterModal, setIsOpenFilterModal] = useState(false);
    const [fileType, setFileType] = useState('JPG');
    const [dateInput, setDateInput] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');

    const [dateInputRaw, setDateInputRaw] = useState("");     // 내부 로직용 (YYYYMMDD)
    const [dateInputDisplay, setDateInputDisplay] = useState(""); // 사용자에게 보여지는 값 (YYYY/MM/DD)
    const [dateError, setDateError] = useState("");            // 에러 메시지

    const dropdownRef = useRef(null);
    const filterModalRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false);
        }
        if (filterModalRef.current && !filterModalRef.current.contains(event.target)) {
           setIsOpenFilterModal(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

const handleDateInput = (value) => {
  // 숫자만 추출
  const digits = value.replace(/\D/g, "").slice(0, 8); // 최대 8자리 숫자

  // 실시간 포맷팅: YYYY/MM/DD
  let formatted = digits;
  if (digits.length > 4) {
    formatted = `${digits.slice(0, 4)}/${digits.slice(4, 6)}`;
    if (digits.length > 6) {
      formatted += `/${digits.slice(6, 8)}`;
    }
  }

  // 상태 업데이트
  setDateInputRaw(digits);
  setDateInputDisplay(formatted);

    // 유효성 검사
    // 1. 8글자 이내인지 아닌지 검사사
    if (digits.length === 8) {
      //8글자면 year/month/day로 사용자에게 보여지는 값만 파싱
      // (실제 값은 여전히 20240427 식)
      const year = parseInt(digits.slice(0, 4), 10);
      const month = parseInt(digits.slice(4, 6), 10);
      const day = parseInt(digits.slice(6, 8), 10);

      const isValidDate =
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31 &&
        new Date(`${year}-${month}-${day}`).getDate() === day &&
        new Date(`${year}-${month}-${day}`).getMonth() + 1 === month;

      //9999/04/27 같이 말이 안되는 날짜 검사
      if (!isValidDate) {
        setDateError("유효한 날짜를 입력해주세요");
      } else {
        setDateError("");
      }
    } else {
      setDateError(""); // 입력 중간에는 에러 숨김
    }
  };

    return (
      <>
      <div className="flex justify-between items-center gap-4 px-[1rem] py-2  rounded-xl">
        {/* TAG 영역 */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsTagChecked((prev) => !prev)}
        >
          <input
            type="checkbox"
            checked={isTagChecked}
            onChange={() => {}}
            className="accent-blue-700"
          />
          <span className="text-blue-700 font-bold">TAG</span>
        </div>

        <div className="flex  items-center justify-end gap-[1.2rem]">
         {/* Location 드롭다운 */}
          <div className="relative  flex  " ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="
                    bg-[var(--white)]
                    shadow-[0_0.1rem_2.5rem_0_rgba(0,0,0,0.10)]
                    rounded-[0.7rem]
                  pl-[0.8rem] py-[0.75rem] flex items-center 
                  gap-2 text-sm text-blue-700 shadow
                  h-[2.7rem] w-[10.6rem]
                  flex justify-between flex-row
                  pr-[0.6rem]
            "
            >
              <div className="
                  text-[var(--blue-100)]
                  !font-pretendard
                  text-[1rem]
                  font-[var(--font-rg)]
                  leading-[2.8rem]                        
                  ">
                    Location
              </div>
              <div className="flex justify-between gap-[0.4rem]"> {location} <span className="text-xs">▼</span></div>
            </button>
            {dropdownOpen && (
              <div className="absolute flex flex-col text-end  h-auto mt-[2.7rem] ml-[2.7rem] w-32 bg-white border rounded-xl shadow-md z-50 p-2">
                {['All','Local', 'Cloud'].map((opt, idx) => (
                    <React.Fragment key={opt}>

                  <div
                    className="
                     px-3 py-1 hover:bg-blue-50 rounded 
                    cursor-pointer 
                    text-[var(--blue-200)]
                    !font-pretendard
                    text-[1.2rem]
                    not-italic
                    font-[var(--font-md)]
                    leading-[2.8rem]   
                    h-[2.7rem]    
  
                    "
                    onClick={() => {
                      setLocation(opt);
                      setIsLocal(opt === 'Local');
                      setIsCloud(opt === 'Cloud');
                      setDropdownOpen(false);
                    }}
                  >
                    {opt}
                    
                  </div>
                  { idx===1 && <hr className="my-1 border-blue-200" />} {/* Local 다음에 hr 추가 */}
                 { idx===0 && <hr className="my-1 border-blue-200" />} 
                </React.Fragment>
                ))}
              </div>
            )}
          </div>

      {/* 필터 버튼 */}
          <div className="relative" ref={filterModalRef}>
            <img
              onClick={() => setIsOpenFilterModal(true)}
              className="text-blue-700 text-2xl cursor-pointer"
              src="Filter.svg"
              alt="Filter"
            />
            {isOpenFilterModal && (
              <div className="
                  absolute  w-[14.2rem]
                  h-[14.5rem]  right-0 mt-2 bg-white border 
                  rounded-xl shadow-md z-50 py-4
              ">
                <div 
                className="
                  text-[var(--blue-200)]
                  text-center
                  !font-pretendard
                  text-[1.4rem]
                  not-italic
                  font-[600]
                  leading-normal
                  flex
                  justify-center
                  px-auto     
        
                  pb-[0.8rem]        
                ">
                  Filter
                  </div>
                <div className=" px-[1.7rem] flex flex-col gap-[1.3rem] ">
                
                 <hr className="mb-2" />
                  <div className="flex flex-row w-auto justify-between items-center">
                
                   <label className="
                    text-[var(--blue-200)]
                    !font-pretendard
                    font-[var(--font-md)]
                    leading-normal justify-between items-center
                    whitespace-nowrap
                  ">파일 타입</label>
                  <lable className="
                    text-[var(--blue-200)]
                    !font-pretendard
                    font-[var(--font-md)]
                    leading-normal justify-between items-center
                  ">
                  <select
                    className="w-[5.2rem] mt-1 rounded px-2 py-1 "
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                  >
                    <option>jpg</option>
                    <option>png</option>
                    <option>jpeg</option>
                  </select>
                  </lable>
                  </div>
                 <div className="flex flex-row w-auto justify-between ">
                  <label className="  
                    text-[var(--blue-200)]
                    !font-pretendard
                    font-[var(--font-md)]
                    leading-normal justify-between items-center
                    whitespace-nowrap
                  ">
                    날짜
                  </label>
                  <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="YYYYMMDD"
                    value={dateInputDisplay}
                    onChange={(e) => handleDateInput(e.target.value)}
                    className="!w-[5.2rem] mt-1 rounded bg-[var(--gray-200)]/50 px-2 py-1"
                  />
                  {dateError && (
                    <p className="absolute bottom-4 left-5 text-[var(--red)] text-[0.9rem] mt-1 inline-block whitespace-nowrap z-100
                          ">{dateError}</p>
                  )}
                  </div>

                </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
      </>
    );
  };

  export default FilterBar;