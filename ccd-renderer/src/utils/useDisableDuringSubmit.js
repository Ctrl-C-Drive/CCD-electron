import { useEffect } from "react";

const useDisableDuringSubmit = (isSubmitting, ref) => {
  useEffect(() => {
    if (!ref?.current) return;

    if (isSubmitting) {
      ref.current.style.pointerEvents = "none";
      ref.current.style.color = "#A0AEC0"; // 회색 텍스트
      ref.current.style.cursor = "not-allowed";
    } else {
      ref.current.style.pointerEvents = "auto";
      ref.current.style.color = ""; // 원래대로
      ref.current.style.cursor = "pointer";
    }
  }, [isSubmitting, ref]);
};

export default useDisableDuringSubmit;
