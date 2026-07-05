import { useQuery } from "@tanstack/react-query";
import SectionHeader from "@/components/news/SectionHeader";
import currencyGoldDefault from "@/assets/currency-gold-default.png.asset.json";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// أسعار افتراضية استرشادية (بالريال اليمني) — تُستخدم في حال فشل جلب الأسعار الحية
const FALLBACK_CURRENCIES: Row[] = [
  { code: "USD", name: "دولار أمريكي", buy: 530, sell: 535 },
  { code: "SAR", name: "ريال سعودي",   buy: 141, sell: 142.5 },
  { code: "EUR", name: "يورو",         buy: 575, sell: 580 },
  { code: "AED", name: "درهم إماراتي", buy: 144, sell: 145.5 },
  { code: "GBP", name: "جنيه إسترليني",buy: 670, sell: 675 },
];

const FALLBACK_GOLD: Row[] = [
  { code: "G24", name: "ذهب عيار 24", buy: 62500, sell: 63000 },
  { code: "G22", name: "ذهب عيار 22", buy: 57200, sell: 57700 },
  { code: "G21", name: "ذهب عيار 21", buy: 54700, sell: 55200 },
  { code: "G18", name: "ذهب عيار 18", buy: 46900, sell: 47300 },
];

type Row = {
  code: string;
  name: string;
  buy: number;
  sell: number;
  change?: number;
};

const formatNum = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);

const ChangeIcon = ({ change }: { change?: number }) => {
  if (change === undefined || change === 0)
    return <Minus className="inline w-4 h-4 text-muted-foreground" />;
  if (change > 0)
    return <TrendingUp className="inline w-4 h-4 text-green-600" />;
  return <TrendingDown className="inline w-4 h-4 text-red-600" />;
};

const PriceTable = ({ title, rows }: { title: string; rows: Row[] }) => (
  <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
    <div className="bg-primary text-primary-foreground px-4 py-2 font-bold">
      {title}
    </div>
    <table className="w-full text-sm">
      <thead className="bg-muted/50 text-muted-foreground">
        <tr>
          <th className="text-right py-2 px-3 font-semibold">العملة</th>
          <th className="text-center py-2 px-3 font-semibold">شراء</th>
          <th className="text-center py-2 px-3 font-semibold">بيع</th>
          <th className="text-center py-2 px-3 font-semibold">التغيير</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.code} className="border-t border-border hover:bg-muted/30 transition-colors">
            <td className="py-2 px-3 font-medium">{r.name}</td>
            <td className="text-center py-2 px-3">{formatNum(r.buy)}</td>
            <td className="text-center py-2 px-3">{formatNum(r.sell)}</td>
            <td className="text-center py-2 px-3">
              <ChangeIcon change={r.change} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CurrencyGoldPrices = () => {
  // محاولة جلب الأسعار من مصدر مجاني — يرجع إلى الأسعار الافتراضية عند الفشل
  const { data } = useQuery({
    queryKey: ["currency-gold-prices"],
    queryFn: async () => {
      try {
        const res = await fetch(
          "https://open.er-api.com/v6/latest/USD"
        );
        if (!res.ok) throw new Error("rates fetch failed");
        const json = await res.json();
        const rates = json?.rates || {};
        const yer = rates.YER;
        if (!yer) throw new Error("no YER rate");

        const toYer = (code: string) => {
          const r = rates[code];
          if (!r) return null;
          return yer / r;
        };

        const currencies: Row[] = [
          { code: "USD", name: "دولار أمريكي", buy: yer,               sell: yer * 1.01 },
          { code: "SAR", name: "ريال سعودي",   buy: toYer("SAR") ?? 0, sell: (toYer("SAR") ?? 0) * 1.01 },
          { code: "EUR", name: "يورو",         buy: toYer("EUR") ?? 0, sell: (toYer("EUR") ?? 0) * 1.01 },
          { code: "AED", name: "درهم إماراتي", buy: toYer("AED") ?? 0, sell: (toYer("AED") ?? 0) * 1.01 },
          { code: "GBP", name: "جنيه إسترليني", buy: toYer("GBP") ?? 0, sell: (toYer("GBP") ?? 0) * 1.01 },
        ].filter((r) => r.buy > 0);

        return { currencies, gold: FALLBACK_GOLD };
      } catch {
        return { currencies: FALLBACK_CURRENCIES, gold: FALLBACK_GOLD };
      }
    },
    staleTime: 1000 * 60 * 30,
  });

  const currencies = data?.currencies ?? FALLBACK_CURRENCIES;
  const gold = data?.gold ?? FALLBACK_GOLD;

  return (
    <section className="mb-10">
      <SectionHeader title="أسعار العملات والذهب" />

      {/* البانر الافتراضي */}
      <div className="mb-6 rounded-lg overflow-hidden border border-border shadow-sm">
        <img
          src={currencyGoldDefault.url}
          alt="أسعار العملات والذهب — حصاد اليوم"
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PriceTable title="العملات مقابل الريال اليمني" rows={currencies} />
        <PriceTable title="أسعار الذهب (جرام / ريال يمني)" rows={gold} />
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        * الأسعار استرشادية وتحدَّث دورياً — قد تختلف عن الأسعار الفعلية في محلات الصرافة.
      </p>
    </section>
  );
};

export default CurrencyGoldPrices;