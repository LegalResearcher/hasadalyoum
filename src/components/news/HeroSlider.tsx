import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SlideItem {
  id: number;
  title: string;
  category: string;
  image: string;
  slug: string;
}

const slides: SlideItem[] = [
  {
    id: 1,
    title: "مسقط تكثف جهود الوساطة لإنهاء توتر اليمن: هل تنجح عمان في منع عودة الحرب",
    category: "اليمن في الصحافة",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=600&fit=crop",
    slug: "oman-mediation",
  },
  {
    id: 2,
    title: "جامعة عدن تؤكد أن الحكم الابتدائي في قضية زين السقاف غير نهائي وستطعن",
    category: "أخبار عدن",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=600&fit=crop",
    slug: "aden-university",
  },
  {
    id: 3,
    title: "مجموعة هائل سعيد أنعم تفتتح أكبر سوبر ماركت في عدن وتلقى إشادات واسعة",
    category: "أخبار وتقارير",
    image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=600&fit=crop",
    slug: "supermarket-opening",
  },
  {
    id: 4,
    title: "البنك المركزي يعلن عن إجراءات جديدة لضبط سوق الصرف",
    category: "اقتصاد",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=600&fit=crop",
    slug: "central-bank",
  },
  {
    id: 5,
    title: "انطلاق بطولة كرة القدم للناشئين في العاصمة عدن",
    category: "رياضة",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=600&fit=crop",
    slug: "football-championship",
  },
];

const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-lg">
      {slides.map((slide, index) => (
        <Link
          key={slide.id}
          to={`/article/${slide.slug}`}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 right-0 left-0 p-8">
            <span className="inline-block bg-category text-primary-foreground px-3 py-1 rounded text-sm font-medium mb-3">
              {slide.category}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground leading-relaxed text-shadow">
              {slide.title}
            </h2>
          </div>
        </Link>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 text-primary-foreground flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 text-primary-foreground flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              index === currentSlide ? "bg-accent" : "bg-primary-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
