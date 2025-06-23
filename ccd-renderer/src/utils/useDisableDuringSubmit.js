import { useEffect } from "react";

const useDisableDuringSubmit = (isSubmitting, ref) => {
  useEffect(() => {
    if (!ref?.current) return;

    if (isSubmitting) {
      ref.current.style.pointerEvents = "none";
      ref.current.style.color = "#A0AEC0"; // 회색 텍스트
      ref.current.style.cursor = "not-allowed";
      ref.current.style.paddingBottom = "1.2rem";
      ref.current.style.marginBottom = "1.2rem";
      ref.current.style.bottom = "2rem"; 

    } else {
      ref.current.style.pointerEvents = "auto";
      ref.current.style.color = ""; // 원래대로
      ref.current.style.cursor = "pointer";
      ref.current.style.paddingBottom = "";
    }
  }, [isSubmitting, ref]);
};

export default useDisableDuringSubmit;
