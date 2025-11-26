import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFeaturedPosts } from "@/hooks/usePosts";

const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data: posts, isLoading } = useFeaturedPosts(10);

  const fallbackSlides = [
    {
      id: "1",
      title: "مرحباً بكم في حصاد اليوم - منبر إعلامي يمني حر ومستقل",
      slug: "#",
      featured_image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200",
      category: { name: "أخبار محلية", slug: "local-news" },
    },
  ];

  const slides = posts && posts.length > 0 ? posts : fallbackSlides;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  if (isLoading) {
    return (
      <div className="relative w-full h-[500px] overflow-hidden rounded-lg bg-muted animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-lg group">
      {slides.map((slide, index) => (
        <Link
          key={slide.id}
          to={slide.slug !== "#" ? `/article/${slide.slug}` : "#"}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          <img
            src={slide.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200"}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 right-0 left-0 p-8">
            {slide.category && (
              <Link
                to={`/category/${slide.category.slug}`}
                className="inline-block bg-accent text-accent-foreground px-3 py-1 rounded text-sm font-medium mb-3 hover:bg-accent/90"
                onClick={(e) => e.stopPropagation()}
              >
                {slide.category.name}
              </Link>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed text-shadow line-clamp-2">
              {slide.title}
            </h2>
          </div>
        </Link>
      ))}

      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                index === currentSlide ? "bg-accent w-6" : "bg-white/50 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroSlider;
