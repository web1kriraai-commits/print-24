import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BackButton from "../components/BackButton";
import { Star, Send, Filter, X } from "lucide-react";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";
import { scrollToInvalidField } from "../lib/validationUtils";

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

const Reviews: React.FC = () => {
  const navigate = useNavigate();
  const isClient = useClientOnly();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "", userName: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string>("newest"); // "newest", "oldest", "highestRating", "lowestRating"
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!token);
    // If logged in, pre-fill the name from user data
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setReviewForm(prev => ({ ...prev, userName: userData.name || "" }));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
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

  // Submit review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form with auto-scroll
    const validationErrors: string[] = [];
    
    if (!reviewForm.userName.trim()) {
      validationErrors.push("Please enter your name");
      scrollToInvalidField("userName", "userName");
    }

    if (!reviewForm.comment.trim()) {
      validationErrors.push("Please enter a comment");
      if (validationErrors.length === 1) {
        scrollToInvalidField("comment", "comment");
      }
    }

    if (validationErrors.length > 0) {
      setSubmitMessage({ type: "error", text: validationErrors.join(". ") });
      setTimeout(() => setSubmitMessage({ type: null, text: "" }), 5000);
      return;
    }

    try {
      setSubmittingReview(true);
      setSubmitMessage({ type: null, text: "" });
      const BASE_URL = API_BASE_URL_WITH_API;
      const token = localStorage.getItem("token");

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header only if user is logged in
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          userName: reviewForm.userName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit review");
      }

      const newReview = await response.json();
      setReviews([newReview.review, ...reviews]);
      setReviewForm({ rating: 5, comment: "", userName: isLoggedIn ? reviewForm.userName : "" });
      setSubmitMessage({ type: "success", text: "Review submitted successfully!" });
      setTimeout(() => setSubmitMessage({ type: null, text: "" }), 3000);
    } catch (err) {
      console.error("Submit review error:", err);
      setSubmitMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to submit review" });
      setTimeout(() => setSubmitMessage({ type: null, text: "" }), 3000);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    if (filterRating && review.rating !== filterRating) {
      return false;
    }
    return true;
  });

  // Sort reviews by date or rating
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (filterDate === "highestRating") {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (filterDate === "lowestRating") {
      if (a.rating !== b.rating) {
        return a.rating - b.rating;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      if (filterDate === "newest") {
        return dateB - dateA;
      } else if (filterDate === "oldest") {
        return dateA - dateB;
      }
      return dateB - dateA; // Default to newest
    }
  });

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
    : 0;

  return (
    <div className="min-h-screen bg-cream-50 py-6 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900" />
        </div>
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-cream-900 mb-3 sm:mb-4">
            Customer Reviews
          </h1>
          <p className="text-sm sm:text-base text-cream-600 max-w-xl mx-auto mb-4 sm:mb-6">
            Share your experience and see what others have to say about Prints24.
          </p>
          
          {/* Statistics */}
          {totalReviews > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-md border border-cream-200">
                <p className="text-xs sm:text-sm text-cream-600 mb-1">Total Reviews</p>
                <p className="text-xl sm:text-2xl font-bold text-cream-900">{totalReviews}</p>
              </div>
              <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-md border border-cream-200">
                <p className="text-xs sm:text-sm text-cream-600 mb-1">Average Rating</p>
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

        {/* Review Form */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-cream-200">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream-900 mb-4 sm:mb-6">
              Write a Review
            </h2>
            <form onSubmit={handleSubmitReview}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Your Name *
                </label>
                <input
                  id="userName"
                  name="userName"
                  type="text"
                  value={reviewForm.userName}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, userName: e.target.value })
                  }
                  className="w-full p-4 border border-cream-300 rounded-xl focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none"
                  placeholder="Enter your name"
                  required
                  disabled={isLoggedIn}
                />
                {isLoggedIn && (
                  <p className="text-xs text-cream-500 mt-1">Your name is pre-filled from your account</p>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={`sm:w-8 sm:h-8 ${
                          star <= reviewForm.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-cream-300"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Your Review *
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  rows={4}
                  className="w-full p-4 border border-cream-300 rounded-xl focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none resize-none"
                  placeholder="Share your experience..."
                  required
                />
              </div>
              {submitMessage.type && (
                <div className={`mb-4 p-3 rounded-lg ${
                  submitMessage.type === "success" 
                    ? "bg-green-50 text-green-800 border border-green-200" 
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {submitMessage.text}
                </div>
              )}
              <button
                type="submit"
                disabled={submittingReview}
                className="bg-cream-900 text-cream-50 px-8 py-3 rounded-xl font-medium hover:bg-cream-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-cream-200">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-cream-600" />
                <span className="font-medium text-cream-900">Filters:</span>
              </div>
              
              {/* Rating Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-cream-700">Rating:</label>
                <ReviewFilterDropdown
                  label="All Ratings"
                  value={filterRating}
                  onChange={(value) => setFilterRating(value as number | null)}
                  options={[
                    { value: null, label: "All Ratings" },
                    { value: 5, label: "5 Stars" },
                    { value: 4, label: "4 Stars" },
                    { value: 3, label: "3 Stars" },
                    { value: 2, label: "2 Stars" },
                    { value: 1, label: "1 Star" },
                  ]}
                />
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-cream-700">Sort by:</label>
                <ReviewFilterDropdown
                  label="Newest First"
                  value={filterDate}
                  onChange={(value) => setFilterDate(value as string)}
                  options={[
                    { value: "newest", label: "Newest First" },
                    { value: "oldest", label: "Oldest First" },
                    { value: "highestRating", label: "Highest Rating" },
                    { value: "lowestRating", label: "Lowest Rating" },
                  ]}
                />
              </div>

              {/* Clear Filters */}
              {(filterRating || filterDate !== "newest") && (
                <button
                  onClick={() => {
                    setFilterRating(null);
                    setFilterDate("newest");
                  }}
                  className="ml-auto flex items-center gap-2 px-4 py-2 text-sm text-cream-700 hover:text-cream-900 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {sortedReviews.map((review) => (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                <p className="text-cream-700 leading-relaxed mb-4">
                  {review.comment}
                </p>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;

