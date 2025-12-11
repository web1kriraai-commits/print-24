import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Package,
  ShoppingBag,
  CreditCard,
  Truck,
  MapPin,
  CheckCircle,
  Clock,
  Eye,
  X,
  Image as ImageIcon,
  Info,
  ArrowRight,
  Box,
  AlertCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";
import { calculateOrderBreakdown, OrderForCalculation } from "../utils/pricing";
import BackButton from "../components/BackButton";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  product: {
    _id: string;
    name: string;
    image: string;
    basePrice?: number;
    gstPercentage?: number;
    additionalDesignCharge?: number;
    options?: any[];
    filters?: any;
    subcategory?: {
      name: string;
      image?: string;
      category?: {
        name: string;
      };
    } | string;
  };
  quantity: number;
  finish: string;
  shape: string;
  selectedOptions: Array<{
    optionId: string;
    optionName: string;
    name?: string;
    priceAdd: number;
    description?: string;
    image?: string;
  }> | string[];
  selectedDynamicAttributes?: Array<{
    attributeTypeId: string;
    attributeName: string;
    attributeValue: any;
    label: string;
    priceMultiplier?: number;
    priceAdd: number;
    description?: string;
    image?: string;
  }>;
  totalPrice: number;
  advancePaid?: number;
  status: "request" | "production_ready" | "approved" | "processing" | "completed" | "cancelled" | "rejected";
  currentDepartment?: {
    _id: string;
    name: string;
    sequence: number;
  } | string | null;
  courierPartner?: string;
  trackingId?: string;
  deliveryDate: string | null;
  deliveredAt?: string | null;
  pincode: string;
  address: string;
  mobileNumber: string;
  createdAt: string;
  notes?: string;
  departmentStatuses?: Array<{
    department: {
      _id: string;
      name: string;
      sequence: number;
    } | string;
    status: "pending" | "in_progress" | "paused" | "completed" | "stopped";
    startedAt: string | null;
    pausedAt: string | null;
    completedAt: string | null;
    stoppedAt: string | null;
    operator: { _id: string; name: string; email: string } | null;
    notes: string;
  }>;
  productionTimeline?: Array<{
    department: {
      _id: string;
      name: string;
    } | string;
    action: string;
    timestamp: string;
    operator: { _id: string; name: string; email: string } | null;
    notes: string;
  }>;
}

// Format currency helper
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Subcategory Image Component with error handling
const SubcategoryImage: React.FC<{
  subcategory: Order["product"]["subcategory"];
}> = ({ subcategory }) => {
  const [imageError, setImageError] = useState(false);
  const subcategoryImage =
    typeof subcategory === "object" ? subcategory?.image : null;

  if (subcategoryImage && !imageError) {
    return (
      <img
        src={subcategoryImage}
        alt={typeof subcategory === "object" ? subcategory.name : "Subcategory"}
        className="w-24 h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300 shadow-sm"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform duration-300">
      <Box className="w-8 h-8" />
    </div>
  );
};

// OrdersList Component
interface OrdersListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, onSelectOrder }) => {
  const isClient = useClientOnly();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpansion = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isCompleted = order.status === "completed";
        const isProcessing = order.status === "processing" || order.status === "approved" || order.status === "production_ready";
        const isPendingPayment = order.status === "request";

        // Calculate progress percentage based on department completion
        const departmentStatuses = order.departmentStatuses || [];
        const totalDepts = departmentStatuses.length;
        
        // Count completed departments - handle both object and lean() formats
        const completedDepts = departmentStatuses.filter((ds) => {
          if (!ds) return false;
          // Handle both Mongoose document and plain object formats
          if (typeof ds === "object" && ds.status) {
            return ds.status === "completed";
          }
          return false;
        }).length;
        
        // Calculate progress percentage
        let progressPercent = 0;
        if (totalDepts > 0) {
          progressPercent = Math.round((completedDepts / totalDepts) * 100);
        } else if (isCompleted) {
          // If order is completed but no departments, show 100%
          progressPercent = 100;
        } else if (isProcessing) {
          // If order is in production but no departments yet, show 0% (just starting)
          progressPercent = 0;
        }
        
        // Show progress bar if order is not pending payment
        // Show for all non-pending-payment orders (processing, approved, production_ready, completed)
        const shouldShowProgress = !isPendingPayment;

        const isExpanded = expandedOrders.has(order._id);
        
        // Calculate price breakdown
        const orderForCalc: OrderForCalculation = {
          quantity: order.quantity,
          product: {
            basePrice: order.product?.basePrice || 0,
            gstPercentage: order.product?.gstPercentage || 18,
            options: order.product?.options || [],
            filters: order.product?.filters || {},
            quantityDiscounts: (order.product as any)?.quantityDiscounts || [],
          },
          finish: order.finish,
          shape: order.shape,
          selectedOptions: (order.selectedOptions || []).map((opt) => ({
            name: typeof opt === 'string' ? opt : (opt.optionName || opt.name || ''),
            optionName: typeof opt === 'string' ? opt : (opt.optionName || opt.name || ''),
            priceAdd: typeof opt === 'string' ? 0 : (opt.priceAdd || 0),
          })),
          selectedDynamicAttributes: order.selectedDynamicAttributes?.map((attr) => ({
            attributeName: attr.attributeName,
            label: attr.label,
            priceMultiplier: attr.priceMultiplier,
            priceAdd: attr.priceAdd,
          })),
        };

        const calculations = calculateOrderBreakdown(orderForCalc) as any;
        
        // Get additional design charge from product
        const additionalDesignCharge = (order.product as any)?.additionalDesignCharge || 0;
        
        // New calculation order:
        // 1. Base Price = quantity * price
        // 2. Add options/attributes/charges
        // 3. Subtotal before discount
        // 4. Apply discount to subtotal
        // 5. Add design charge
        // 6. Subtotal including design charge (after discount)
        // 7. Add GST (on discounted subtotal + design charge)
        // 8. Final total
        
        const subtotalBeforeDiscount = calculations.subtotalBeforeGst || calculations.rawBaseTotal + calculations.optionBreakdowns.reduce((sum: number, opt: any) => sum + opt.cost, 0);
        const subtotalAfterDiscount = calculations.subtotalAfterDiscount || calculations.subtotal || subtotalBeforeDiscount;
        const discountAmount = calculations.discountAmount || (subtotalBeforeDiscount - subtotalAfterDiscount);
        const subtotalWithDesignCharge = subtotalAfterDiscount + additionalDesignCharge;
        // GST is calculated on discounted subtotal + design charge
        const gstAmount = (subtotalWithDesignCharge * (order.product?.gstPercentage || 18)) / 100;
        const finalTotal = subtotalWithDesignCharge + gstAmount;
        
        // Use stored totalPrice as source of truth
        const storedTotal = order.totalPrice;

        return (
          <div
            key={order._id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-brand-300 transition-all duration-200 overflow-hidden group"
          >
            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
              {/* Subcategory Image */}
              <div className="shrink-0">
                <SubcategoryImage subcategory={order.product?.subcategory} />
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0 self-start md:self-center">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    {!isClient
                      ? "Loading..."
                      : new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Category & Subcategory */}
                {order.product?.subcategory && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-0.5">
                    {typeof order.product.subcategory === "object"
                      ? order.product.subcategory.category
                        ? `${order.product.subcategory.category.name} • ${order.product.subcategory.name}`
                        : order.product.subcategory.name
                      : order.product.subcategory}
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 truncate pr-4">
                  {order.product?.name || "Product"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {order.quantity.toLocaleString()} units • {order.finish}
                </p>
              </div>

              {/* Status & Price */}
              <div className="flex flex-col md:items-end gap-2 md:w-64 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-4 md:mt-0">
                <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(order.totalPrice)}
                  </span>
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      isCompleted
                        ? "bg-green-50 text-green-700 border-green-200"
                        : isProcessing
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {order.status.replace("_", " ").toUpperCase()}
                  </div>
                </div>

                {isPendingPayment ? (
                  <div className="flex items-center justify-end text-red-600 text-sm font-medium gap-1.5 animate-pulse w-full">
                    <AlertCircle className="w-4 h-4" />
                    Payment Required
                  </div>
                ) : shouldShowProgress ? (
                  <div className="w-full md:max-w-[200px] group/progress cursor-pointer">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Production Progress</span>
                      <span className="font-semibold text-slate-700">{progressPercent}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative group-hover/progress:bg-slate-200 transition-colors">
                      <div
                        className="h-full bg-green-400 group-hover/progress:bg-green-300 rounded-full transition-all duration-300 ease-out shadow-sm group-hover/progress:shadow-md"
                        style={{ 
                          width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                          minWidth: progressPercent > 0 ? '4px' : '0px'
                        }}
                      />
                    </div>
                    {totalDepts > 0 ? (
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {completedDepts} of {totalDepts} departments completed
                      </p>
                    ) : isCompleted ? (
                      <p className="text-[10px] text-green-600 mt-1.5 font-medium">Order completed</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1.5">Production starting...</p>
                    )}
                  </div>
                ) : (
                  <div className="w-full md:max-w-[200px]">
                    <p className="text-xs text-slate-400">Waiting for production to start</p>
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={(e) => toggleOrderExpansion(order._id, e)}
                  className="text-xs text-slate-500 hover:text-brand-600 font-medium px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
                >
                  {isExpanded ? 'Hide' : 'Show'} Breakdown
                </button>
                <div className="text-slate-300 group-hover:text-brand-500 transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            {/* Price Breakdown Panel - Same as Order Summary */}
            {isExpanded && (
              <div className="border-t border-slate-200 bg-slate-50">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard size={18} />
                    Price Breakdown
                  </h3>
                  <div className="space-y-3 text-sm">
                    {/* Step 1: Base Price = quantity * price */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div className="text-slate-600">
                        <span>
                          Base Price ({order.quantity.toLocaleString()} ×{' '}
                          {formatCurrency(order.product?.basePrice || 0)})
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">{formatCurrency(calculations.rawBaseTotal)}</span>
                    </div>

                    {/* Step 2: Options, Attributes, and Charges */}
                    {calculations.optionBreakdowns.map((opt: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-600">
                        <span>
                          {opt.name} {opt.isPerUnit ? `(${order.quantity} × ${formatCurrency(opt.priceAdd)})` : ''}
                        </span>
                        <span>+{formatCurrency(opt.cost)}</span>
                      </div>
                    ))}

                    {/* Step 3: Subtotal (before discount) */}
                    <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
                      <span>Subtotal (Before Discount)</span>
                      <span>{formatCurrency(subtotalBeforeDiscount)}</span>
                    </div>

                    {/* Step 4: Discount (applied to subtotal before GST) */}
                    {calculations.discountPercentage > 0 && discountAmount > 0 && (
                      <div className="flex justify-between items-center text-green-600 bg-green-50 p-2 rounded-md">
                        <div>
                          <span className="font-semibold">
                            Bulk Discount ({calculations.discountPercentage}%)
                          </span>
                          <p className="text-xs opacity-80">Applied for {order.quantity} units</p>
                        </div>
                        <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    {/* Step 5: Subtotal (after discount) */}
                    <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
                      <span>Subtotal (After Discount)</span>
                      <span>{formatCurrency(subtotalAfterDiscount)}</span>
                    </div>

                    {/* Step 6: Additional Design Charge */}
                    {additionalDesignCharge > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Additional Design Charge</span>
                        <span>+{formatCurrency(additionalDesignCharge)}</span>
                      </div>
                    )}

                    {/* Step 7: Subtotal (including design charge) */}
                    {additionalDesignCharge > 0 && (
                      <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
                        <span>Subtotal (Including Design Charge)</span>
                        <span>{formatCurrency(subtotalWithDesignCharge)}</span>
                      </div>
                    )}

                    {/* Step 8: GST (calculated on discounted subtotal + design charge) */}
                    <div className="flex justify-between items-center text-slate-500 text-xs">
                      <span>GST ({order.product?.gstPercentage || 18}%)</span>
                      <span>+{formatCurrency(gstAmount)}</span>
                    </div>

                    {/* Advance Paid / Balance Due (before Total Amount) */}
                    {(order.advancePaid !== undefined && order.advancePaid > 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-500">Advance Paid</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(order.advancePaid || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Balance Due</span>
                          <span
                            className={`font-bold ${
                              order.totalPrice - (order.advancePaid || 0) > 0
                                ? 'text-red-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatCurrency(order.totalPrice - (order.advancePaid || 0))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Step 9: Final Total - Displayed at the end */}
                    <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-300">
                      <span className="text-lg font-bold text-slate-900">Total Amount</span>
                      <span className="text-xl font-bold text-brand-600">{formatCurrency(storedTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Clickable area for navigation */}
            <div 
              onClick={() => onSelectOrder(order)}
              className="cursor-pointer"
            >
              <div className="px-6 pb-4 md:pb-6 flex items-center justify-between">
                <button className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  View Full Details
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="md:hidden">
                  <button
                    onClick={(e) => toggleOrderExpansion(order._id, e)}
                    className="text-xs text-slate-500 hover:text-brand-600 font-medium px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Breakdown
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const isClient = useClientOnly();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [currentView, setCurrentView] = useState<"dashboard" | "orders">("dashboard");
  const [previousProgress, setPreviousProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(user);
      setUserData(parsedUser);
      setLoading(false);
      // Fetch orders immediately
      fetchRecentOrders();
    } catch (error) {
      console.error("Error parsing user data:", error);
      navigate("/login");
    }
  }, [navigate]);

  // Real-time polling for order updates - Optimized to not show loader
  useEffect(() => {
    if (!userData) return;

    // Poll every 15 seconds for order updates (reduced frequency for better performance)
    const pollInterval = setInterval(() => {
      fetchRecentOrders();
    }, 15000); // 15 seconds

    return () => clearInterval(pollInterval);
  }, [userData, orders.length]); // Include orders.length to avoid stale closure

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  };

  // Fetch user's orders from API - Optimized for fast loading
  const fetchRecentOrders = async () => {
    // Don't show loader if we already have orders (for polling updates)
    const isInitialLoad = orders.length === 0;
    if (isInitialLoad) {
      setLoadingOrders(true);
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setOrders([]);
        return;
      }

      // Fetch with limit for faster initial load
      const response = await fetch(`${API_BASE_URL}/orders/my-orders?limit=50`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();

      // Check for Ngrok blocking
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        console.warn("Ngrok blocking detected");
        setOrders([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = JSON.parse(text);
      // Backend returns array directly for faster response
      const newOrders = Array.isArray(data) ? data : [];

      // Update previous progress for smooth animations (only if changed)
      const progressUpdates: { [key: string]: number } = {};
      newOrders.forEach((order: Order) => {
        const totalDepts = order.departmentStatuses?.length || 0;
        const completedDepts =
          order.departmentStatuses?.filter((ds) => {
            const status = typeof ds === "object" ? ds.status : null;
            return status === "completed";
          }).length || 0;

        const progressPercent = totalDepts > 0 ? (completedDepts / totalDepts) * 100 : 0;

        if (previousProgress[order._id] !== progressPercent) {
          progressUpdates[order._id] = progressPercent;
        }
      });

      // Batch update progress state
      if (Object.keys(progressUpdates).length > 0) {
        setPreviousProgress((prev) => ({
          ...prev,
          ...progressUpdates,
        }));
      }

      setOrders(newOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      // Don't clear orders on error during polling, only on initial load
      if (isInitialLoad) {
        setOrders([]);
      }
    } finally {
      if (isInitialLoad) {
        setLoadingOrders(false);
      }
    }
  };

  const handleSelectOrder = (order: Order) => {
    navigate(`/order/${order._id}`);
    window.scrollTo(0, 0);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <div className="max-w-6xl mx-auto space-y-10">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Hello, {userData.name.split(" ")[0]}.
                </h1>
                <p className="text-slate-500 mt-2">
                  Here's what's going on in your account.
                </p>
              </div>
              <button
                onClick={() => setCurrentView("orders")}
                className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
              >
                <SettingsIcon className="w-4 h-4" />
                View All Orders
              </button>
            </div>

            {/* Account Snapshot */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Account snapshot</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  onClick={() => setCurrentView("orders")}
                  className="bg-slate-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-between hover:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-300 group"
                >
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                    Orders
                  </span>
                  <span className="text-4xl font-bold text-slate-900">{orders.length}</span>
                </div>
                <div className="bg-slate-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-between hover:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-300 group">
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                    Account Status
                  </span>
                  <span className="text-lg font-bold text-slate-900 text-green-600 group-hover:text-green-700 flex items-center gap-1">
                    Active <CheckCircle className="w-5 h-5" />
                  </span>
                </div>
              </div>
              
              {/* Latest Delivery Arrive Time */}
              {(() => {
                const deliveredOrders = orders.filter(
                  (order) => order.deliveredAt && order.status === "completed"
                );
                const latestDelivery = deliveredOrders.sort(
                  (a, b) =>
                    new Date(b.deliveredAt || 0).getTime() -
                    new Date(a.deliveredAt || 0).getTime()
                )[0];

                if (latestDelivery && latestDelivery.deliveredAt) {
                  return (
                    <div className="mt-6 bg-green-50 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Truck className="w-5 h-5 text-green-600" />
                        <h3 className="text-sm font-bold text-slate-900">Latest Delivery</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        Order: <span className="font-mono font-medium">{latestDelivery.orderNumber}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Arrived on:{" "}
                        <span className="font-semibold text-green-700">
                          {new Date(latestDelivery.deliveredAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Latest Delivery Section */}
            {(() => {
              const deliveredOrders = orders.filter(
                (order) => order.deliveredAt && order.status === "completed"
              );
              const latestDelivery = deliveredOrders.sort(
                (a, b) =>
                  new Date(b.deliveredAt || 0).getTime() -
                  new Date(a.deliveredAt || 0).getTime()
              )[0];

              if (latestDelivery) {
                return (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Latest Delivery</h2>
                        <p className="text-sm text-slate-600">
                          Your most recent order delivery
                        </p>
                      </div>
                    </div>
                    <div
                      onClick={() => handleSelectOrder(latestDelivery)}
                      className="bg-white rounded-lg p-4 border border-green-200 hover:border-green-300 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {latestDelivery.product?.image && (
                            <img
                              src={latestDelivery.product.image}
                              alt={latestDelivery.product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">
                              {latestDelivery.product?.name || "Product"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {latestDelivery.orderNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">Delivered on</p>
                          <p className="font-semibold text-green-700">
                            {new Date(latestDelivery.deliveredAt || "").toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-green-100">
                        <span className="text-sm text-slate-600">
                          {latestDelivery.quantity.toLocaleString()} units
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(latestDelivery.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Recent Orders Preview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Recent Orders</h2>
                <button
                  onClick={() => setCurrentView("orders")}
                  className="text-sm font-semibold text-slate-900 underline hover:text-brand-600"
                >
                  View all
                </button>
              </div>
              {loadingOrders && orders.length === 0 ? (
                // Skeleton loaders for faster perceived performance
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                      <div className="flex items-center gap-6">
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-32 space-y-2">
                          <div className="h-6 bg-slate-200 rounded"></div>
                          <div className="h-2 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <Package size={48} className="mx-auto mb-4 opacity-50 text-slate-400" />
                  <p className="text-slate-600 mb-4">You haven't placed any orders yet.</p>
                  <Link
                    to="/digital-print"
                    className="inline-block bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <OrdersList orders={orders.slice(0, 2)} onSelectOrder={handleSelectOrder} />
              )}
            </div>
          </div>
        );

      case "orders":
        return (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Order History</h1>
              <button
                onClick={() => setCurrentView("dashboard")}
                className="text-sm font-semibold text-slate-600 hover:text-brand-600"
              >
                ← Back to Dashboard
              </button>
            </div>
            {loadingOrders && orders.length === 0 ? (
              // Skeleton loaders for faster perceived performance
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                    <div className="flex items-center gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                      <div className="w-32 space-y-2">
                        <div className="h-6 bg-slate-200 rounded"></div>
                        <div className="h-2 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Package size={48} className="mx-auto mb-4 opacity-50 text-slate-400" />
                <p className="text-slate-600 mb-4">You haven't placed any orders yet.</p>
                <Link
                  to="/digital-print"
                  className="inline-block bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <OrdersList orders={orders} onSelectOrder={handleSelectOrder} />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full ${getRandomColor(
                userData.name
              )} flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg ring-4 ring-white`}
            >
              {getInitials(userData.name)}
            </motion.div>

            {/* User Details */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                {userData.name}
              </h1>
              <div className="space-y-2">
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <Mail size={16} className="text-slate-400" />
                  <span className="text-slate-600">{userData.email}</span>
                </div>
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <Shield size={16} className="text-slate-400" />
                  <span className="text-slate-600 capitalize">{userData.role}</span>
                </div>
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-slate-600">
                    Member since{" "}
                    {!isClient
                      ? "Loading..."
                      : new Date().toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default Profile;
