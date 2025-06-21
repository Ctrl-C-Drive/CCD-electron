import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";


const FilterBar = ({isTagChecked, 
                    setIsTagChecked, 
                    locationFilter,
                    setLocationFilter, 
                    sinceRaw,
                    setSinceRaw,
                    untilRaw,
                    setUntilRaw,
                    locationInput,
                    setLocationInput,
                    onApplyFilters,
                     sinceInput, setSinceInput,
                    untilInput, setUntilInput,
                    fileType,setFileType 
                  }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [location, setLocation] = useState('ALL');
    const [isLocal, setIsLocal] = useState(false);
    const [isCloud, setIsCloud] = useState(false);
    const [isOpenFilterModal, setIsOpenFilterModal] = useState(false);
    const [dateInput, setDateInput] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
  const [pendingFileType, setPendingFileType] = useState(fileType); //임시 선택한 파일 타입

    // const [sinceRaw, setSinceRaw] = useState("");
    const [sinceDisplay, setSinceDisplay] = useState("");
    const [sinceError, setSinceError] = useState("");

    // const [untilRaw, setUntilRaw] = useState("");
    const [untilDisplay, setUntilDisplay] = useState("");
    const [untilError, setUntilError] = useState("");

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

  const handleDateInput = (value, type) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  let formatted = digits;
  if (digits.length > 4) {
    formatted = `${digits.slice(0, 4)}/${digits.slice(4, 6)}`;
    if (digits.length > 6) {
      formatted += `/${digits.slice(6, 8)}`;
    }
  }

  const year = parseInt(digits.slice(0, 4), 10);
  const month = parseInt(digits.slice(4, 6), 10);
  const day = parseInt(digits.slice(6, 8), 10);

  const isValidDate =
    digits.length === 8 &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= 31 &&
    new Date(`${year}-${month}-${day}`).getDate() === day &&
    new Date(`${year}-${month}-${day}`).getMonth() + 1 === month;

  if (type === "since") {
    setSinceInput(digits); // ✅ 외부 상태 업데이트
    setSinceDisplay(formatted);
    setSinceError(isValidDate || digits.length < 8 ? "" : "유효한 날짜를 입력해주세요");
  } else {
    setUntilInput(digits); 
    setUntilDisplay(formatted);
    setUntilError(isValidDate || digits.length < 8 ? "" : "유효한 날짜를 입력해주세요");
  }
};


    return (
      <>
      <div
         style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용 
        className="flex justify-between items-center gap-4 px-[1rem] py-2  rounded-xl">
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
              <div 
               style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
                className="absolute flex flex-col text-end  h-auto mt-[2.7rem] ml-[2.7rem] w-32 bg-white border rounded-xl shadow-md z-50 p-2">
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
                      setLocationFilter(opt);
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
      absolute w-[14.2rem]
      h-auto right-0 mt-2 bg-white border 
      rounded-xl shadow-md z-50 py-4
  ">
    <div className="text-[var(--blue-200)] text-center !font-pretendard text-[1.4rem] font-[600] leading-normal pb-[0.8rem]">
      Filter
    </div>
    <div className="px-[1.7rem] flex flex-col gap-[1.3rem]">
      <hr className="mb-2" />

      <div className="flex justify-between items-center">
        <label className="text-[var(--blue-200)] !font-pretendard font-[var(--font-md)]">
          파일 타입
        </label>
        <select
          className="w-[5.2rem] mt-1 rounded px-2 py-1"
          value={fileType}
          onChange={(e) => setPendingFileType(e.target.value)}
        >
          {/* <option>JPG</option> */}
         <option>ALL</option>
          <option>img</option>
          <option>txt</option>

        </select>
      </div>

      <div 
        style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
        className="flex flex-col gap-[0.8rem]">
        <div className="flex justify-between items-center">
          <label className="text-[var(--blue-200)] !font-pretendard font-[var(--font-md)]">since</label>
          <input
            type="text"
            placeholder="YYYYMMDD"
            value={sinceDisplay}
            onChange={(e) => handleDateInput(e.target.value, "since")}
            className="!w-[7rem] mt-1 rounded bg-[var(--gray-200)]/50 px-2 py-1"
          />
        </div>
        {sinceError && <p className="text-[var(--red)] text-[0.9rem] mt-1 whitespace-nowrap">{sinceError}</p>}

        <div className="flex justify-between items-center">
          <label className="text-[var(--blue-200)] !font-pretendard font-[var(--font-md)]">until</label>
          <input
            type="text"
            placeholder="YYYYMMDD"
            value={untilDisplay}
            onChange={(e) => handleDateInput(e.target.value, "until")}
            className="!w-[7rem] mt-1 rounded bg-[var(--gray-200)]/50 px-2 py-1"
          />
        </div>
        {untilError && <p className="text-[var(--red)] text-[0.9rem] mt-1 whitespace-nowrap">{untilError}</p>}
      </div>

      <button
        className="mt-3 text-center text-[var(--blue-200)] !font-pretendard font-[var(--font-md)] underline"
        onClick={() => {
          console.log(" 확인 클릭:", { fileType, since: sinceRaw, until: untilRaw });
            onApplyFilters(); //필터 적용 요청
          setIsOpenFilterModal(false);
         -setFileType(pendingFileType);

        }}
        style={{ WebkitAppRegion: 'no-drag' }} // 클릭 이벤트 허용
      >
        확인
      </button>
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