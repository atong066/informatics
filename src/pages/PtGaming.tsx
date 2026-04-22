function PtGaming() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <iframe
        title="PT Gaming"
        src="https://ptgaming.ph"
        className="h-full w-full border-0"
        allow="autoplay; clipboard-read; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </main>
  );
}

export default PtGaming;
