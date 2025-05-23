import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";


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
export default MainView;