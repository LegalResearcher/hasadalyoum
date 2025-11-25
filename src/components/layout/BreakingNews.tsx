const breakingNews = [
  "مصدر مسؤول في كهرباء عدن: وصول شحنة وقود جديدة إلى ميناء الزيت وتشغيل محطة الرئيس خلال ساعات",
  "البنك المركزي يُصدر تعميماً هاماً لشركات الصرافة لضبط أسعار الصرف",
  "قوات الأمن تحبط محاولة تهريب في المنفذ الشمالي للعاصمة",
];

const BreakingNews = () => {
  return (
    <div className="bg-ticker py-2 border-b border-border overflow-hidden">
      <div className="container flex items-center gap-4">
        <span className="bg-breaking text-primary-foreground px-3 py-1 rounded text-sm font-bold whitespace-nowrap flex-shrink-0">
          عاجـل
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap flex gap-8">
            {breakingNews.map((news, index) => (
              <span key={index} className="text-ticker-foreground">
                {news}
                {index < breakingNews.length - 1 && (
                  <span className="mx-4 text-muted-foreground">|</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakingNews;
