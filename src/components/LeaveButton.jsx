import React from "react";

const LeaveButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute top-4 left-4 z-50 bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-600 w-10 h-10 flex items-center justify-center rounded-full font-bold shadow-lg transition-transform active:scale-95"
    title="Quitter la partie"
  >
    ✕
  </button>
);

export default LeaveButton;
