import { useState, useRef, useEffect } from 'react'

import './App.css'
import './index.css'
const options = ['일반 검색', '고급 검색'];

  const SettingModal = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [retentionOpen, setRetentionOpen] = useState(false);
    const [localLimitOpen, setLocalLimitOpen] = useState(false);
    const [cloudLimitOpen, setCloudLimitOpen] = useState(false);
    const [retention, setRetention] = useState('7일');
    const [localLimit, setLocalLimit] = useState('무제한');
    const [cloudLimit, setCloudLimit] = useState('무제한');
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
                className="bg-gray-100 rounded px-2 py-1 text-blue-700 cursor-pointer"
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
      <div className="flex justify-between items-center px-6 py-4 bg-gray-100">
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
    <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-100">
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
      <div className="flex items-center gap-4 px-6 py-2 bg-gray-100 rounded-xl">
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
                  className="w-full mt-1 rounded bg-gray-100 px-2 py-1"
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
      <div className="flex ">
        <div className="flex items-center w-[29rem] h-[4.9rem] justify-between bg-gray-100 rounded-full px-3 py-2 shadow-inner w-full max-w-md">
          {/* 입력 영역 */}
          <div className="flex items-center w-full">
            <img className="" alt="search-icon" src="search.svg"></img>
            <input
              type="text"
              placeholder="Search"
              className="bg-transparent focus:outline-none text-blue-700 w-full"
            />
          </div>

          {/* 구분선 */}
          <div className="border-l border-gray-300 h-6 mx-2"></div>

          {/* 드롭다운 버튼 */}
          <div className="relative flex w-[13rem] " ref={dropdownRef}>
            <button
              className="text-blue-700 flex items-center gap-1 text-sm"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              {currentSelection}
              <span className="text-xs">▼</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border rounded-xl shadow-md z-50 p-2">
              {isMobileNetv3.map((opt) => (
                  <div
                    key={opt}
                    className="text-blue-700 px-3 py-1 hover:bg-blue-50 rounded cursor-pointer text-sm"
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
          {/* 프로필 */}
        </div>
        <div className="ml-3 w-8 h-8 border-2 border-blue-700 rounded-full"></div>
    </div>
  );

}

function App() {

  return (
    <>
      <div className="w-full h-full p-0">
        {/* 최상단 손잡이, 닫기 버튼 */}
          <div className="">
              {/*  손잡이 */}
              <div className="">

              </div>
              {/* 닫기 버튼  */}
              <div className="">

              </div>
          </div>
           <div className="  px-[3rem] bg-red-100 ">
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

