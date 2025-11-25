const LastUpdate = () => {
  const now = new Date();
  const arabicDate = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="bg-card py-2 border-b border-border text-center">
      <span className="text-dateColor font-medium">آخر تحديث:</span>
      <span className="text-foreground mr-2">{arabicDate} – {time}</span>
    </div>
  );
};

export default LastUpdate;
