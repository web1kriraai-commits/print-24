import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { useInactivitySlider } from "../hooks/useInactivitySlider";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  FileText,
  Sticker,
  Mail,
  Image as ImageIcon,
  Printer,
  ArrowRight,
  BadgeCheck,
  UserPlus,
  Compass,
  Zap,
  Shield,
  Star,
  Filter,
  X,
  Edit3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ServiceItem } from "../types";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";

interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  type?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Icon mapping based on category names
const getCategoryIcon = (categoryName: string) => {
  const iconMap: { [key: string]: any } = {
    "Visiting Cards": CreditCard,
    "Flyers & Brochures": FileText,
    "Stickers & Labels": Sticker,
    Banners: ImageIcon,
    Invitations: Mail,
  };
  return iconMap[categoryName] || FileText;
};

const services: ServiceItem[] = [
  {
    id: "cards",
    title: "Visiting Cards",
    description: "Premium matte, gloss, and textured business cards.",
    icon: CreditCard,
  },
  {
    id: "flyers",
    title: "Flyers & Brochures",
    description: "High-quality marketing materials for your business.",
    icon: FileText,
  },
  {
    id: "idcards",
    title: "ID Cards",
    description: "Durable employee and student identification cards.",
    icon: BadgeCheck,
  },
  {
    id: "letterhead",
    title: "Letterhead",
    description: "Professional official stationary.",
    icon: FileText,
  },
  {
    id: "stickers",
    title: "Stickers",
    description: "Custom shapes and sizes for branding.",
    icon: Sticker,
  },
  {
    id: "invites",
    title: "Invitations",
    description: "Elegant cards for weddings and events.",
    icon: Mail,
  },
  {
    id: "banners",
    title: "Flex & Banners",
    description: "Large format printing for maximum visibility.",
    icon: ImageIcon,
  },
  {
    id: "more",
    title: "Digital Printing",
    description: "Custom solutions for all your printing needs.",
    icon: Printer,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

// Hero Slider Images
const heroSlides = [
  {
    id: 1,
    image: "/banner.jpg",
    alt: "Prints 24 Banner",
  },
];

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get number of visible items based on screen width
const getVisibleItems = (screenWidth: number): number => {
  if (screenWidth >= 1536) return 7; // 2xl: 7 items
  if (screenWidth >= 1280) return 6; // xl: 6 items
  if (screenWidth >= 1024) return 5; // lg: 5 items
  if (screenWidth >= 768) return 4; // md: 4 items
  if (screenWidth >= 640) return 3; // sm: 3 items
  return 2; // mobile: 2 items
};

const Home: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string>("newest");
  const [showMoreReviews, setShowMoreReviews] = useState(false);
  const [viewAllReviews, setViewAllReviews] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set()
  );
  
  // Client-only flag for SSR hydration safety
  const isClient = useClientOnly();

  // Auto-rotate slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const BASE_URL = API_BASE_URL_WITH_API;
        const headers = {
          Accept: "application/json",
        };

        // Fetch Digital Categories
        const digitalResponse = await fetch(`${BASE_URL}/categories/digital`, {
          method: "GET",
          headers,
        });

        const digitalText = await digitalResponse.text();
        if (
          digitalText.trim().startsWith("<!DOCTYPE") ||
          digitalText.trim().startsWith("<html")
        ) {
        }

        if (!digitalResponse.ok) {
          throw new Error(`HTTP ${digitalResponse.status}`);
        }

        const digitalData = JSON.parse(digitalText);

        // Fetch Bulk Categories
        const bulkResponse = await fetch(`${BASE_URL}/categories/bulk`, {
          method: "GET",
          headers,
        });

        const bulkText = await bulkResponse.text();
        if (
          bulkText.trim().startsWith("<!DOCTYPE") ||
          bulkText.trim().startsWith("<html")
        ) {
        }

        if (!bulkResponse.ok) {
          throw new Error(`HTTP ${bulkResponse.status}`);
        }

        const bulkData = JSON.parse(bulkText);

        // Get all digital and bulk categories
        const digitalCategories = digitalData.map((cat: Category) => ({
          ...cat,
          type: "digital",
        }));
        const bulkCategories = bulkData.map((cat: Category) => ({
          ...cat,
          type: "bulk",
        }));

        // Sort each type by sortOrder, then combine
        digitalCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        bulkCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        // Combine all categories (digital first, then bulk, both sorted by sortOrder)
        setCategories([...digitalCategories, ...bulkCategories]);
      } catch (err) {
        console.error("Fetch categories error:", err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Check if user is logged in (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const BASE_URL = API_BASE_URL_WITH_API;
        const headers = {
          Accept: "application/json",
        };

        const response = await fetch(`${BASE_URL}/reviews`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setReviews(data);
      } catch (err) {
        console.error("Fetch reviews error:", err);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, []);

  // Filter and sort reviews
  // Auto-scroll categories after 5 seconds of no user interaction
  useEffect(() => {
    if (loadingCategories || categories.length === 0) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let isScrolling = false;
    let lastInteractionTime = Date.now();
    let arrowButtonClicked = false;

    const performScroll = () => {
      const scrollContainer = document.getElementById("category-scroll-container");
      if (!scrollContainer) return;

      isScrolling = true;
      const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      const currentScroll = scrollContainer.scrollLeft;
      
      // Calculate width of 1 item based on screen size
      const screenWidth = window.innerWidth;
      let oneItemWidth = screenWidth / 2; // mobile: 1 item = 50% of screen
      if (screenWidth >= 1280) oneItemWidth = screenWidth * 0.2; // xl: 1 item = 20%
      else if (screenWidth >= 1024) oneItemWidth = screenWidth * 0.25; // lg: 1 item = 25%
      else if (screenWidth >= 768) oneItemWidth = screenWidth * 0.333; // md: 1 item = 33.3%
      else if (screenWidth >= 640) oneItemWidth = screenWidth / 2; // sm: 1 item = 50%
      
      if (currentScroll >= maxScroll - 10) {
        scrollContainer.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const newScrollLeft = currentScroll + oneItemWidth;
        if (newScrollLeft >= maxScroll) {
          scrollContainer.scrollTo({ left: maxScroll, behavior: "smooth" });
        } else {
          // Slower scroll animation
          scrollContainer.style.scrollBehavior = 'smooth';
          scrollContainer.style.transition = 'scroll-left 0.8s ease-in-out';
          scrollContainer.scrollTo({ left: newScrollLeft, behavior: "smooth" });
        }
      }
      
      // After scroll completes, wait another 6 seconds
      setTimeout(() => {
        isScrolling = false;
        lastInteractionTime = Date.now();
        arrowButtonClicked = false;
        startAutoScroll();
      }, 1000);
    };

    const startAutoScroll = () => {
      if (isScrolling) return;
      
      const timeoutDuration = arrowButtonClicked ? 20000 : 10000; // 10 seconds of inactivity
      const timeSinceInteraction = Date.now() - lastInteractionTime;
      const remainingTime = Math.max(0, timeoutDuration - timeSinceInteraction);
      
      timeoutId = setTimeout(() => {
        // Double check that the required time has passed since last interaction
        const timeSinceLastInteraction = Date.now() - lastInteractionTime;
        const requiredTime = arrowButtonClicked ? 20000 : 10000; // 10 seconds of inactivity
        if (timeSinceLastInteraction >= requiredTime) {
          performScroll();
        } else {
          // If interaction happened during timeout, restart with remaining time
          isScrolling = false;
          startAutoScroll();
        }
      }, remainingTime);
    };

    const updateInteraction = () => {
      lastInteractionTime = Date.now();
      arrowButtonClicked = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isScrolling = false;
      startAutoScroll();
    };

    const updateInteractionFromArrow = () => {
      lastInteractionTime = Date.now();
      arrowButtonClicked = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isScrolling = false;
      startAutoScroll();
    };

    // Store function in window for button access
    (window as any).homeCategoryUpdateFromArrow = updateInteractionFromArrow;

    // Add event listeners for user interactions (stops auto-slide on any movement)
    const handleMouseMove = () => updateInteraction();
    const handleMouseEnter = () => updateInteraction();
    const handleClick = () => updateInteraction();
    const handleMouseDown = () => updateInteraction();
    const handleKeyDown = () => updateInteraction();
    const handleTouchStart = () => updateInteraction();
    const handleWheel = () => updateInteraction();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('wheel', handleWheel);
    
    const container = document.getElementById("category-scroll-container");
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
    }

    // Start the auto-scroll timer (wait 5 seconds from now)
    lastInteractionTime = Date.now();
    startAutoScroll();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('wheel', handleWheel);
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, [loadingCategories, categories.length]);

  const filteredReviews = reviews.filter((review) => {
    if (filterRating && review.rating !== filterRating) {
      return false;
    }
    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (filterDate === "newest") {
      return dateB - dateA;
    } else if (filterDate === "oldest") {
      return dateA - dateB;
    }
    return dateB - dateA;
  });

  const displayedReviews = viewAllReviews
    ? sortedReviews
    : showMoreReviews
    ? sortedReviews
    : sortedReviews.slice(0, 6);

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

  return (
    <div className="w-full overflow-hidden">
      {/* Hero Section - Smaller Slider with Top Margin */}
      <section className="relative mt-2 sm:mt-4 h-[35vh] sm:h-[40vh] min-h-[290px] sm:min-h-[430px] max-h-[390px] sm:max-h-[530px] w-full overflow-hidden bg-cream-900 rounded-xl sm:rounded-2xl mx-2 sm:mx-4">
        {/* Background Image Slider */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img
              src={heroSlides[currentSlide].image}
              alt={heroSlides[currentSlide].alt}
              className="w-full h-full object-cover"
            />
            {/* Dark Overlay for text readability */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
          </motion.div>
        </AnimatePresence>

        {/* Hero Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl"
          >
            {/* Welcome Text */}
            <div className="inline-block py-2 px-4 sm:py-3 sm:px-8 rounded-full bg-cream-50/100 backdrop-blur-md border border-white/20 mb-4 sm:mb-8">
              <span className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 uppercase tracking-wider">
                WELCOME TO PRINTS 24
              </span>
            </div>

            {/* Smaller Premium Printing Text */}
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6 leading-tight drop-shadow-lg px-2">
              Premium Printing <br />
              <span className="text-cream-300 italic">Simplified</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-cream-100 mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-md px-2">
              India's easiest and fastest printing platform. Design your
              personality and receive premium prints delivered right to your
              desk.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-5 px-4">
              <Link
                to="/signup"
                className="bg-cream-50 text-cream-900 px-6 py-3 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-bold hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 w-full sm:min-w-[200px]"
              >
                <UserPlus size={18} className="sm:w-5 sm:h-5" /> Sign Up Now
              </Link>
              <Link
                to="/digital-print"
                className="bg-cream-50 text-cream-900 px-6 py-3 sm:px-8 sm:py-4 rounded-full text-base sm:text-lg font-bold hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 w-full sm:min-w-[200px]"
              >
                <Compass size={18} className="sm:w-5 sm:h-5" /> Explore Products
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section className="pt-2 sm:pt-4 pb-6 sm:pb-8 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-2 sm:mb-4">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-cream-900 mb-3 sm:mb-4">
              Our Products
            </h2>
            <p className="text-sm sm:text-base text-cream-600 max-w-xl mx-auto mb-2 sm:mb-3">
              Select from our wide range of premium printed products specially
              crafted for you
            </p>
          </div>

          {/* Featured Categories - Infinite Slider with Left/Right Buttons */}
          {!loadingCategories && categories.length > 0 && (
            <div className="mb-12">
              <div 
                className="relative group/slider overflow-hidden"
                onMouseEnter={() => {
                  (window as any).categoryLastInteraction = Date.now();
                }}
                onMouseLeave={() => {
                  (window as any).categoryLastInteraction = Date.now();
                }}
              >
                {/* Left Arrow Button - Scroll left to show items from left */}
                <button
                  onClick={() => {
                    const container = document.getElementById("category-scroll-container");
                    if (container) {
                      const screenWidth = window.innerWidth;
                      const visibleItems = getVisibleItems(screenWidth);
                      const itemWidth = screenWidth / visibleItems;
                      
                      const currentScroll = container.scrollLeft;
                      
                      if (currentScroll <= 0) {
                        // If at the start, wrap to the end
                        container.scrollTo({ left: container.scrollWidth - container.clientWidth, behavior: "smooth" });
                      } else {
                        // Scroll left by 1 item
                        container.scrollTo({ left: currentScroll - itemWidth, behavior: "smooth" });
                      }
                    }
                    if ((window as any).homeCategoryUpdateFromArrow) {
                      (window as any).homeCategoryUpdateFromArrow();
                    }
                  }}
                  className="absolute left-2 sm:left-3 md:left-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-cream-900 hover:text-cream-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                  style={{ top: 'calc(50% - 1rem)' }}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>

                {/* Right Arrow Button - Scroll right to show items from right */}
                <button
                  onClick={() => {
                    const container = document.getElementById("category-scroll-container");
                    if (container) {
                      const screenWidth = window.innerWidth;
                      const visibleItems = getVisibleItems(screenWidth);
                      const itemWidth = screenWidth / visibleItems;
                      
                      const currentScroll = container.scrollLeft;
                      const maxScroll = container.scrollWidth - container.clientWidth;
                      const newScrollLeft = currentScroll + itemWidth;
                      
                      // Check if we're already at or very close to the end
                      if (currentScroll >= maxScroll - 1) {
                        // If at the end, wrap to the start
                        container.scrollTo({ left: 0, behavior: "smooth" });
                      } else if (newScrollLeft >= maxScroll) {
                        // If the new scroll would go past the end, scroll to the maximum to show last item
                        container.scrollTo({ left: maxScroll, behavior: "smooth" });
                      } else {
                        // Scroll right by 1 item
                        container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
                      }
                    }
                    if ((window as any).homeCategoryUpdateFromArrow) {
                      (window as any).homeCategoryUpdateFromArrow();
                    }
                  }}
                  className="absolute right-2 sm:right-3 md:right-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-cream-900 hover:text-cream-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                  style={{ top: 'calc(50% - 1rem)' }}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>

                <div 
                  id="category-scroll-container"
                  className="flex overflow-x-auto overflow-y-hidden pb-2 sm:pb-3 md:pb-4 snap-x snap-mandatory scroll-smooth touch-pan-x"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none', 
                    scrollBehavior: 'smooth'
                  }}
                >
                  {categories.map((category, index) => (
                    <motion.div
                      key={category._id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex-shrink-0 snap-start transition-all duration-500 ease-in-out w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6 2xl:w-[14.285%] px-0.5 sm:px-1 md:px-1"
                    >
                      <Link to={`/digital-print/${category._id}`} className="block">
                        <div className="group flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-2.5 rounded-lg transition-all duration-300 relative">
                          {/* Type Badge - Shows on hover, positioned outside circle */}
                          {category.type && (
                            <div 
                              className={`absolute top-0 left-1/2 -translate-x-1/2 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 whitespace-nowrap shadow-lg ${
                                category.type === "digital"
                                  ? "bg-[#588157] text-white"
                                  : "bg-[#003049] text-white"
                              }`}
                            >
                              {category.type === "digital" ? "Digital Print" : "Bulk Print"}
                            </div>
                          )}
                          {/* Reduced circle sizes for better mobile compatibility */}
                          <div className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-full overflow-hidden bg-white transition-all duration-300 shadow-sm sm:shadow-md group-hover:shadow-lg group-hover:scale-105 flex items-center justify-center relative ${
                            category.type === "digital" 
                              ? "group-hover:bg-[#f5faf0]" 
                              : "group-hover:bg-[#f5fbff]"
                          }`}>
                            <img
                              src={category.image}
                              alt={category.name}
                              className={`${
                                category.name.toLowerCase().includes('visiting card') 
                                  ? 'w-full h-full object-cover' 
                                  : category.name.toLowerCase().includes('card holder')
                                  ? 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 object-contain'
                                  : 'w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 xl:w-22 xl:h-22 object-contain'
                              }`}
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-cream-900 text-center max-w-[80px] sm:max-w-[100px] md:max-w-[120px] line-clamp-2 leading-tight mt-0.5">
                            {category.name}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="text-center mt-6">
                <Link
                  to="/digital-print"
                  className="inline-flex items-center gap-2 bg-cream-900 text-cream-50 px-8 py-3 rounded-full font-medium hover:bg-cream-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  Explore More
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          )}

          {/* Existing Services Grid */}
          <div className="mt-8">
            <div className="text-center mb-8">
              <h3 className="font-serif text-3xl font-bold text-cream-900 mb-2">
                All Services
              </h3>
            </div>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {services.map((service) => (
                <motion.div key={service.id} variants={itemVariants}>
                  <Link to="/digital-print">
                    <div className="group h-full p-8 bg-cream-50 rounded-2xl hover:bg-cream-900 transition-all duration-300 cursor-pointer relative overflow-hidden border border-cream-100 hover:shadow-2xl">
                      <div className="relative z-10">
                        <div className="w-14 h-14 bg-cream-200 text-cream-900 rounded-xl flex items-center justify-center mb-6 group-hover:bg-cream-800 group-hover:text-cream-50 transition-colors">
                          <service.icon size={28} />
                        </div>
                        <h3 className="font-serif text-xl font-semibold mb-3 text-cream-900 group-hover:text-cream-50 transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-cream-600 text-sm group-hover:text-cream-200 transition-colors">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="pt-8 sm:pt-12 pb-6 sm:pb-8 bg-cream-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-cream-900 mb-3 sm:mb-4">
              Customer Reviews
            </h2>
            <p className="text-sm sm:text-base text-cream-600 max-w-xl mx-auto mb-4 sm:mb-6">
              See what our customers have to say about their experience with
              Prints24.
            </p>

            {/* Statistics */}
            {totalReviews > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-md border border-cream-200">
                  <p className="text-xs sm:text-sm text-cream-600 mb-1">
                    Total Reviews
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-cream-900">
                    {totalReviews}
                  </p>
                </div>
                <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-md border border-cream-200">
                  <p className="text-xs sm:text-sm text-cream-600 mb-1">
                    Average Rating
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={`sm:w-5 sm:h-5 ${
                            star <= Math.round(averageRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-cream-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-cream-900">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border border-cream-200">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                  <Filter size={18} className="sm:w-5 sm:h-5 text-cream-600" />
                  <span className="text-sm sm:text-base font-medium text-cream-900">
                    Filters:
                  </span>
                </div>

                {/* Rating Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="text-xs sm:text-sm text-cream-700 sm:whitespace-nowrap">
                    Rating:
                  </label>
                  <ReviewFilterDropdown
                    label="All Ratings"
                    value={filterRating}
                    onChange={(value) =>
                      setFilterRating(value as number | null)
                    }
                    options={[
                      { value: null, label: "All Ratings" },
                      { value: 5, label: "5 Stars" },
                      { value: 4, label: "4 Stars" },
                      { value: 3, label: "3 Stars" },
                      { value: 2, label: "2 Stars" },
                      { value: 1, label: "1 Star" },
                    ]}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="text-xs sm:text-sm text-cream-700 sm:whitespace-nowrap">
                    Sort by:
                  </label>
                  <ReviewFilterDropdown
                    label="Newest First"
                    value={filterDate}
                    onChange={(value) => setFilterDate(value as string)}
                    options={[
                      { value: "newest", label: "Newest First" },
                      { value: "oldest", label: "Oldest First" },
                    ]}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Clear Filters */}
                {(filterRating || filterDate !== "newest") && (
                  <button
                    onClick={() => {
                      setFilterRating(null);
                      setFilterDate("newest");
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-cream-700 hover:text-cream-900 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    <X size={14} className="sm:w-4 sm:h-4" />
                    Clear Filters
                  </button>
                )}

                {/* Write Review Button (for all users) */}
                <Link
                  to="/reviews"
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-cream-900 text-cream-50 rounded-lg text-sm sm:text-base font-medium hover:bg-cream-800 transition-all shadow-md hover:shadow-lg sm:ml-auto"
                >
                  <Edit3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  Write Review
                </Link>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {loadingReviews ? (
            <div className="text-center py-12">
              <p className="text-cream-600">Loading reviews...</p>
            </div>
          ) : sortedReviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cream-600">
                {filterRating
                  ? `No reviews found with ${filterRating} star rating.`
                  : "No reviews yet. Be the first to review!"}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewAllReviews ? (
                // Line by line layout for all reviews
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="max-w-4xl mx-auto space-y-4"
                >
                  {displayedReviews.map((review, index) => (
                    <motion.div
                      key={review._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                      className="bg-white p-6 rounded-2xl shadow-md border border-cream-100 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-cream-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-cream-900 font-bold text-lg">
                            {review.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-cream-900">
                              {review.userName}
                            </h4>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-cream-300"
                                  }
                                />
                              ))}
                            </div>
                          </div>
                          {(() => {
                            const maxLength = 200;
                            const isExpanded = expandedComments.has(review._id);
                            const isLong = review.comment.length > maxLength;
                            const displayText =
                              isExpanded || !isLong
                                ? review.comment
                                : review.comment.substring(0, maxLength) +
                                  "...";

                            return (
                              <div className="mb-2">
                                <p className="text-cream-700 leading-relaxed">
                                  {displayText}
                                </p>
                                {isLong && (
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(
                                        expandedComments
                                      );
                                      if (isExpanded) {
                                        newExpanded.delete(review._id);
                                      } else {
                                        newExpanded.add(review._id);
                                      }
                                      setExpandedComments(newExpanded);
                                    }}
                                    className="text-cream-900 hover:text-cream-700 text-sm font-medium mt-1 underline"
                                  >
                                    {isExpanded ? "Show Less" : "Show More"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          <p className="text-xs text-cream-500">
                            {new Date(review.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                // Grid layout for initial display
                <motion.div
                  key="grid-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
                >
                  {displayedReviews.map((review, index) => (
                    <motion.div
                      key={review._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                      className="bg-white p-6 rounded-2xl shadow-md border border-cream-100 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-cream-200 rounded-full flex items-center justify-center">
                          <span className="text-cream-900 font-bold text-lg">
                            {review.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-cream-900">
                            {review.userName}
                          </h4>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-cream-300"
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const maxLength = 100;
                        const isLong = review.comment.length > maxLength;
                        const displayText = isLong
                          ? review.comment.substring(0, maxLength) + "..."
                          : review.comment;

                        return (
                          <p className="text-cream-700 leading-relaxed mb-4">
                            {displayText}
                          </p>
                        );
                      })()}
                      <p className="text-xs text-cream-500">
                        {!isClient 
                          ? 'Loading...' 
                          : new Date(review.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                        }
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Show More / Show Less Button */}
          {sortedReviews.length > 6 && !viewAllReviews && (
            <div className="text-center mt-8">
              <button
                onClick={() => setShowMoreReviews(!showMoreReviews)}
                className="inline-flex items-center gap-2 bg-cream-900 text-cream-50 px-6 py-3 rounded-xl font-medium hover:bg-cream-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                {showMoreReviews
                  ? "Show Less"
                  : `Show More (${sortedReviews.length - 6} more)`}
                <ArrowRight
                  size={18}
                  className={`transition-transform ${
                    showMoreReviews ? "rotate-90" : ""
                  }`}
                />
              </button>
            </div>
          )}

          {/* View All Button */}
          {sortedReviews.length > 0 && (
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setViewAllReviews(!viewAllReviews);
                  if (!viewAllReviews) {
                    setShowMoreReviews(false);
                  }
                }}
                className="inline-flex items-center gap-2 bg-cream-900 text-cream-50 px-5 py-2.5 rounded-lg font-medium hover:bg-cream-800 transition-all shadow-md hover:shadow-lg"
              >
                {viewAllReviews ? "Show Less" : "View All"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="pt-8 pb-24 bg-cream-100 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white p-10 md:p-16 rounded-3xl shadow-xl"
            >
              <div className="text-center mb-12">
                <h2 className="font-serif text-3xl font-bold text-cream-900 mb-2">
                  About Prints24
                </h2>
                <div className="w-24 h-1 bg-cream-400 mx-auto rounded-full"></div>
              </div>

              <div className="space-y-8 text-cream-800 leading-relaxed">
                <p className="text-lg">
                  Prints24 is a modern, fast-growing{" "}
                  <span className="font-semibold">
                    Digital & Offset Printing Company
                  </span>
                  , whose aim is to provide Fast, Creative, and High-Quality
                  printing solutions to customers.
                </p>
                <p>
                  We started Prints24 with the idea that today's digital
                  generation should get a platform where they can avail all
                  types of printing services, from small quantities (Short Run)
                  to Bulk Printing, in an easy, fast, and reliable manner.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mt-12">
                  <div className="bg-cream-50 p-6 rounded-xl border border-cream-200">
                    <h3 className="font-serif text-xl font-bold text-cream-900 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-cream-900 text-white rounded-full flex items-center justify-center text-sm">
                        V
                      </span>{" "}
                      Vision
                    </h3>
                    <p className="text-sm">
                      To make Affordable, Stylish, and Premium Quality Printing
                      easily accessible to every individual and every business.
                    </p>
                  </div>
                  <div className="bg-cream-50 p-6 rounded-xl border border-cream-200">
                    <h3 className="font-serif text-xl font-bold text-cream-900 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-cream-900 text-white rounded-full flex items-center justify-center text-sm">
                        M
                      </span>{" "}
                      Mission
                    </h3>
                    <ul className="text-sm space-y-2 list-disc list-inside">
                      <li>
                        To make Modern Printing easy and accessible to everyone.
                      </li>
                      <li>
                        To provide smart solutions with Quick Delivery + High
                        Quality.
                      </li>
                      <li>
                        To make better options available according to every
                        budget.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Upload Teaser Section */}
      <section className="pt-24 pb-8 bg-cream-900 text-cream-50 text-center">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="mb-8 inline-flex items-center justify-center w-16 h-16 bg-cream-800 rounded-full">
              <ArrowRight size={32} className="text-amber-300" />
            </div>
            <h2 className="font-serif text-4xl font-bold mb-6">
              Have a Design Ready?
            </h2>
            <p className="text-xl text-cream-200 max-w-2xl mx-auto mb-10">
              Skip the templates and upload your own artwork. Our automated
              system checks for errors instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-cream-300 mb-10">
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                PDF
              </span>
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                AI
              </span>
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                PSD
              </span>
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                JPG/PNG
              </span>
            </div>
            <Link
              to="/upload"
              className="bg-cream-50 text-cream-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-cream-200 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Upload Now
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
