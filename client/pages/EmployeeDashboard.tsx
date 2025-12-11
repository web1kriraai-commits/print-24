import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "../components/BackButton";
import {
  Package,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Loader,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  Search,
  Building2,
  Eye,
  Calendar,
  Truck,
  X,
  Bell,
  Settings,
  HelpCircle,
  FileText,
  Download,
  ChevronRight,
  Filter,
  TrendingUp,
  AlertTriangle,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";

interface Department {
  _id: string;
  name: string;
  description?: string;
  sequence: number;
  isEnabled: boolean;
}

interface Order {
  _id: string;
  orderNumber: string;
  productId?: string; // Product ID for fetching full details
  product: {
    _id: string;
    name: string;
    image: string;
    basePrice?: number;
    description?: string;
    instructions?: string;
    options?: Array<{
      _id: string;
      name: string;
      priceAdd: number;
      description?: string;
      image?: string;
    }>;
    attributes?: Array<any>;
    subcategory?: {
      _id: string;
      name: string;
      image?: string;
      category?: {
        _id: string;
        name: string;
      };
    } | string;
    productionSequence?: Array<{
      _id: string;
      name: string;
      sequence: number;
    }>;
  };
  quantity: number;
  status: string;
  totalPrice: number;
  finish?: string;
  shape?: string;
  selectedOptions?: Array<{
    optionId?: string;
    optionName?: string;
    name?: string;
    priceAdd: number;
    description?: string;
    image?: string;
  }>;
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
  uploadedDesign?: {
    frontImage?: {
      data: string;
      contentType: string;
      filename: string;
    };
    backImage?: {
      data: string;
      contentType: string;
      filename: string;
    };
  };
  currentDepartment?: {
    _id: string;
    name: string;
    sequence: number;
  } | string | null;
  currentDepartmentIndex?: number | null;
  departmentStatuses?: Array<{
    department: Department | string;
    status: "pending" | "in_progress" | "paused" | "completed" | "stopped";
    startedAt: string | null;
    pausedAt: string | null;
    completedAt: string | null;
    stoppedAt: string | null;
    operator: { _id: string; name: string; email: string } | null;
    notes: string;
  }>;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  deliveryDate?: string;
  address?: string;
  pincode?: string;
  mobileNumber?: string;
  notes?: string;
}

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [fullOrderDetails, setFullOrderDetails] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<string>("dashboard");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (!token || !user) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(user);
      setUserData(parsedUser);
      
      if (parsedUser.role !== "emp" && parsedUser.role !== "admin") {
        navigate("/");
        return;
      }
    } catch (err) {
      console.error("Error parsing user data:", err);
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (userData && (userData.role === "emp" || userData.role === "admin")) {
      fetchMyDepartments();
    }
  }, [userData]);

  useEffect(() => {
    if (selectedDepartment && userData) {
      fetchDepartmentOrders(selectedDepartment._id);
    }
  }, [selectedDepartment, statusFilter, userData]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  };

  const fetchMyDepartments = async () => {
    if (!userData) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/departments?isEnabled=true`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch departments");
      }

      const data = await response.json();
      const allDepts = data.data || data || [];
      const currentUserId = userData.id || userData._id;
      
      if (!currentUserId) {
        console.error("User ID not found in userData:", userData);
        setError("User ID not found. Please log in again.");
        setLoading(false);
        return;
      }
      
      const ALL_EMPLOYEES_DEPARTMENT_ID = "69327f9850162220fa7bff29";
      
      const myDepts = allDepts.filter((dept: any) => {
        if (dept._id === ALL_EMPLOYEES_DEPARTMENT_ID) {
          return true;
        }
        
        if (!dept.operators || dept.operators.length === 0) {
          return true;
        }
        
        const isAssigned = dept.operators.some((op: any) => {
          const opId = typeof op === 'object' ? (op._id || op.id || String(op)) : String(op);
          const matches = String(opId) === String(currentUserId);
          return matches;
        });
        
        return isAssigned;
      });

      setDepartments(myDepts.sort((a: Department, b: Department) => (a.sequence || 0) - (b.sequence || 0)));

      if (myDepts.length > 0 && !selectedDepartment) {
        setSelectedDepartment(myDepts[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentOrders = async (departmentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter !== "all"
        ? `${API_BASE_URL}/departments/${departmentId}/orders?status=${statusFilter}`
        : `${API_BASE_URL}/departments/${departmentId}/orders`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch orders");
      }

      const data = await response.json();
      const ordersData = data.data || data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch orders";
      setError(errorMessage);
      setOrders([]);
      console.error("Error fetching department orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full order details including product information (in background)
  const fetchFullOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }

      const data = await response.json();
      setFullOrderDetails(data);
    } catch (err) {
      console.error("Error fetching full order details:", err);
      // Silently fail - use the basic order data we already have
      setFullOrderDetails(null);
    }
  };

  const handleOpenOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setFullOrderDetails(null); // Reset full details
    setShowOrderModal(true);
    // Fetch full order details in background (non-blocking)
    fetchFullOrderDetails(order._id);
  };

  const handleDepartmentAction = async (orderId: string, action: string, notes?: string) => {
    if (!selectedDepartment) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/departments/${selectedDepartment._id}/action`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action, notes: notes || "" }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to perform action");
      }

      setSuccess(`Order ${action === "complete" ? "completed" : action === "start" ? "started" : action === "resume" ? "resumed" : `${action}ed`} successfully`);
      fetchDepartmentOrders(selectedDepartment._id);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform action");
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentStatus = (order: Order) => {
    if (!order.departmentStatuses || !selectedDepartment) return null;
    return order.departmentStatuses.find(
      (ds) => (typeof ds.department === "object" ? ds.department._id : ds.department) === selectedDepartment._id
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "in_progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "paused":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "stopped":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "paused":
        return "bg-orange-500";
      case "stopped":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  // Calculate dashboard stats
  const dashboardStats = {
    pending: orders.filter((o) => {
      const ds = getDepartmentStatus(o);
      return ds?.status === "pending";
    }).length,
    inProgress: orders.filter((o) => {
      const ds = getDepartmentStatus(o);
      return ds?.status === "in_progress";
    }).length,
    urgent: orders.filter((o) => {
      const ds = getDepartmentStatus(o);
      return ds?.status === "paused" || ds?.status === "stopped";
    }).length,
    completed: orders.filter((o) => {
      const ds = getDepartmentStatus(o);
      return ds?.status === "completed";
    }).length,
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Back Button - Fixed Position */}
      <div className="fixed top-4 left-4 z-50">
        <BackButton fallbackPath="/" label="Back to Home" className="bg-white shadow-md px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900" />
      </div>
      
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-slate-900">NexusOrder</h1>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 font-medium"
            >
              <Package className="w-5 h-5" />
              {sidebarOpen && <span>Dashboard</span>}
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
              <Clock className="w-5 h-5" />
              {sidebarOpen && (
                <span className="flex items-center justify-between w-full">
                  <span>My Orders</span>
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                </span>
              )}
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
              <User className="w-5 h-5" />
              {sidebarOpen && <span>Team</span>}
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
              <TrendingUp className="w-5 h-5" />
              {sidebarOpen && <span>Reports</span>}
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200">
            <p className={`text-xs font-semibold text-slate-400 uppercase mb-2 ${!sidebarOpen && "hidden"}`}>
              System
            </p>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
              <Settings className="w-5 h-5" />
              {sidebarOpen && <span>Settings</span>}
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
              <HelpCircle className="w-5 h-5" />
              {sidebarOpen && <span>Support</span>}
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {userData ? getInitials(userData.name) : "U"}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {userData?.name || "User"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {userData?.role === "emp" ? "Employee" : "Admin"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search orders, customers, or SKUs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6">
              <button className="relative p-2 hover:bg-slate-50 rounded-lg">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {userData ? getInitials(userData.name) : "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome back, {userData?.name?.split(" ")[0] || "Employee"}.
            </h1>
            <p className="text-slate-600">
              You have {dashboardStats.pending + dashboardStats.inProgress} active tasks requiring attention.
            </p>
          </div>

          {/* Dashboard Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                  +{dashboardStats.pending} new
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{dashboardStats.pending}</p>
              <p className="text-sm text-slate-600">Pending Orders</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  On track
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{dashboardStats.inProgress}</p>
              <p className="text-sm text-slate-600">In Progress</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  -1 from yesterday
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{dashboardStats.urgent}</p>
              <p className="text-sm text-slate-600">Urgent Attention</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  +15%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{dashboardStats.completed}</p>
              <p className="text-sm text-slate-600">Completed Today</p>
            </div>
          </div>

          {/* Department Selection */}
          {departments.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-slate-700">Department:</span>
                {departments.map((dept) => (
                  <button
                    key={dept._id}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedDepartment?._id === dept._id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Orders Section */}
          {selectedDepartment && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Assigned Orders</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg">
                    {["all", "pending", "in_progress", "paused", "completed"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          statusFilter === status
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {status === "all" ? "All" : status.replace("_", " ").toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => fetchDepartmentOrders(selectedDepartment._id)}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <RefreshCw className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
                  >
                    <AlertCircle size={20} />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
                  >
                    <CheckCircle2 size={20} />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Orders Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <Loader className="animate-spin text-blue-600 mx-auto" size={32} />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <Package size={48} className="mx-auto mb-4 opacity-50 text-slate-400" />
                  <p className="text-slate-600 font-medium mb-2">No orders found</p>
                  <p className="text-sm text-slate-500">
                    {statusFilter !== "all"
                      ? `No orders with status "${statusFilter}" for this department.`
                      : "No orders are currently assigned to this department."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => {
                    const deptStatus = getDepartmentStatus(order);
                    const status = deptStatus?.status || "pending";
                    const statusColor = getStatusBadgeColor(status);

                    return (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => handleOpenOrderModal(order)}
                      >
                        {/* Order Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg mb-1">
                              {order.orderNumber}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {order.product.name}
                            </p>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                        </div>

                        {/* Status Badge */}
                        <div className="mb-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                            {status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>

                        {/* Order Details */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User className="w-4 h-4" />
                            <span className="truncate">{order.user.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Package className="w-4 h-4" />
                            <span>{order.quantity.toLocaleString()} units</span>
                          </div>
                          {order.deliveryDate && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {new Date(order.deliveryDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          {status === "pending" && (
                            <button
                              onClick={() => handleDepartmentAction(order._id, "start")}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              <Play className="w-4 h-4" />
                              Start
                            </button>
                          )}
                          {status === "in_progress" && (
                            <>
                              <button
                                onClick={() => handleDepartmentAction(order._id, "pause")}
                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                              >
                                <Pause className="w-4 h-4" />
                                Pause
                              </button>
                              <button
                                onClick={() => handleDepartmentAction(order._id, "complete")}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Complete
                              </button>
                            </>
                          )}
                          {status === "paused" && (
                            <>
                              <button
                                onClick={() => handleDepartmentAction(order._id, "resume")}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                              >
                                <Play className="w-4 h-4" />
                                Resume
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to stop this job?")) {
                                    handleDepartmentAction(order._id, "stop");
                                  }
                                }}
                                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                              >
                                <Square className="w-4 h-4" />
                                Stop
                              </button>
                            </>
                          )}
                          {status === "completed" && (
                            <div className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium text-center">
                              Completed
                            </div>
                          )}
                        </div>

                        {/* View Details Link */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenOrderModal(order);
                            }}
                            className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderModal && (fullOrderDetails || selectedOrder) && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowOrderModal(false);
              setSelectedOrder(null);
              setFullOrderDetails(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {(fullOrderDetails || selectedOrder).orderNumber}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Created: {new Date((fullOrderDetails || selectedOrder).createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const order = fullOrderDetails || selectedOrder;
                    const ds = getDepartmentStatus(order);
                    const status = ds?.status || "pending";
                    return (
                      <>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                          {status.replace("_", " ").toUpperCase()}
                        </span>
                        <button
                          onClick={() => {
                            setShowOrderModal(false);
                            setSelectedOrder(null);
                            setFullOrderDetails(null);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-slate-600" />
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                  {/* Action Buttons */}
                  {(() => {
                    const order = fullOrderDetails || selectedOrder;
                    const ds = getDepartmentStatus(order);
                    const status = ds?.status || "pending";
                    
                    return (
                      <div className="flex gap-3">
                        {status === "pending" && (
                          <button
                            onClick={() => {
                              handleDepartmentAction(order._id, "start");
                              setShowOrderModal(false);
                            }}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                          >
                            <Play className="w-5 h-5" />
                            Start
                          </button>
                        )}
                        {status === "in_progress" && (
                          <>
                            <button
                              onClick={() => {
                                handleDepartmentAction(order._id, "pause");
                                setShowOrderModal(false);
                              }}
                              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                              <Pause className="w-5 h-5" />
                              Pause
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to stop this job?")) {
                                  handleDepartmentAction(order._id, "stop");
                                  setShowOrderModal(false);
                                }
                              }}
                              className="flex-1 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                              <Square className="w-5 h-5" />
                              Stop / Finish
                            </button>
                          </>
                        )}
                        {status === "paused" && (
                          <>
                            <button
                              onClick={() => {
                                handleDepartmentAction(order._id, "resume");
                                setShowOrderModal(false);
                              }}
                              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                              <Play className="w-5 h-5" />
                              Resume
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to stop this job?")) {
                                  handleDepartmentAction(order._id, "stop");
                                  setShowOrderModal(false);
                                }
                              }}
                              className="flex-1 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                              <Square className="w-5 h-5" />
                              Stop / Finish
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()}

                {(() => {
                  const order = fullOrderDetails || selectedOrder;
                  
                  return (
                    <>
                      {/* Customer Information */}
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                          Customer
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-slate-600 mb-1">Name</p>
                            <p className="font-semibold text-slate-900">{order.user.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 mb-1">Email</p>
                            <p className="font-semibold text-slate-900">{order.user.email}</p>
                          </div>
                          {order.mobileNumber && (
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Mobile</p>
                              <p className="font-semibold text-slate-900">{order.mobileNumber}</p>
                            </div>
                          )}
                          {order.deliveryDate && (
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Due Date</p>
                              <p className="font-semibold text-slate-900">
                                {new Date(order.deliveryDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Information */}
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                          Product Info
                        </h3>
                        <div className="flex gap-4 mb-4">
                          {order.product?.image && (
                            <img
                              src={order.product.image}
                              alt={order.product.name}
                              className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-lg mb-2">{order.product?.name || "Product"}</p>
                            {/* Category and Subcategory */}
                            {order.product?.subcategory && (
                              <div className="mb-2">
                                <p className="text-sm text-slate-600">
                                  {typeof order.product.subcategory === "object" && order.product.subcategory.category
                                    ? `${order.product.subcategory.category.name} • ${order.product.subcategory.name}`
                                    : typeof order.product.subcategory === "object"
                                    ? order.product.subcategory.name
                                    : order.product.subcategory}
                                </p>
                              </div>
                            )}
                            <div className="space-y-1 text-sm text-slate-600">
                              <p>Quantity: {order.quantity.toLocaleString()} units</p>
                              {order.finish && <p>Finish: {order.finish}</p>}
                              {order.shape && <p>Shape: {order.shape}</p>}
                              {order.product?.basePrice && (
                                <p>Base Price: ₹{order.product.basePrice.toFixed(2)}</p>
                              )}
                              <p className="font-semibold text-slate-900 mt-2">
                                Total: ₹{order.totalPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Product Description */}
                        {order.product?.description && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">Description:</p>
                            <p className="text-sm text-slate-600">{order.product.description}</p>
                          </div>
                        )}
                        
                        {/* Product Instructions */}
                        {order.product?.instructions && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">Instructions:</p>
                            <p className="text-sm text-slate-600">{order.product.instructions}</p>
                          </div>
                        )}
                      </div>

                      {/* Selected Options */}
                      {order.selectedOptions && Array.isArray(order.selectedOptions) && order.selectedOptions.length > 0 ? (
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                            Selected Options
                          </h3>
                          <div className="space-y-3">
                            {order.selectedOptions.map((opt, idx) => {
                              // Handle different data structures
                              const name = opt?.optionName || opt?.name || "Option";
                              const priceAdd = typeof opt?.priceAdd === 'number' ? opt.priceAdd : (typeof opt?.priceAdd === 'string' ? parseFloat(opt.priceAdd) || 0 : 0);
                              
                              // Skip if name is just "Option" and price is 0 (likely invalid data)
                              if (name === "Option" && priceAdd === 0) {
                                return null;
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                                >
                                  <div className="flex items-center gap-3">
                                    {opt?.image && (
                                      <img
                                        src={opt.image}
                                        alt={name}
                                        className="w-12 h-12 object-cover rounded-lg"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium text-slate-900">{name}</p>
                                      {opt?.description && (
                                        <p className="text-xs text-slate-500">{opt.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-slate-900">+₹{priceAdd.toFixed(2)}</p>
                                  </div>
                                </div>
                              );
                            }).filter(Boolean)}
                          </div>
                          {order.selectedOptions.filter(opt => {
                            const name = opt?.optionName || opt?.name || "Option";
                            const priceAdd = typeof opt?.priceAdd === 'number' ? opt.priceAdd : (typeof opt?.priceAdd === 'string' ? parseFloat(opt.priceAdd) || 0 : 0);
                            return !(name === "Option" && priceAdd === 0);
                          }).length === 0 && (
                            <p className="text-sm text-slate-500 italic text-center py-4">No valid options found</p>
                          )}
                        </div>
                      ) : null}

                      {/* Selected Dynamic Attributes */}
                      {order.selectedDynamicAttributes && order.selectedDynamicAttributes.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                            Selected Attributes
                          </h3>
                          <div className="space-y-3">
                            {order.selectedDynamicAttributes.map((attr, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-white rounded-lg border border-slate-200"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{attr.attributeName}</p>
                                    <p className="text-sm text-slate-600 mt-1">
                                      Value: <span className="font-semibold">{attr.label || String(attr.attributeValue)}</span>
                                    </p>
                                    {attr.description && (
                                      <p className="text-xs text-slate-500 mt-1">{attr.description}</p>
                                    )}
                                  </div>
                                  {attr.image && (
                                    <img
                                      src={attr.image}
                                      alt={attr.attributeName}
                                      className="w-16 h-16 object-cover rounded-lg ml-3"
                                    />
                                  )}
                                </div>
                                {(attr.priceMultiplier !== 1 || attr.priceAdd > 0) && (
                                  <div className="mt-2 pt-2 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">
                                      {attr.priceMultiplier !== 1 && `Multiplier: ${attr.priceMultiplier}x`}
                                      {attr.priceMultiplier !== 1 && attr.priceAdd > 0 && " • "}
                                      {attr.priceAdd > 0 && `Additional: +₹${attr.priceAdd.toFixed(2)}`}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* User Uploaded Images */}
                      {order.uploadedDesign && (order.uploadedDesign.frontImage || order.uploadedDesign.backImage) && (
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                            User Uploaded Designs
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {order.uploadedDesign.frontImage && (
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <p className="text-sm font-medium text-slate-900 mb-2">Front Image</p>
                                {order.uploadedDesign.frontImage.data && (
                                  <img
                                    src={order.uploadedDesign.frontImage.data}
                                    alt="Front design"
                                    className="w-full h-48 object-contain rounded-lg border border-slate-200 bg-slate-50"
                                  />
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                  {order.uploadedDesign.frontImage.filename}
                                </p>
                              </div>
                            )}
                            {order.uploadedDesign.backImage && (
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <p className="text-sm font-medium text-slate-900 mb-2">Back Image</p>
                                {order.uploadedDesign.backImage.data && (
                                  <img
                                    src={order.uploadedDesign.backImage.data}
                                    alt="Back design"
                                    className="w-full h-48 object-contain rounded-lg border border-slate-200 bg-slate-50"
                                  />
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                  {order.uploadedDesign.backImage.filename}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Customer Instructions */}
                {(() => {
                  const order = fullOrderDetails || selectedOrder;
                  return order.notes ? (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                        Customer Instructions
                      </h3>
                      <div className="space-y-2">
                        {order.notes.split("\n").map((note, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <p className="text-slate-700">{note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Production Timeline */}
                {(() => {
                  const order = fullOrderDetails || selectedOrder;
                  return order.departmentStatuses && order.departmentStatuses.length > 0 ? (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                        Production Timeline
                      </h3>
                      <div className="space-y-4">
                        {order.departmentStatuses
                          .sort((a, b) => {
                            const seqA = typeof a.department === "object" ? a.department.sequence : 0;
                            const seqB = typeof b.department === "object" ? b.department.sequence : 0;
                            return seqA - seqB;
                          })
                          .map((deptStatus, idx) => {
                            const deptName = typeof deptStatus.department === "object"
                              ? deptStatus.department.name
                              : "Department";
                            const status = deptStatus.status;
                            const isCompleted = status === "completed";
                            const isInProgress = status === "in_progress";
                            const isPending = status === "pending";

                            return (
                              <div key={idx} className="flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      isCompleted
                                        ? "bg-green-500"
                                        : isInProgress
                                        ? "bg-blue-500 animate-pulse"
                                        : isPending
                                        ? "bg-yellow-500"
                                        : "bg-slate-300"
                                    }`}
                                  />
                                  {idx < order.departmentStatuses!.length - 1 && (
                                    <div
                                      className={`w-0.5 h-12 ${
                                        isCompleted ? "bg-green-500" : "bg-slate-200"
                                      }`}
                                    />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-slate-900">{deptName}</p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                                      {status.replace("_", " ").toUpperCase()}
                                    </span>
                                  </div>
                                  {deptStatus.startedAt && (
                                    <p className="text-xs text-slate-500">
                                      Started: {new Date(deptStatus.startedAt).toLocaleString()}
                                    </p>
                                  )}
                                  {deptStatus.completedAt && (
                                    <p className="text-xs text-green-600">
                                      Completed: {new Date(deptStatus.completedAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* User Uploaded Images */}
                {(() => {
                  const order = fullOrderDetails || selectedOrder;
                  const hasAttachments = order.uploadedDesign?.frontImage || order.uploadedDesign?.backImage;
                  
                  return hasAttachments ? (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                        User Uploaded Designs (CMYK Format)
                      </h3>
                      <div className="space-y-4">
                        {order.uploadedDesign?.frontImage && (
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {order.uploadedDesign.frontImage.filename || "Front Image"}
                                  </p>
                                  <p className="text-xs text-slate-500">Front design file (CMYK JPEG)</p>
                                </div>
                              </div>
                              {order.uploadedDesign.frontImage.data && (
                                <a
                                  href={order.uploadedDesign.frontImage.data}
                                  download={order.uploadedDesign.frontImage.filename}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Download image"
                                >
                                  <Download className="w-4 h-4 text-slate-600" />
                                </a>
                              )}
                            </div>
                            {order.uploadedDesign.frontImage.data && (
                              <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                <img
                                  src={order.uploadedDesign.frontImage.data}
                                  alt="Front design preview"
                                  className="w-full h-auto max-h-64 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {order.uploadedDesign?.backImage && (
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {order.uploadedDesign.backImage.filename || "Back Image"}
                                  </p>
                                  <p className="text-xs text-slate-500">Back design file (CMYK JPEG)</p>
                                </div>
                              </div>
                              {order.uploadedDesign.backImage.data && (
                                <a
                                  href={order.uploadedDesign.backImage.data}
                                  download={order.uploadedDesign.backImage.filename}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Download image"
                                >
                                  <Download className="w-4 h-4 text-slate-600" />
                                </a>
                              )}
                            </div>
                            {order.uploadedDesign.backImage.data && (
                              <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                <img
                                  src={order.uploadedDesign.backImage.data}
                                  alt="Back design preview"
                                  className="w-full h-auto max-h-64 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeDashboard;
