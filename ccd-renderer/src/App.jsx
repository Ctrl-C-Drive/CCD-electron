import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import { colors, colorVariants } from './styles/color.ts';
import { typographyVariants } from './styles/typography.ts';


import BottomBar from './feature/Bottom/BottomBar';
import SearchBar from './feature/Search/SearchBar';
import FilterBar from './feature/Filter/FilterBar';
import MainView from './feature/MainView/MainView';
import './App.css'
import './index.css'
import './styles/color.css'
import './styles/typography.css'
//typo, color util 예시 (복붙해서 쓰기)
// {`${colorVariants({ bg: 'gray-50' })}`}
//  {`${typographyVariants({ variant: 'h1-sb' })} `}



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

