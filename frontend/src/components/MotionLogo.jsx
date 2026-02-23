// src/components/MotionLogo.jsx
import React from "react";

export default function MotionLogo({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cyphire — go to home"
      className="inline-flex items-center"
    >
      <span className="text-xl sm:text-4xl lg:text-[26px] font-bold cursor-pointer transition-colors duration-200 whitespace-nowrap text-blue-600 tracking-tight">
        Cyphire
      </span>
    </button>
  );
}
