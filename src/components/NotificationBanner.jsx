import { memo } from "react";

const STYLES = {
  error: "bg-red-900/95 border-red-500 text-red-100",
  success: "bg-green-900/95 border-green-500 text-green-100",
  info: "bg-blue-900/95 border-blue-500 text-blue-100",
  gold: "bg-amber-900/95 border-amber-500 text-amber-100",
  default: "bg-stone-800 border-stone-500 text-stone-200",
};

const NotificationBanner = memo(({ message, type }) => {
  if (!message) return null;
  const style = STYLES[type] || STYLES.default;

  return (
    <div
      className={`fixed top-6 left-1/2 z-[100] px-10 py-4 rounded border-4 shadow-[0_0_20px_rgba(0,0,0,0.8)] text-xl font-bold uppercase tracking-widest text-center toast-anim ${style} min-w-[320px]`}
    >
      {message}
    </div>
  );
});

export default NotificationBanner;
