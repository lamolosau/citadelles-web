import React from "react";
import { DISTRICTS, getCardDesc } from "../data/constants";

const DistrictCard = ({
  id,
  small,
  onClick,
  disabled,
  destroyable,
  setTooltip,
}) => {
  const c = DISTRICTS.find((d) => d.id == id);
  if (!c) return null;

  let colors = {
    border: "border-purple-500",
    bg: "bg-purple-950",
    text: "text-purple-300",
  };
  if (c.color === "yellow")
    colors = {
      border: "border-amber-500",
      bg: "bg-amber-950",
      text: "text-amber-300",
    };
  if (c.color === "blue")
    colors = {
      border: "border-sky-600",
      bg: "bg-sky-950",
      text: "text-sky-300",
    };
  if (c.color === "green")
    colors = {
      border: "border-emerald-600",
      bg: "bg-emerald-950",
      text: "text-emerald-300",
    };
  if (c.color === "red")
    colors = {
      border: "border-red-600",
      bg: "bg-red-950",
      text: "text-red-300",
    };

  const handleEnter = (e) =>
    setTooltip &&
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      name: c.name,
      cost: c.cost,
      desc: getCardDesc(c),
      color: c.color,
    });
  const handleLeave = () => setTooltip && setTooltip(null);
  const handleMove = (e) =>
    setTooltip &&
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );

  return (
    <div
      onClick={!disabled ? onClick : null}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      className={`relative flex flex-col border-[3px] rounded-lg overflow-hidden transition-all duration-300
            ${small ? "w-10 h-14 text-[6px]" : "w-32 h-52 text-xs"} ${colors.border}
            ${disabled ? "cursor-default" : "cursor-pointer card-shadow hover:-translate-y-6 hover:scale-110 hover:z-50"}
            ${destroyable ? "animate-pulse cursor-crosshair ring-4 ring-red-600" : ""}
            bg-gradient-to-br from-stone-800 to-stone-950`}
    >
      <div
        className={`p-1 flex justify-between items-center ${colors.bg} border-b ${colors.border}`}
      >
        <div
          className={`rounded-full border ${colors.border} bg-stone-900 flex items-center justify-center font-bold ${small ? "w-3 h-3" : "w-6 h-6"} ${colors.text}`}
        >
          {c.cost}
        </div>
      </div>
      <div className="flex-1 relative opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent to-black">
        <div
          className={`absolute inset-2 border border-dashed ${colors.border} rounded opacity-50`}
        ></div>
      </div>
      <div
        className={`p-1 text-center font-bold uppercase tracking-tighter ${colors.bg} border-t ${colors.border} ${colors.text} leading-tight truncate`}
      >
        {c.name}
      </div>
      {destroyable && (
        <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center font-black text-red-100 text-sm">
          CIBLER
        </div>
      )}
    </div>
  );
};

export default DistrictCard;
