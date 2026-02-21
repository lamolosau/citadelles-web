// ==========================================
// COMPOSANT : LoadingScreen
// ==========================================

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[50000] flex flex-col items-center justify-center bg-[url('/background.png')] bg-cover bg-center">
      {/* Filtre sombre pour rendre l'anneau bien visible */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

      {/* Anneau doré de chargement (sans aucun texte !) */}
      <div className="relative z-10 w-24 h-24 border-4 border-amber-500 border-t-transparent border-b-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(245,158,11,0.3)]"></div>
    </div>
  );
};

export default LoadingScreen;
