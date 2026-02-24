import { memo } from "react";

const LoadingScreen = memo(() => {
  return (
    <div className="fixed inset-0 z-[50000] flex flex-col items-center justify-center bg-[url('/background.png')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative z-10 w-24 h-24 border-4 border-amber-500 border-t-transparent border-b-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(245,158,11,0.3)]"></div>
    </div>
  );
});

export default LoadingScreen;
