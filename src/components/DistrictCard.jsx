import { getCardDesc } from "../data/gameData";
import { DISTRICT_MAP } from "../utils/gameLogic";

const COLOR_THEMES = {
  yellow: {
    border: "border-amber-500",
    bg: "bg-amber-950",
    text: "text-amber-300",
  },
  blue: { border: "border-sky-600", bg: "bg-sky-950", text: "text-sky-300" },
  green: {
    border: "border-emerald-600",
    bg: "bg-emerald-950",
    text: "text-emerald-300",
  },
  red: { border: "border-red-600", bg: "bg-red-950", text: "text-red-300" },
  default: {
    border: "border-purple-500",
    bg: "bg-purple-950",
    text: "text-purple-300",
  },
};

const DistrictCard = ({
  id,
  small,
  onClick,
  disabled,
  destroyable,
  setTooltip,
}) => {
  const c = DISTRICT_MAP[id];
  if (!c) return null;

  const colors = COLOR_THEMES[c.color] || COLOR_THEMES.default;

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
      onClick={!disabled ? onClick : undefined}
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
