import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import { colors, colorVariants } from './styles/color.ts';
import { typographyVariants } from './styles/typography.ts';
import './App.css'
import './index.css'
import './styles/color.css'
import './styles/typography.css'
//typo, color util 예시 (복붙해서 쓰기)
// {`${colorVariants({ bg: 'gray-50' })}`}
//  {`${typographyVariants({ variant: 'h1-sb' })} `}

const options = ['일반 검색', '고급 검색'];

const LoginModal = () => {
const [modalState, setModalState] = useState(null);
  const [userId, setUserId] = useState(""); // 로그인 성공 시 저장될 유저 ID
  const ref = useRef(null);
const [pw, setPw] = useState("");
const [error, setError] = useState("");
const [isSubmitted, setIsSubmitted] = useState(false);
const [idError, setIdError] = useState("");
const [pwError, setPwError] = useState("");


  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setModalState(null);
        setIsSubmitted(false); 

      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);

    };
  }, []);

  const handleLogin = () => {
    setIsSubmitted(true); 
  if (!userId || !pw || userId !== "Hello1355" || pw !== "password") {
    setError("ID 또는 PW를 확인해주세요");
    return;
  }

  setUserId(userId); // 정상 로그인
  setError("");  // 에러 초기화
  setIsSubmitted(false); 

  setModalState("loggedIn");


  };
  const handleJoin = () => {
    // 실제 인증 로직은 여기에 연결
    setUserId("Hello1355"); // 예시 ID
    setModalState("menu");

  };
  const handleIDChange = (value) => {
    setUserId(value);
  }
  const handlePwChange = (value) => {
  // 상태 업데이트
  setPw(value);
  }

  return (
    <div className="relative inline-block">
      {/* 아바타 */}
      <div
        className="ml-3 w-[4.0rem] h-[4.0rem] border-2 border-[var(--blue-200)] rounded-full cursor-pointer"
        onClick={() =>
          setModalState((prev) => (prev === null ? "menu" : null))
        }
      />

      {/* 모달 영역 */}
      {modalState !== null && (
        <div
          ref={ref}
          className="absolute  flex flex-col
           right-0 mt-2 w-56 bg-white rounded-xl   
           shadow-[0_0.1rem_2.5rem_0_rgba(0,0,0,0.10)]
            p-4 z-10"
        >
          {/* 로그인 전 메뉴 */}
          {modalState === "menu" && (
            <>
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
                  w-auto   
                  pb-[0.8rem]        
                ">
                  User
              </div>
              <hr className="mb-2" />
              <div className="flex flex-col gap-[1rem] pt-[1.4rem] pb-[2.2rem]">
                <div
                  className="
                        text-[var(--blue-200)]
                        !font-pretendard
                        text-[1.2rem]
                        font-[var(--font-md)]
                        leading-normal
                        text-center
                        cursor-pointer
                    "
                  onClick={() => setModalState("login")}
                >
                  Login
                </div>
                <div 
                    className="
                        text-[var(--blue-200)]
                        !font-pretendard
                        text-[1.2rem]
                        font-[var(--font-md)]
                        leading-normal
                        text-center
                        cursor-pointer
                    "
                  onClick={() => setModalState("JoinIn")}
                >Join
                </div>
              </div>
            </>
          )}

          {/* 로그인 입력 폼 */}
          {modalState === "login" && (
            <div className="w-[14.2rem] h-[15.4rem] bg-[var(--white)]">
              <div className="
                    text-[var(--blue-200)]
                    text-center
                    !font-pretendard
                    text-[1.4rem]
                    pb-[0.9rem]
                    font-[var(--font-sb)]
                    leading-normal
              ">Login
              </div>
              <hr className="mb-2" />
              <div className="flex flex-col gap-2 pl-[2rem] pt-[1.4rem] pr-[1.8rem] ">
                <label className=" 
                  text-[var(--blue-200)]
                  text-[1.2rem]
                  font-[var(--font-md)]
                  flex
                  !font-pretendard
                  not-italic
                  font-[var(--font-md)]
                  leading-normal justify-between items-center
                ">
                  ID
                <div className="flex flex-row">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="ID"
                    value={userId}
                    onChange={(e) => handleIDChange(e.target.value)}
                    className="!w-[8.3rem] px-2 py-1 ml-[0.rem] rounded-md bg-gray-100 text-gray-800"
                  />

                </div>
                </label>
                <label className="
                  text-[var(--blue-200)]
                  !font-pretendard
                  text-[1.2rem]
                  font-[var(--font-md)]
                  leading-normal
                  flex justify-between items-center
                ">
                  PW
                  <div className="flex flex-col">
                    <input
                      type="password"
                      placeholder="PW"
                      value={pw}
                      maxLength={8}
                      onChange={(e) => handlePwChange(e.target.value)}
                      className="!w-[8.3rem] px-2 py-1 ml-[0.2rem] rounded-md bg-gray-100 text-gray-800"
                    />

                  </div>
                </label>
              </div>
                  {isSubmitted && error && (
                  <div className="
                   text-center
                   text-center
                   !font-inter
                   text-[0.9rem]
                   font-[var( --font-rg)]
                   leading-normal
                   text-[var(--red)]
                   mt-[1rem]
                  ">
                    {error}
                  </div>
                )}
              <button
                className="
                  text-[var(--blue-200)]
                  text-center
                  !font-pretendard
                  text-[1.1rem]
                  font-[var(--font-rg)]
                  leading-normal
                  underline
                  text-center
                  justify-center
                  flex
                 w-full text-center
                 pt-[1.3rem]
                 "
                onClick={handleLogin}
              >
                Login
              </button>
            </div>
          )}

          {/* 로그인 성공 후 */}
          {modalState === "loggedIn" && (
            <>
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
                  w-auto   
                  pb-[0.8rem]        
                ">
                  User
              </div>
              <hr className="mb-2" />
              <div className="py-[1.9rem] pl-[3.1rem]">
                <div 
                  className="
                      text-[var(--blue-200)]
                      !font-pretendard
                      text-[1.4rem]
                      not-italic
                      font-[var(--font-md)]
                      leading-normal
                ">
                  ID
                </div>
                <div 
                  className="
                      text-[var(--blue-200)]
                      !font-pretendard
                      text-[1.2rem]
                      not-italic
                      font-[var(--font-rg)]
                      leading-normal
                ">{userId}</div>
              </div>
            </>
          )}

          {/* 회원가입 입력 폼 */}
          {modalState === "JoinIn" && (
            <div className="w-[14.2rem] h-[15.4rem] bg-[var(--white)]">
              <div className="
                    text-[var(--blue-200)]
                    text-center
                    !font-pretendard
                    text-[1.4rem]
                    pb-[0.9rem]
                    font-[var(--font-sb)]
                    leading-normal
              ">Join
              </div>
              <hr className="mb-2" />
              <div className="flex flex-col gap-2 pl-[2rem] pt-[1.4rem] pr-[1.8rem] ">
                <label className=" 
                  text-[var(--blue-200)]
                  text-[1.2rem]
                  font-[var(--font-md)]
                  flex
                  !font-pretendard
                  not-italic
                  font-[var(--font-md)]
                  leading-normal justify-between items-center
                ">
                  ID
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="ID"
                    onChange={(e) => setUserId(e.target.value)}
                    className="!w-[8.3rem]  px-2 py-1 ml-[0.917rem] rounded-md bg-gray-100 text-gray-800 flex-1"
                  />
                </label>
                <label className="
                  text-[var(--blue-200)]
                  !font-pretendard
                  text-[1.2rem]
                  not-italic
                  font-[var(--font-md)]
                  leading-normal
                  flex justify-between items-center
                ">
                  PW
                  <input
                    type="password"
                    placeholder="PW"  
                    maxLength={8}    
                    onChange={(e) => setPw(e.target.value)}             
                    className="!w-[8.3rem] ml-2 px-2 py-1 ml-[0.2rem] rounded-md bg-gray-100 text-gray-800 flex-1"
                  />
                </label>
              </div>
                  {isSubmitted && error && (
                  <div className="
                   text-center
                   text-center
                   !font-inter
                   text-[0.9rem]
                   font-[var( --font-rg)]
                   leading-normal
                   text-[var(--red)]
                   mt-[1rem]
                  ">
                    {error}
                  </div>
                )}
              <button
                className="
                  text-[var(--blue-200)]
                  text-center
                  !font-pretendard
                  text-[1.1rem]
                  font-[var(--font-rg)]
                  leading-normal
                  underline
                  text-center
                  justify-center
                  flex
                 w-full text-center
                 pt-[1.3rem]
                 "
                onClick={handleJoin}
              >
                Join
              </button>
            </div>
          )}
        

        </div>
      )}
    </div>
  );
};

// 환경설정
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
          <img src="settings.svg" alt="Settings" className="w-6 h-6 text-blue-700" />
        </div>

        {isVisible && (
          <div
            ref={modalRef}
            className="absolute right-0 top-10 w-56 bg-white border rounded-xl shadow-xl p-4 z-50"
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
        )}
      </div>
    );
  };

const Toast = ({ message, type }) => {
  // const baseStyle = 'px-3 py-1 rounded-xl shadow bg-white border mt-2 relative';
  // const pointerStyle = 'absolute -bottom-1 left-4 w-3 h-3 bg-white rotate-45 border-l border-b';
  const textColor = type === 'error' ? 'text-red-700' : 'text-blue-700';

 return (
    <div className="relative flex items-center gap-2 mt-2">
      <div className={`
        absolute left-4 top-[3rem] !text-[1.4rem]  
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
          justify-center
          items-center
          flex
        ${textColor}`}>
        {message}
      </div>
    </div>
  );
};
  const BottomBar = () => {
      const [toasts, setToasts] = useState([]);

    const showToast = (message, type) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 2000);
            // }, 100000);

    };

    return (
      <div className="flex justify-between items-center px-6 mt-[3rem] ">
        {/* 왼쪽 업로드 / 다운로드 */}
        <div className="flex gap-6 items-center">
          <div 
            className="flex flex-col items-center text-blue-700 cursor-pointer"
            onClick={() => showToast('Uploading...', 'info')}
            >
            <img src="UploadCloud.svg" alt="Upload" className="w-[3.2rem] h-[3.2rem] mb-1" />
            <span className="text-xs underline">Upload</span>
          </div>
          <div 
              className="flex flex-col items-center text-blue-700 cursor-pointer"
              onClick={() => showToast('Downloading...', 'info')}
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
  // 기록보기
  //기록 보기
const MainView = ({isTagChecked}) => {
  const [items, setItems] = useState([
    { id: 1, tag: '고양이', selected: true },
    { id: 2, tag: '고양이', selected: false },
    { id: 3, tag: '고양이', selected: false },
    { id: 4, tag: '고양이', selected: false },
    { id: 5, tag: '고양이', selected: false },
  


  ]);

  const toggleSelect = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3 px-6 py-4 ">
      {items.map((item) => (
        <div
          key={item.id}
          className="w-[17rm]  border border-blue-700 rounded-md overflow-hidden cursor-pointer"
          onClick={() => toggleSelect(item.id)}
        >
          <div className="relative  h-[9.2rem] bg-blue-100">
            {isTagChecked && (

            <div className="absolute top-1 left-1">
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => {}}
                className="accent-blue-700 w-[1.3rem] h-[1.3rem]"
              />
            </div>
            )}
            <div className="absolute bottom-1 right-1">
              <img src="folder.svg" alt="folder" className="w-[1.7rem] h-[1.5rem]" />
            </div>
          </div>
          <div className="
            text-[var(--blue-200)]
            !font-pretendard
            text-[1.3rem]
            font-[var(--font-rg)]
            leading-[2.8rem]
             border-t h-[2.6rem] border-[var(--blue-200)] pl-[1.6rem] ">
            # {item.tag}
          </div>
        </div>
      ))}
    </div>
  );
  };

  //필터 바

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
                  not-italic
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


// 검색
const SearchBar =() => {
 
 const [isMobileNetv3] = useState(['일반 검색', '고급 검색']);
  const [currentSelection, setCurrentSelection] = useState('일반 검색');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);


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

//전체 
const App= () => {
    const [isTagChecked, setIsTagChecked] = useState(true);

  return (
    <>
      <div className="w-full h-full bg-white opacity-87  p-0">
        {/* 최상단 손잡이, 닫기 버튼 */}
          <div className="pt-[1.6rem] pb-[2.1rem] flex justify-center ">
              {/*  손잡이 */}
              <div className="w-[5.6rem]  h-[0.2rem] bg-[var(--blue-200)] [border-[var(--blue-200)]">

              </div>
              {/* 닫기 버튼  */}
              <div className="">

              </div>
          </div>
           <div className=" !bg-white/70 px-[3rem]  ">
              {/* search-bar-zone */}
              <div className="">
                    <SearchBar/>
              </div>
              {/* Tag, 필터 2개 zone */}
              <div className="">
                  <FilterBar isTagChecked={isTagChecked} setIsTagChecked={setIsTagChecked}/>
              </div>
              {/* grid-view 데이터 존 */}
              <div className="">
                  <MainView isTagChecked={isTagChecked} />
              </div>
              {/* 하단 bar */}
              <div className="">
                <BottomBar />
              </div>
            </div>
      </div>
      
    </>
  );
}

export default App

