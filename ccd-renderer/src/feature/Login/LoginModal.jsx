import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx'; 
import { twMerge } from 'tailwind-merge';
import "../../styles/color.css";
import useDisableDuringSubmit from "../../utils/useDisableDuringSubmit.js";

import CryptoJS from "crypto-js";

const LoginModal = ({loginInfo, setLoginInfo}) => {
  const [success, setSuccess] = useState("");

const [modalState, setModalState] = useState(null);
  const [userId, setUserId] = useState(""); // 로그인 성공 시 저장될 유저 ID
  const ref = useRef(null);
const [pw, setPw] = useState("");
const [error, setError] = useState("");
const [isSubmitted, setIsSubmitted] = useState(false);
const [idError, setIdError] = useState("");
const [pwError, setPwError] = useState("");
const loginBtnRef = useRef(null);
const joinBtnRef = useRef(null);
const isDisabled = modalState === "login"; // ex: 로그인 중이면 비활성화

useDisableDuringSubmit(isSubmitted, loginBtnRef);
useEffect(() => {
  console.log("🟡 상태 확인", { error, success, isSubmitted });
}, [error, success, isSubmitted]);

// console.log("electronAPI:", window.electronAPI);
useEffect(() => {
  if (loginInfo.isLoggedIn && modalState !== "loggedIn") {
    console.log("🟢 loginInfo 갱신됨, modalState 변경 중...");
    setModalState("loggedIn");
  }
}, [loginInfo.isLoggedIn, loginInfo.userId]);
useEffect(() => {
  console.log(" error changed:", error);
}, [error]);

useEffect(() => {
  console.log(" success changed:", success);
}, [success]);
useEffect(() => {
  console.log("loginInfo changed", loginInfo);
}, [loginInfo]);

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

  // 렌더러 ->메인으로 보내는 id, pw AES알고리즘으로 암호화
  const encryptAES = (text) => {

    const key = CryptoJS.enc.Hex.parse(import.meta.env.VITE_AES_KEY); // 🔁 바뀐 부분
    const iv = CryptoJS.enc.Hex.parse(import.meta.env.VITE_AES_IV);   // 🔁 바뀐 부분
    //enc.Hex.parse()를 통해 hex문자열을 진짜 binary로 변환환
    console.log("thisis key: ", key);
        console.log("thisis iv: ", iv);

    if (!key|| !iv) {
      throw new Error("AES_KEY 또는 AES_IV 환경변수가 정의되지 않았습니다.");
    }
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return encrypted.toString(); // Base64 문자열
  };

 const handleLogin = async () => {
    setIsSubmitted(true); 

    if (userId.length < 8 || pw.length < 8) {
    setError("ID와 PW는 8자 이상이어야 합니다.");
    return;
  }


  if (!userId || !pw) {
    setError("ID 또는 PW를 입력해주세요");
    return;
  }

  try {
    const encryptedId = encryptAES(userId);
    const encryptedPw = encryptAES(pw);

    const { tokenMsg, accessToken } = await window.electronAPI.loginUser(
      encryptedId,
      encryptedPw
    );
    

    if (!tokenMsg) {
      setError("로그인 실패: 계정 정보를 확인하세요.");
      setSuccess("");
    // } else if (!accessToken) {
    //   setError("Access Token이 존재하지 않습니다.");
    //   setSuccess("");
    } else {
      // setUserId(userId); // 실제 userId 저장 (암호화된 값 아님)
        setSuccess("로그인 성공"); 
        setError("");

        setLoginInfo({ isLoggedIn: true, userId }); ;
    }
  } catch (error) {
    console.error("로그인 중 오류 발생:", error);
    setError("로그인 중 오류가 발생했습니다.");
    setSuccess("");
  } finally {
    setIsSubmitted(false);
  }
  console.log("에러:", error, "성공:", success);

};
const handleLogout = async () => {
  try {
    await window.electronAPI.logoutUser(); // payload.js에서 user-logout 호출
    setLoginInfo({ isLoggedIn: false, userId: null }); // 상태 초기화
    setModalState(null); // 모달 닫기
  } catch (err) {
    console.error("로그아웃 중 오류 발생:", err);
  }
};


  const handleJoin = async() => {
      setIsSubmitted(true); 
    if (userId.length < 8 || pw.length < 8) {
      setError("ID와 PW는 8자 이상이어야 합니다.");
      return;
    }

    if (!userId || !pw) {
    setError("ID 또는 PW를 입력해주세요");
    return;
  }

  try {
    const encryptedId = encryptAES(userId);
    const encryptedPw = encryptAES(pw);
    const { joinResultMsg } = await window.electronAPI.registerUser(encryptedId, encryptedPw);

    if (joinResultMsg === "success") {
      setSuccess("회원가입 성공"); 
      setModalState(null);
      setError("");
    } else if (joinResultMsg === "duplication") {
      setError("이미 존재하는 ID입니다.");
      setSuccess("");
    } else {
      setError("회원가입에 실패했습니다. 다시 시도해주세요.");
      setSuccess("");
    }
  } catch (err) {
    console.error("회원가입 중 에러:", err);
    setError("알 수 없는 오류가 발생했습니다.");
    setSuccess("");
  }
  
    setUserId(userId); // ID 반영
    setPw(pw);
    setModalState(null);  //PW 반영
  }
  

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
      <img
        src="/avatar.svg" 
        alt="User Avatar"
        className="ml-3 w-[5.3rem] h-[5.3rem]  cursor-pointer object-cover"
        onClick={() => {
          // 모달이 꺼진 상태일 때만 동작
          setModalState((prev) => {
            if (prev !== null) return null; // toggle off

            if (loginInfo.isLoggedIn && loginInfo.userId) {
              return "loggedIn";
            }

            return "menu";
          });
        }}
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
                  ref={joinBtnRef}
                  disabled={isSubmitted}
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
                    maxLength={20}
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
                      maxLength={20}
                      onChange={(e) => handlePwChange(e.target.value)}
                      className="!w-[8.3rem] px-2 py-1 ml-[0.2rem] rounded-md bg-gray-100 text-gray-800"
                    />

                  </div>
                </label>
              </div>
               
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
                    {isSubmitted && (error || success) && (
                      <div className={twMerge(
                        "text-center text-[0.9rem] mt-[1rem] !font-inter font-[var(--font-rg)] leading-normal",
                        error ? "text-[var(--red)]" : "!text-blue-200"
                      )}>
                        {error || success}
                      </div>
                    )}

                  </div>

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
                ref={loginBtnRef}
                disabled={isSubmitted}
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
                  w-[1.]
                  pb-[0.8rem]    
                  h-auto
                ">
                  User
              </div>
              <hr className="mb-2" />
              <div className="py-[1.9rem] pl-[2rem]">
                <div 
                  className="
                      text-[var(--blue-200)]
                      !font-pretendard
                      text-[1.4rem]
                      not-italic
                      font-[var(--font-md)]
                      leading-normal
                      pb-[0.4rem]
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
                "
                onClick={()=>console.log("loginInfo.userId: ",loginInfo.userId)}
                >    
                    {loginInfo.userId}
                </div>

              </div>
                <div
                  className="flex justify-center text-center 
                             text-[1.1rem] font-[var(--font-rg)] leading-normal 
                             text-[var(--red)] underline cursor-pointer pb-[1.6rem]"
                  onClick={handleLogout}
                 >
                   Logout
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
                    maxLength={20}
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
                    maxLength={20}
                    onChange={(e) => setPw(e.target.value)}             
                    className="!w-[8.3rem] ml-2 px-2 py-1 ml-[0.2rem] rounded-md bg-gray-100 text-gray-800 flex-1"
                  />
                </label>
              </div>
                  {isSubmitted && (error || success) && (
                    <div
                      className={twMerge(
                        "text-center text-[0.9rem] mt-[1rem] !font-inter font-[var(--font-rg)] leading-normal",
                        error ? "text-[var(--red)]" : "!text-blue-200"
                      )}
                    >
                          {error || success}
                    

                  </div>
                 )} 
              <button
                   className={twMerge(
                    "text-[var(--blue-200)] text-center !font-pretendard text-[1.1rem] font-[var(--font-rg)] leading-normal  underline text-center justify-center  flex  w-full text-center  pt-[1.3rem]",        
                    isSubmitted && error ? "text-gray-400" : "text-[var(--blue-200)]"
                  )}
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
export default LoginModal;