import { useState, useRef, useEffect } from 'react'
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
  const [showLogin, setShowLogin] = useState(false);
  const ref = useRef(null);

    useEffect(() => {
      function handleClickOutside(event) {
        if (ref.current && !ref.current.contains(event.target)) {
          setShowLogin(false);
        }
      }

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


  return (
    <div className="relative inline-block">
      {/* 아바타 */}
      <div
        className="ml-3 w-[4.2rem] h-[4.2rem] border-2 border-[var(--blue-200)] rounded-full cursor-pointer"
        onClick={() => setShowLogin(!showLogin)}
      />

      {/* 로그인 모달 */}
      {showLogin && (
        <div
          ref={ref}
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg p-4 z-10"
        >
          <div className="text-center text-blue-700 font-semibold mb-3">Login</div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-blue-800 flex justify-between items-center">
              ID
              <input
                type="text"
                placeholder="ID"
                defaultValue="Hello1355"
                className="ml-2 px-2 py-1 rounded-md bg-gray-100 text-gray-800 flex-1"
              />
            </label>
            <label className="text-sm text-blue-800 flex justify-between items-center">
              PW
              <input
                type="password"
                placeholder="Password"
                defaultValue="password"
                className="ml-2 px-2 py-1 rounded-md bg-gray-100 text-gray-800 flex-1"
              />
            </label>
          </div>
          <button className="mt-3 text-sm text-blue-700 underline w-full text-center">
            Login
          </button>
        </div>
      )}
    </div>
  );
}
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
      <img src="speechBubble.svg" className="w-[7.5rem] h-[4.4rem]" alt="bubble" />
      <div className={`absolute left-10 top-10 !text-[1.4rem]  ${textColor}`}>
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
    };

    return (
      <div className="flex justify-between items-center px-6 py-0">
        {/* 왼쪽 업로드 / 다운로드 */}
        <div className="flex gap-6 items-center">
          <div 
            className="flex flex-col items-center text-blue-700 cursor-pointer"
            onClick={() => showToast('Uploading...', 'info')}
            >
            <img src="UploadCloud.svg" alt="Upload" className="w-6 h-6 mb-1" />
            <span className="text-xs underline">Upload</span>
          </div>
          <div 
              className="flex flex-col items-center text-blue-700 cursor-pointer"
              onClick={() => showToast('Downloading...', 'info')}
          >
            <img src="DownloadCloud.svg" alt="Download" className="w-6 h-6 mb-1" />
            <span className="text-xs underline">Download</span>
          </div>
        </div>

        {/* 오른쪽 환경설정 아이콘 */}
        {/* <div className="cursor-pointer">
          <img src="settings.svg" alt="Settings" className="w-6 h-6 text-blue-700" />
        </div> */}
          <SettingModal />
        <div className="absolute right-4 top-0 flex flex-col items-end z-50">
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </div>
      </div>
    );
  };
  // 기록보기
  //기록 보기기
const MainView = () => {
  const [items, setItems] = useState([
    { id: 1, tag: '#고양이', selected: true },
    { id: 2, tag: '#고양이', selected: false },
    { id: 3, tag: '#고양이', selected: false },
  ]);

  const toggleSelect = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-4 ">
      {items.map((item) => (
        <div
          key={item.id}
          className="border border-blue-700 rounded-md overflow-hidden cursor-pointer"
          onClick={() => toggleSelect(item.id)}
        >
          <div className="relative h-32 bg-blue-100">
            <div className="absolute top-1 left-1">
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => {}}
                className="accent-blue-700 w-4 h-4"
              />
            </div>
            <div className="absolute bottom-1 right-1">
              <img src="folder.svg" alt="folder" className="w-4 h-4" />
            </div>
          </div>
          <div className="border-t border-blue-700 p-2 text-blue-700 text-sm">
            {item.tag}
          </div>
        </div>
      ))}
    </div>
  );
  };

  //필터 바

  const FilterBar = () => {
    const [isTagChecked, setIsTagChecked] = useState(true);
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
      setDateInput(value);
      if (/^\d{8}$/.test(value)) {
        setYear(value.slice(0, 4));
        setMonth(value.slice(4, 6));
        setDay(value.slice(6, 8));
      }
    };

    return (
      <div className="flex items-center gap-4 px-6 py-2  rounded-xl">
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

        {/* Location 드롭다운 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="bg-white rounded-full px-3 py-1 flex items-center gap-2 text-sm text-blue-700 shadow"
          >
            <span className="text-xs text-gray-400">Location</span>
            {location} <span className="text-xs">▼</span>
          </button>
          {dropdownOpen && (
            <div className="absolute mt-2 w-32 bg-white border rounded-xl shadow-md z-50 p-2">
              {['Local', 'Cloud'].map((opt) => (
                <div
                  key={opt}
                  className="text-blue-700 px-3 py-1 hover:bg-blue-50 rounded cursor-pointer text-sm"
                  onClick={() => {
                    setLocation(opt);
                    setIsLocal(opt === 'Local');
                    setIsCloud(opt === 'Cloud');
                    setDropdownOpen(false);
                  }}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 필터 버튼 */}
        <div className="relative" ref={filterModalRef}>
          <img
            onClick={() => setIsOpenFilterModal(true)}
            className="text-blue-700 text-2xl"
            src="Filter.svg"
          />  
          {isOpenFilterModal && (
            <div 
                 className="absolute right-0 top-10 w-48 bg-white border rounded-xl shadow-xl p-4 z-50">
              <div className="text-center text-blue-700 font-bold mb-2">Filter</div>
              <hr className="mb-2" />
              <div className="mb-2">
                <label className="text-sm text-blue-700">파일 타입</label>
                <select
                  className="w-full mt-1 rounded  px-2 py-1"
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                >
                  <option>JPG</option>
                  <option>PNG</option>
                  <option>SVG</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-blue-700">날짜</label>
                <input
                  type="text"
                  placeholder="20250102"
                  value={dateInput}
                  onChange={(e) => handleDateInput(e.target.value)}
                  className="w-full mt-1 rounded bg-gray-100 px-2 py-1"
                />
                {year && (
                  <div className="text-xs text-gray-500 mt-1">
                    입력된 날짜: {year}/{month}/{day}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
      <div className=" relative flex z-100">
        <div className="
                  flex
                  w-[28rem]
                  h-[4.9rem]
                  rounded-[1.265rem]
                  bg-white/70
                  shadow-[0_0.253rem_2.53rem_0_rgba(83,83,83,0.25)]
                  py-[1.2rem]
                  relative
                  z-90
                ">
          {/* 입력 영역 */}
          <div className="z-60 flex items-center gap-[0.7rem] pl-[1.3rem] ">
            <img className="" alt="search-icon" src="search.svg"></img>
            <input
              type="text"
              placeholder="Search"
              className="
                bg-transparent focus:outline-none 
                text-[var(--blue-300)]   font-[var(--font-rg)]
                text-[1.5rem]  w-full
                 placeholder-[var(--blue-100)]
              "
            />
          </div>

          {/* 구분선 */}
          <div className="border-l border-gray-300  h-[2.5rem] "></div>
          <div className="absolute z-[110] right-0">
              {dropdownOpen && (
                <div className="
                         h-[6rem] w-[11rem] 
                         py-[0.5rem]
                         absolute right-0  w-32 bg-white border rounded-xl 
                         shadow-md  pl-[1.3rem]
                         top-[3.8rem]
                         flex
                         flex-col
                         gap-2
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
                        w-[7.8rem]
                        h-[1.7rem]
                        
                      "
                      onClick={() => {
                        setCurrentSelection(opt);
                        setDropdownOpen(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}

                </div>
              )}

            </div>
          {/* 드롭다운 버튼 */}
          <div className="
                          relative flex !w-[13rem]   
                          !text-[var(--blue-200)]
                          !font-pretendard                         
                          text-[1.4rem]
                          font-[var(--font-md)]
                          leading-normal 
                          justify-end 
                          pr-[1.4rem]
                          z-50
                          " 
                ref={dropdownRef}>

            <button
              className=" flex items-center 
                          text-[1.4rem]
                          gap-[1rem]
                          !font-pretendard
                          
                          "
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              {currentSelection}
              <div className="
                          !text-[var(--blue-200)]
                          !font-pretendard
                          text-[1.4rem]
                          font-[var(--font-md)]
                  ">
                  ▼
              </div>
            </button>

  
          </div>
        </div>
            <LoginModal />
    </div>
  );

}

//전체 
const App= () => {

  return (
    <>
      <div className="w-full h-full !bg-white/70 p-0">
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
                  <FilterBar/>
              </div>
              {/* grid-view 데이터 존 */}
              <div className="">
                  <MainView />
              </div>
              {/* 하단 bar */}
              <div className="">
                <BottomBar />
              </div>
            </div>
      </div>
      
    </>
  )
}

export default App

