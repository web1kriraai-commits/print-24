import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BackButton from "../components/BackButton";
import {
  Building2,
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
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";

interface Department {
  _id: string;
  name: string;
  description?: string;
  sequence: number;
  isEnabled: boolean;
  operators?: Array<{ _id: string; name: string; email: string }>;
}

interface Order {
  _id: string;
  orderNumber: string;
  product: {
    _id: string;
    name: string;
    image: string;
  };
  quantity: number;
  status: string;
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
  createdAt: string;
}

const DepartmentPortal: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchDepartments();
  }, [navigate]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentOrders(selectedDepartment._id);
    }
  }, [selectedDepartment, statusFilter]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    };
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/departments?isEnabled=true`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch departments");
      }

      const data = await response.json();
      const depts = data.data || data || [];
      setDepartments(depts.sort((a: Department, b: Department) => (a.sequence || 0) - (b.sequence || 0)));

      // Auto-select first department if available
      if (depts.length > 0 && !selectedDepartment) {
        setSelectedDepartment(depts[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentOrders = async (departmentId: string) => {
    setLoading(true);
    try {
      const url = statusFilter !== "all"
        ? `${API_BASE_URL}/departments/${departmentId}/orders?status=${statusFilter}`
        : `${API_BASE_URL}/departments/${departmentId}/orders`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.data || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
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

      setSuccess(`Order ${action}ed successfully`);
      fetchDepartmentOrders(selectedDepartment._id);
      
      // Clear success message after 3 seconds
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
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "stopped":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActionButtons = (order: Order) => {
    const deptStatus = getDepartmentStatus(order);
    if (!deptStatus) return null;

    const status = deptStatus.status;
    const buttons = [];

    if (status === "pending") {
      buttons.push(
        <button
          key="start"
          onClick={() => handleDepartmentAction(order._id, "start")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Play size={16} />
          Start
        </button>
      );
    }

    if (status === "in_progress") {
      buttons.push(
        <button
          key="pause"
          onClick={() => handleDepartmentAction(order._id, "pause")}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
        >
          <Pause size={16} />
          Pause
        </button>,
        <button
          key="stop"
          onClick={() => {
            if (window.confirm("Are you sure you want to stop this job? This may require reprint.")) {
              handleDepartmentAction(order._id, "stop");
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Square size={16} />
          Stop
        </button>,
        <button
          key="complete"
          onClick={() => handleDepartmentAction(order._id, "complete")}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <CheckCircle2 size={16} />
          Complete
        </button>
      );
    }

    if (status === "paused") {
      buttons.push(
        <button
          key="resume"
          onClick={() => handleDepartmentAction(order._id, "resume")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Play size={16} />
          Resume
        </button>,
        <button
          key="stop"
          onClick={() => {
            if (window.confirm("Are you sure you want to stop this job?")) {
              handleDepartmentAction(order._id, "stop");
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Square size={16} />
          Stop
        </button>
      );
    }

    return buttons.length > 0 ? <div className="flex gap-2">{buttons}</div> : null;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900 mb-4" />
          <h1 className="text-3xl font-bold text-cream-900 mb-2">Department Portal</h1>
          <p className="text-cream-600">Manage production workflow for your department</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle2 size={20} />
            {success}
          </div>
        )}

        {/* Department Selection */}
        <div className="bg-white rounded-xl shadow-md border border-cream-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-cream-900 mb-4 flex items-center gap-2">
            <Building2 size={24} />
            Select Department
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {departments.map((dept) => (
              <button
                key={dept._id}
                onClick={() => setSelectedDepartment(dept)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDepartment?._id === dept._id
                    ? "border-cream-900 bg-cream-50 ring-2 ring-cream-900"
                    : "border-cream-200 hover:border-cream-400"
                }`}
              >
                <div className="font-semibold text-cream-900">{dept.name}</div>
                {dept.description && (
                  <div className="text-xs text-cream-600 mt-1">{dept.description}</div>
                )}
                <div className="text-xs text-cream-500 mt-2">Sequence: {dept.sequence}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Orders Section */}
        {selectedDepartment && (
          <div className="bg-white rounded-xl shadow-md border border-cream-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-cream-900 mb-2">
                  Orders - {selectedDepartment.name}
                </h2>
                <p className="text-sm text-cream-600">
                  {filteredOrders.length} order(s) found
                </p>
              </div>
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="stopped">Stopped</option>
                </select>
                <button
                  onClick={() => fetchDepartmentOrders(selectedDepartment._id)}
                  className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by order number or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader className="animate-spin text-cream-900 mx-auto" size={32} />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-cream-50 rounded-lg border border-cream-200">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-cream-600">No orders found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const deptStatus = getDepartmentStatus(order);
                  return (
                    <motion.div
                      key={order._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-cream-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-cream-900">Order #{order.orderNumber}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getStatusColor(deptStatus?.status || "pending")}`}>
                              {deptStatus?.status?.replace("_", " ").toUpperCase() || "PENDING"}
                            </span>
                          </div>
                          <div className="text-sm text-cream-600 space-y-1">
                            <p><strong>Product:</strong> {order.product.name}</p>
                            <p><strong>Quantity:</strong> {order.quantity.toLocaleString()} units</p>
                            {deptStatus?.operator && (
                              <p><strong>Operator:</strong> {deptStatus.operator.name}</p>
                            )}
                            {deptStatus?.startedAt && (
                              <p className="flex items-center gap-1">
                                <Clock size={14} />
                                Started: {new Date(deptStatus.startedAt).toLocaleString()}
                              </p>
                            )}
                            {deptStatus?.notes && (
                              <p><strong>Notes:</strong> {deptStatus.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getActionButtons(order)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentPortal;


