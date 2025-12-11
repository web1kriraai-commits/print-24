import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import toast from "react-hot-toast";
import {
  Package,
  FolderPlus,
  Image as ImageIcon,
  UserPlus,
  Plus,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  Eye,
  Trash2,
  Users,
  Edit,
  Settings,
  Download,
  ShoppingBag,
  Calendar,
  Truck,
  Check,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Search,
  Building2,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import CKEditor from "../components/CKEditor";
import { formatCurrency, calculateOrderBreakdown, OrderForCalculation } from "../utils/pricing";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";
import { scrollToInvalidField } from "../lib/validationUtils";

// Simple placeholder image as data URI (1x1 transparent pixel)
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
const PLACEHOLDER_IMAGE_LARGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='18'%3EImage Not Available%3C/text%3E%3C/svg%3E";

interface Category {
  _id: string;
  name: string;
  description: string;
  type: string;
  image?: string;
  parent?: string | { _id: string } | null;
  sortOrder?: number;
  slug?: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  category?: string | { _id: string; name: string };
  subcategory?: string | { 
    _id: string; 
    name: string;
    category?: string | { _id: string; name: string };
  };
  image?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Upload {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  height: number;
  width: number;
  description: string;
  frontImage: {
    data: string;
    filename: string;
    size: number;
    contentType: string;
  } | null;
  backImage: {
    data: string;
    filename: string;
    size: number;
    contentType: string;
  } | null;
  createdAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  product: {
    _id: string;
    name: string;
    image: string;
    basePrice?: number;
    subcategory?: { name: string } | string;
    options?: Array<{ name: string; priceAdd: number; description?: string; image?: string }>;
    discount?: number;
    description?: string;
    instructions?: string;
    attributes?: Array<{ name: string; value: string }>;
    minFileWidth?: number;
    maxFileWidth?: number;
    minFileHeight?: number;
    maxFileHeight?: number;
  };
  quantity: number;
  finish: string;
  shape: string;
  selectedOptions: Array<{
    optionId: string;
    optionName: string;
    priceAdd: number;
  }>;
  totalPrice: number;
  status: "request" | "production_ready" | "approved" | "processing" | "completed" | "cancelled" | "rejected";
  deliveryDate: string | null;
  pincode: string;
  address: string;
  mobileNumber: string;
  createdAt: string;
  currentDepartment?: {
    _id: string;
    name: string;
    sequence: number;
  } | string | null;
  currentDepartmentIndex?: number | null;
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
  notes?: string;
  adminNotes?: string;
}

// Hierarchical Category Selector Component
const HierarchicalCategorySelector: React.FC<{
  categories: Array<{ _id: string; name: string; type: string; parent?: string | { _id: string } | null }>;
  subCategories: Array<any>;
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
}> = ({ categories, subCategories, selectedCategoryId, onCategorySelect }) => {
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string[]>([]);

  // Get top-level categories for selected type
  const topLevelCategories = categories.filter(
    (cat) => cat.type === selectedType && (!cat.parent || cat.parent === null || (typeof cat.parent === 'object' && !cat.parent._id))
  );

  // Get child categories for a given parent
  const getChildCategories = (parentId: string) => {
    return categories.filter((cat) => {
      if (cat.parent) {
        const parentIdStr = typeof cat.parent === 'object' ? cat.parent._id : cat.parent;
        return parentIdStr === parentId && cat.type === selectedType;
      }
      return false;
    });
  };

  // Build category path from selected category
  const buildCategoryPath = (categoryId: string): string[] => {
    const path: string[] = [];
    let currentId = categoryId;
    
    while (currentId) {
      const category = categories.find(c => c._id === currentId);
      if (!category) break;
      path.unshift(currentId);
      if (category.parent) {
        currentId = typeof category.parent === 'object' ? category.parent._id : category.parent;
      } else {
        break;
      }
    }
    
    return path;
  };

  // Initialize type and path from selected category
  React.useEffect(() => {
    if (selectedCategoryId) {
      const category = categories.find(c => c._id === selectedCategoryId) || 
                      subCategories.find(sc => sc._id === selectedCategoryId);
      if (category) {
        const type = category.type || (category.category && typeof category.category === 'object' ? category.category.type : '');
        if (type) {
          setSelectedType(type);
          if (categories.find(c => c._id === selectedCategoryId)) {
            setSelectedCategoryPath(buildCategoryPath(selectedCategoryId));
          }
        }
      }
    }
  }, [selectedCategoryId, categories, subCategories]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedCategoryPath([]);
    onCategorySelect("");
  };

  const handleCategorySelect = (categoryId: string, level: number) => {
    const newPath = selectedCategoryPath.slice(0, level);
    newPath.push(categoryId);
    setSelectedCategoryPath(newPath);
    onCategorySelect(categoryId);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cream-900 mb-2">
          Type *
        </label>
        <ReviewFilterDropdown
          label="Select Type"
          value={selectedType}
          onChange={handleTypeChange}
          options={[
            { value: "", label: "Select Type" },
            { value: "Digital", label: "Digital" },
            { value: "Bulk", label: "Bulk" },
          ]}
          className="w-full"
        />
      </div>

      {selectedType && (
        <>
          {/* Render category hierarchy dynamically */}
          {(() => {
            const dropdowns: React.ReactElement[] = [];
            let level = 0;

            // First level: top-level categories
            dropdowns.push(
              <div key={level}>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Category *
                </label>
                <ReviewFilterDropdown
                  label="Select Category"
                  value={selectedCategoryPath[level] || ""}
                  onChange={(value) => {
                    if (value) {
                      handleCategorySelect(value, level);
                    } else {
                      setSelectedCategoryPath([]);
                      onCategorySelect("");
                    }
                  }}
                  options={[
                    { value: "", label: "Select Category" },
                    ...topLevelCategories.map((cat) => ({
                      value: cat._id,
                      label: cat.name,
                    })),
                  ]}
                  className="w-full"
                />
              </div>
            );
            level++;

            // Subsequent levels: child categories
            while (level <= selectedCategoryPath.length) {
              const currentParentId = level > 0 ? selectedCategoryPath[level - 1] : null;
              if (!currentParentId) break;

              const children = getChildCategories(currentParentId);
              if (children.length === 0) break;

              dropdowns.push(
                <div key={level}>
                  <label className="block text-sm font-medium text-cream-900 mb-2">
                    Subcategory {level > 1 ? `(Level ${level})` : ''} *
                  </label>
                  <ReviewFilterDropdown
                    label={`Select Subcategory${level > 1 ? ` (Level ${level})` : ''}`}
                    value={selectedCategoryPath[level] || ""}
                    onChange={(value) => {
                      if (value) {
                        handleCategorySelect(value, level);
                      } else {
                        setSelectedCategoryPath(selectedCategoryPath.slice(0, level));
                        onCategorySelect(selectedCategoryPath[level - 1] || "");
                      }
                    }}
                    options={[
                      { value: "", label: `Select Subcategory${level > 1 ? ` (Level ${level})` : ''}` },
                      ...children
                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                        .map((cat) => ({
                          value: cat._id,
                          label: cat.name,
                        })),
                    ]}
                    className="w-full"
                  />
                </div>
              );
              level++;
            }

            return dropdowns;
          })()}
        </>
      )}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const isClient = useClientOnly();
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  // Field-level errors for product form
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryImage, setEditingCategoryImage] = useState<string | null>(null);
  
  // Field-level error states for inline validation messages
  const [productFormErrors, setProductFormErrors] = useState<{
    name?: string;
    basePrice?: string;
    category?: string;
    gstPercentage?: string;
    instructions?: string;
  }>({});
  const [categoryFormErrors, setCategoryFormErrors] = useState<{
    name?: string;
    type?: string;
    image?: string;
  }>({});
  const [attributeFormErrors, setAttributeFormErrors] = useState<{
    attributeName?: string;
    functionType?: string;
    inputStyle?: string;
    primaryEffectType?: string;
  }>({});
  const [departmentFormErrors, setDepartmentFormErrors] = useState<{
    name?: string;
  }>({});
  const [sequenceFormErrors, setSequenceFormErrors] = useState<{
    name?: string;
    printType?: string;
    category?: string;
    selectedDepartments?: string;
  }>({});
  const [subCategoryFormErrors, setSubCategoryFormErrors] = useState<{
    name?: string;
    category?: string;
    image?: string;
  }>({});

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    descriptionArray: [] as string[],
    basePrice: "",
    category: "", // Now using category instead of subcategory
    subcategory: "", // Keep for backward compatibility
    image: null as File | null,
    options: "",
    filters: {
      printingOption: [] as string[],
      orderQuantity: { 
        min: 1000, 
        max: 72000, 
        multiples: 1000,
        quantityType: "SIMPLE" as "SIMPLE" | "STEP_WISE" | "RANGE_WISE",
        stepWiseQuantities: [] as number[],
        rangeWiseQuantities: [] as Array<{ min: number; max: number | null; priceMultiplier: number; label?: string }>,
      },
      deliverySpeed: [] as string[],
      textureType: [] as string[],
    },
    // Quantity discounts
    quantityDiscounts: [] as Array<{ minQuantity: number; maxQuantity: number | null; discountPercentage: number }>,
    // File upload constraints
    maxFileSizeMB: "",
    minFileWidth: "",
    maxFileWidth: "",
    minFileHeight: "",
    maxFileHeight: "",
    blockCDRandJPG: false,
    // Additional charges and taxes
    additionalDesignCharge: "",
    gstPercentage: "",
    // Price display setting
    showPriceIncludingGst: false, // Default to excluding GST (industry standard)
    // Custom instructions for customers
    instructions: "",
    // Production sequence (custom department order for this product)
    productionSequence: [] as string[],
  });

  // Options table state
  const [optionsTable, setOptionsTable] = useState<
    Array<{ name: string; priceAdd: string | number; description: string; image?: string }>
  >([]);
  const [optionImages, setOptionImages] = useState<{ [key: number]: File | null }>({});
  const [showOptionsTable, setShowOptionsTable] = useState(true);

  // Filter tables state - now with prices
  const [filterPricesEnabled, setFilterPricesEnabled] = useState(false);
  const [printingOptionsTable, setPrintingOptionsTable] = useState<Array<{ name: string; priceAdd?: number }>>([]);
  const [deliverySpeedTable, setDeliverySpeedTable] = useState<Array<{ name: string; priceAdd?: number }>>([]);
  const [textureTypeTable, setTextureTypeTable] = useState<Array<{ name: string; priceAdd?: number }>>([]);

  // Dynamic attributes state - selected attribute types for this product
  const [selectedAttributeTypes, setSelectedAttributeTypes] = useState<Array<{
    attributeTypeId: string;
    isEnabled: boolean;
    isRequired: boolean;
    displayOrder: number;
  }>>([]);

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    type: "Digital",
    parent: "", // Optional parent category for hierarchy (empty = top-level)
    sortOrder: 0, // Sort order for displaying subcategories
    slug: "", // URL-friendly identifier
    image: null as File | null,
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSubCategorySlugManuallyEdited, setIsSubCategorySlugManuallyEdited] = useState(false);

  // Subcategory form state
  const [subCategoryForm, setSubCategoryForm] = useState({
    name: "",
    description: "",
    category: "",
    type: "", // Type filter for parent category selection
    slug: "",
    sortOrder: 0,
    image: null as File | null,
  });
  
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [editingSubCategoryImage, setEditingSubCategoryImage] = useState<string | null>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);

  // Employees state for department assignment
  const [employees, setEmployees] = useState<User[]>([]);

  // User role update form state
  const [userRoleForm, setUserRoleForm] = useState({
    username: "",
    role: "user",
  });

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>("");
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string>("all");
  const [categoryTopLevelFilter, setCategoryTopLevelFilter] = useState<string>("all"); // "all", "top-level", "subcategories"
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState<string>("");
  const [filteredSubCategories, setFilteredSubCategories] = useState<any[]>([]);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [draggedSubCategoryId, setDraggedSubCategoryId] = useState<string | null>(null);
  const autoScrollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const categoryListRef = React.useRef<HTMLDivElement | null>(null);
  
  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'subcategory';
    id: string;
    name: string;
    productCount: number;
    subcategoryCount: number;
    deleteText: string;
  }>({
    isOpen: false,
    type: 'category',
    id: '',
    name: '',
    productCount: 0,
    subcategoryCount: 0,
    deleteText: '',
  });
  const [availableParentCategories, setAvailableParentCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string>("");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [subcategoryProducts, setSubcategoryProducts] = useState<Product[]>([]);
  const [loadingSubcategoryProducts, setLoadingSubcategoryProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategoryForView, setSelectedSubCategoryForView] = useState<string | null>(null);
  const [categorySubcategories, setCategorySubcategories] = useState<any[]>([]);
  
  // View description modal state
  const [viewDescriptionModal, setViewDescriptionModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'subcategory';
    name: string;
    description: string;
  }>({
    isOpen: false,
    type: 'category',
    name: '',
    description: '',
  });
  
  // Hierarchical selection state for product form
  const [selectedType, setSelectedType] = useState<string>("");
  const [filteredCategoriesByType, setFilteredCategoriesByType] = useState<Category[]>([]);
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string[]>([]); // Track the full path: [categoryId, subcategoryId1, subcategoryId2, ...]
  const [categoryChildrenMap, setCategoryChildrenMap] = useState<{ [key: string]: Category[] }>({}); // Map of categoryId -> child categories
  const [loadingCategoryChildren, setLoadingCategoryChildren] = useState<{ [key: string]: boolean }>({});
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderStatusUpdate, setOrderStatusUpdate] = useState({
    status: "",
    deliveryDate: "",
    adminNotes: "",
  });

  // Attribute Types state
  const [attributeTypes, setAttributeTypes] = useState<any[]>([]);
  const [attributeTypeSearch, setAttributeTypeSearch] = useState("");
  const [loadingAttributeTypes, setLoadingAttributeTypes] = useState(false);
  const [editingAttributeTypeId, setEditingAttributeTypeId] = useState<string | null>(null);
  const [showCreateAttributeModal, setShowCreateAttributeModal] = useState(false);

  // Departments state
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    isEnabled: true,
    operators: [] as string[],
  });

  // Sequences state
  const [sequences, setSequences] = useState<any[]>([]);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [isCustomizingSequence, setIsCustomizingSequence] = useState(false);
  const [sequenceForm, setSequenceForm] = useState({
    name: "",
    printType: "", // "digital" or "bulk"
    category: "",
    subcategory: "",
    selectedDepartments: [] as string[],
    selectedAttributes: [] as string[],
  });
  const [attributeTypeForm, setAttributeTypeForm] = useState({
    attributeName: "",
    inputStyle: "DROPDOWN", // How customer selects
    effectDescription: "", // What this affects - description textbox
    // Options for dropdown/radio - simple list (e.g., "100, 200, 300")
    simpleOptions: "", // Comma-separated options like "100, 200, 300"
    // Checkboxes
    isPriceEffect: false, // Checkbox: Does this affect price?
    isFixedQuantity: false, // Checkbox: Is this a fixed quantity attribute?
    // Conditional fields based on checkboxes
    priceEffectAmount: "", // If isPriceEffect is true: how much price effect (per 1000 units)
    fixedQuantityMin: "", // If isFixedQuantity is true: minimum quantity
    fixedQuantityMax: "", // If isFixedQuantity is true: maximum quantity
    // Conditional fields based on primaryEffectType (kept for backward compatibility)
    primaryEffectType: "INFORMATIONAL", // What this affects
    priceImpactPer1000: "", // If affects PRICE: price change per 1000 units (e.g., "20" = +₹20 per 1000)
    fileRequirements: "", // If affects FILE: file requirements description
    // Options table for dropdown/radio/price effect
    attributeOptionsTable: [] as Array<{ name: string; priceImpactPer1000: string; image?: string }>, // Table: name and price impact per 1000
    // Auto-set fields (hidden from user, set based on selections)
    functionType: "GENERAL",
    isPricingAttribute: false,
    isFixedQuantityNeeded: false,
    isFilterable: false,
    attributeValues: [] as Array<{ value: string; label: string; priceMultiplier: number; description: string; image: string }>,
    defaultValue: "",
    isRequired: false,
    displayOrder: 0,
    isCommonAttribute: true, // Default to true for simplicity
    applicableCategories: [] as string[],
    applicableSubCategories: [] as string[],
  });

  useEffect(() => {
    // Check if user is admin
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== "admin") {
      navigate("/");
      return;
    }

    fetchCategories();
    fetchProducts();
    fetchSubCategories();
    fetchUsers();
    fetchUploads();
    fetchOrders();
  }, [navigate]);

  // Fetch attribute types when products tab becomes active
  useEffect(() => {
    if (activeTab === "products") {
      // Fetch fresh attribute types when products tab is activated
      // This ensures attribute types are up-to-date after visiting attribute types page
      fetchAttributeTypes();
      // Also fetch sequences and departments for product form
      fetchSequences();
      fetchDepartments();
    }
    if (activeTab === "departments") {
      fetchDepartments();
      fetchEmployees();
    }
    if (activeTab === "sequences") {
      fetchSequences();
      fetchDepartments();
      fetchCategories();
      fetchSubCategories();
    }
    if (activeTab === "categories") {
      // Fetch available parent categories when opening category form
      fetchAvailableParentCategories();
    }
    if (activeTab === "manage-products") {
      // Fetch subcategories to display category/subcategory info in product list
      fetchSubCategories();
      fetchCategories();
    }
  }, [activeTab]);

  // Ensure parent category matches selected type when type changes
  useEffect(() => {
    if (categoryForm.parent && categoryForm.type) {
      const parentCategory = availableParentCategories.find(
        cat => cat._id === categoryForm.parent
      );
      // If parent doesn't match the selected type, clear it
      if (parentCategory && parentCategory.type !== categoryForm.type) {
        setCategoryForm({ ...categoryForm, parent: "" });
      }
    }
  }, [categoryForm.type, availableParentCategories]);

  // Build hierarchical category tree
  // Categories are from Category collection (top-level only)
  // Subcategories are from SubCategory collection and shown under their parent categories
  type CategoryWithChildren = Category & { children?: any[]; isSubcategory?: boolean };
  
  const buildCategoryTree = async (cats: Category[]): Promise<CategoryWithChildren[]> => {
    // Since all categories are top-level (no parent), we need to fetch subcategories and add them as children
    const categoryMap = new Map<string, CategoryWithChildren>();
    
    // Create map of categories
    cats.forEach(cat => {
      categoryMap.set(cat._id, { ...cat, children: [] });
    });

    // Fetch subcategories for each category and add them as children
    const rootCategories: CategoryWithChildren[] = [];
    for (const cat of cats) {
      const category = categoryMap.get(cat._id)!;
      
      // Fetch subcategories for this category
      try {
        const response = await fetch(`${API_BASE_URL}/subcategories/category/${cat._id}`, {
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const subcategoriesData = await handleNgrokResponse(response);
          const subcategories = Array.isArray(subcategoriesData) ? subcategoriesData : [];
          
          // Map subcategories to category-like structure for display
          // Sort subcategories by sortOrder before mapping
          const sortedSubcategories = subcategories.sort((a: any, b: any) => {
            const sortOrderA = a.sortOrder || 0;
            const sortOrderB = b.sortOrder || 0;
            if (sortOrderA !== sortOrderB) {
              return sortOrderA - sortOrderB;
            }
            // If same sortOrder, sort by createdAt (newer first)
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });
          
          category.children = sortedSubcategories.map((sub: any) => ({
            _id: sub._id,
            name: sub.name,
            description: sub.description,
            image: sub.image,
            slug: sub.slug,
            type: sub.category && typeof sub.category === 'object' ? sub.category.type : cat.type,
            parent: cat._id, // For compatibility
            sortOrder: sub.sortOrder || 0,
            category: sub.category,
            isSubcategory: true,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt
          }));
        }
      } catch (err) {
        console.error(`Error fetching subcategories for category ${cat._id}:`, err);
        category.children = [];
      }
      
      rootCategories.push(category);
    }

    // Sort by sortOrder
    const sortCategories = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
      return cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(cat => ({
        ...cat,
        children: cat.children ? sortCategories(cat.children) : []
      }));
    };

    return sortCategories(rootCategories);
  };

  // Flatten tree for display (maintaining hierarchy with indentation info)
  const flattenCategoryTree = (tree: CategoryWithChildren[], level: number = 0, parentPath: string[] = []): Array<Category & { displayLevel: number; path: string[] }> => {
    let result: Array<Category & { displayLevel: number; path: string[] }> = [];
    tree.forEach(cat => {
      const currentPath = [...parentPath, cat._id];
      result.push({ ...cat, displayLevel: level, path: currentPath });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategoryTree(cat.children, level + 1, currentPath));
      }
    });
    return result;
  };

  // Filter categories based on search query and type filter
  // Note: Categories are only top-level (no parent) - subcategories are in SubCategory collection
  useEffect(() => {
    let filtered = [...categories];

    // Apply type filter - only filter by type since categories are top-level only
    if (categoryTypeFilter !== "all") {
      filtered = filtered.filter(cat => cat.type === categoryTypeFilter);
    }

    // Apply top-level filter
    // Note: "all" shows categories with their subcategories (subcategories are fetched in buildCategoryTree)
    // "top-level" shows only top-level categories without subcategories
    // "subcategories" shows only subcategories (will be handled after tree building)

    // Apply search query
    if (categorySearchQuery.trim() !== "") {
      const query = categorySearchQuery.toLowerCase().trim();
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(query) ||
        (cat.description && cat.description.toLowerCase().includes(query)) ||
        (cat.type && cat.type.toLowerCase().includes(query))
      );
    }

    // Sort filtered categories by sortOrder before building tree
    filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    // Build tree and flatten for display
    // Fetch subcategories and build tree with them
    const buildTreeAndFlatten = async () => {
      let tree = await buildCategoryTree(filtered);
      
      // Apply level filter after building tree
      if (categoryTopLevelFilter === "top-level") {
        // Remove all children (subcategories) from tree
        tree = tree.map(cat => ({ ...cat, children: [] }));
      } else if (categoryTopLevelFilter === "subcategories") {
        // Extract only subcategories (children) from all categories
        const allSubcategories: CategoryWithChildren[] = [];
        tree.forEach(cat => {
          if (cat.children && cat.children.length > 0) {
            allSubcategories.push(...cat.children);
          }
        });
        tree = allSubcategories;
      }
      // If "all", keep tree as is (categories with their subcategories)
      
      // The tree is already sorted by sortOrder at each level in buildCategoryTree
      // flattenCategoryTree preserves the order (parent, then its children)
      // So we just need to flatten it - no additional sorting needed to maintain hierarchy
      const flattened = flattenCategoryTree(tree);
      setFilteredCategories(flattened as Category[]);
    };
    
    buildTreeAndFlatten();
  }, [categories, categorySearchQuery, categoryTypeFilter, categoryTopLevelFilter]);

  // Filter subcategories based on search query
  useEffect(() => {
    let filtered = [...subCategories];

    // Apply search query
    if (subCategorySearchQuery.trim() !== "") {
      const query = subCategorySearchQuery.toLowerCase().trim();
      filtered = filtered.filter(subCat => 
        subCat.name.toLowerCase().includes(query) ||
        (subCat.description && subCat.description.toLowerCase().includes(query)) ||
        (subCat.slug && subCat.slug.toLowerCase().includes(query)) ||
        (subCat.category && typeof subCat.category === "object" && subCat.category.name && subCat.category.name.toLowerCase().includes(query))
      );
    }

    // Sort by sortOrder, then by createdAt
    filtered.sort((a, b) => {
      const sortOrderA = a.sortOrder || 0;
      const sortOrderB = b.sortOrder || 0;
      if (sortOrderA !== sortOrderB) {
        return sortOrderA - sortOrderB;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    setFilteredSubCategories(filtered);
  }, [subCategories, subCategorySearchQuery]);

  // Auto-select single option in dropdowns
  useEffect(() => {
    // Auto-select category if only one option available (excluding placeholder)
    if (selectedType && filteredCategoriesByType.length === 1 && !productForm.category) {
      const singleCategory = filteredCategoriesByType[0];
      if (singleCategory && singleCategory._id) {
        setProductForm({
          ...productForm,
          category: singleCategory._id,
        });
        // Trigger category selection logic
        setSelectedCategoryPath([singleCategory._id]);
        fetchCategoryChildren(singleCategory._id);
      }
    }
  }, [selectedType, filteredCategoriesByType, productForm.category]);

  // Auto-select subcategory if only one option available
  useEffect(() => {
    if (productForm.category && categoryChildrenMap[productForm.category]?.length === 1 && !productForm.subcategory) {
      const singleSubcategory = categoryChildrenMap[productForm.category][0];
      if (singleSubcategory && singleSubcategory._id) {
        setProductForm({
          ...productForm,
          subcategory: singleSubcategory._id,
        });
      }
    }
  }, [productForm.category, categoryChildrenMap, productForm.subcategory]);

  // Auto-select department in sequence form if only one available
  useEffect(() => {
    const enabledDepartments = departments.filter((d: any) => d.isEnabled);
    if (enabledDepartments.length === 1 && sequenceForm.selectedDepartments.length === 0) {
      const singleDept = enabledDepartments[0];
      if (singleDept && singleDept._id) {
        setSequenceForm({
          ...sequenceForm,
          selectedDepartments: [singleDept._id],
        });
      }
    }
  }, [departments, sequenceForm.selectedDepartments.length]);

  // Auto-select category in sequence form if only one available
  useEffect(() => {
    if (sequenceForm.printType) {
      const filtered = categories.filter((cat) => {
        if (sequenceForm.printType === "digital") {
          return cat.type === "Digital" || cat.type === "digital";
        } else if (sequenceForm.printType === "bulk") {
          return cat.type === "Bulk" || cat.type === "bulk";
        }
        return false;
      }).filter(cat => !cat.parent);
      
      if (filtered.length === 1 && !sequenceForm.category) {
        const singleCategory = filtered[0];
        if (singleCategory && singleCategory._id) {
          setSequenceForm({
            ...sequenceForm,
            category: singleCategory._id,
          });
        }
      }
    }
  }, [sequenceForm.printType, categories, sequenceForm.category]);

  const getAuthHeaders = (includeContentType = false) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    };
    
    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }
    
    return headers;
  };

  // Helper function to handle API responses
  const handleNgrokResponse = async (response: Response) => {
    const text = await response.text();
    
    // Check if response is HTML (could be error page or ngrok warning)
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      // Check if it's specifically an ngrok warning
      if (text.includes("ngrok") || text.includes("Ngrok")) {
        throw new Error("Ngrok blocked request. Please try again or check your Ngrok configuration. Make sure the ngrok-skip-browser-warning header is included.");
      }
      // Otherwise it's likely a server error page
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status} ${response.statusText}`);
    }
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      // If response was not OK, throw error with parsed data
      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed: ${response.status} ${response.statusText}`);
      }
      return data;
    } catch (err) {
      // If it's already an Error (from the !response.ok check above), re-throw it
      if (err instanceof Error) {
        throw err;
      }
      // If it's not valid JSON, it might still be an error
      throw new Error(text || `Invalid response from server. Status: ${response.status} ${response.statusText}`);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      // Filter to ensure only top-level categories (no parent) are included
      // This is a safety check - server should already return only top-level categories
      const topLevelCategories = Array.isArray(data) 
        ? data.filter(cat => !cat.parent || cat.parent === null || (typeof cat.parent === 'object' && !cat.parent._id))
        : [];
      // Sort by sortOrder to maintain original order
      topLevelCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setCategories(topLevelCategories);
      setFilteredCategories(topLevelCategories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
    }
  };

  const fetchAvailableParentCategories = async (excludeId?: string) => {
    try {
      const url = excludeId 
        ? `${API_BASE_URL}/categories/available-parents?excludeId=${excludeId}`
        : `${API_BASE_URL}/categories/available-parents`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch available parent categories: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      // Sort by sortOrder, then by name (since we may not have createdAt)
      const sorted = Array.isArray(data) 
        ? data.sort((a, b) => {
            const sortOrderA = a.sortOrder || 0;
            const sortOrderB = b.sortOrder || 0;
            if (sortOrderA !== sortOrderB) {
              return sortOrderA - sortOrderB;
            }
            // If sortOrder is the same, sort by name
            return (a.name || "").localeCompare(b.name || "");
          })
        : [];
      setAvailableParentCategories(sorted);
    } catch (err) {
      console.error("Error fetching available parent categories:", err);
      // Don't show error to user, just log it
    }
  };

  const fetchSubCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subcategories`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch subcategories: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      
      // Check for subcategories with deleted parent categories
      const invalidSubCategories = data.filter((subCat: any) => 
        !subCat.category || subCat._warning
      );
      
      if (invalidSubCategories.length > 0) {
        setError(
          `Warning: ${invalidSubCategories.length} subcategor${invalidSubCategories.length === 1 ? 'y' : 'ies'} have deleted parent categories. Please reassign them to valid categories.`
        );
      }
      
      setSubCategories(data);
    } catch (err) {
      console.error("Error fetching subcategories:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch subcategories");
    }
  };

  const fetchProducts = async (categoryId?: string) => {
    try {
      let url = `${API_BASE_URL}/products`;
      
      // If categoryId is provided, fetch products for that category/subcategory
      // The /products/category/:categoryId endpoint handles both:
      // - Products where category = categoryId (direct category products)
      // - Products where subcategory = categoryId (subcategory products)
      if (categoryId) {
        url = `${API_BASE_URL}/products/category/${categoryId}`;
      }
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    }
  };

  // Filter products by search query and category/subcategory
  useEffect(() => {
    let filtered = products;

    // Filter by category/subcategory - check both category and subcategory fields
    if (selectedSubCategoryFilter) {
      filtered = filtered.filter((product) => {
        const productCategoryId = typeof product.category === 'object' 
          ? product.category._id 
          : product.category;
        const productSubcategoryId = typeof product.subcategory === 'object' 
          ? product.subcategory._id 
          : product.subcategory;
        // Match if product's category or subcategory matches the selected filter
        return productCategoryId === selectedSubCategoryFilter || 
               productSubcategoryId === selectedSubCategoryFilter;
      });
    }

    // Filter by search query
    if (productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const nameMatch = product.name?.toLowerCase().includes(query);
        const descMatch = product.description?.toLowerCase().includes(query);
        const categoryMatch = typeof product.category === 'object' 
          ? product.category.name?.toLowerCase().includes(query)
          : false;
        const subcategoryMatch = typeof product.subcategory === 'object' 
          ? product.subcategory.name?.toLowerCase().includes(query)
          : false;
        return nameMatch || descMatch || categoryMatch || subcategoryMatch;
      });
    }

    setFilteredProducts(filtered);
  }, [products, selectedSubCategoryFilter, productSearchQuery]);

  const handleSubCategoryFilterChange = async (categoryId: string) => {
    setSelectedSubCategoryFilter(categoryId);
    if (categoryId) {
      // Fetch products for selected category (works for both categories and subcategories)
      await fetchProducts(categoryId);
    } else {
      // Fetch all products
      await fetchProducts();
    }
  };

  // Fetch products for selected subcategory in product creation form
  const fetchProductsBySubcategory = async (subcategoryId: string) => {
    if (!subcategoryId) {
      setSubcategoryProducts([]);
      return;
    }

    try {
      setLoadingSubcategoryProducts(true);
      const response = await fetch(`${API_BASE_URL}/products/subcategory/${subcategoryId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await handleNgrokResponse(response);
      setSubcategoryProducts(data);
    } catch (err) {
      console.error("Error fetching subcategory products:", err);
      setSubcategoryProducts([]);
    } finally {
      setLoadingSubcategoryProducts(false);
    }
  };

  // Fetch child categories (subcategories) by parent category for hierarchical selection
  const fetchCategoryChildren = async (categoryId: string) => {
    if (!categoryId) {
      setCategoryChildrenMap(prev => {
        const newMap = { ...prev };
        delete newMap[categoryId];
        return newMap;
      });
      return;
    }

    try {
      setLoadingCategoryChildren(prev => ({ ...prev, [categoryId]: true }));
      // Use the new subcategories endpoint
      const response = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Try fallback to old endpoint for backward compatibility
        const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
          headers: getAuthHeaders(),
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await handleNgrokResponse(fallbackResponse);
          const subcategoriesArray = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);
          setCategoryChildrenMap(prev => ({
            ...prev,
            [categoryId]: subcategoriesArray
          }));
          return;
        }
        
        throw new Error(`Failed to fetch child categories: ${response.status} ${response.statusText}`);
      }

      const data = await handleNgrokResponse(response);
      // Ensure data is an array
      const subcategoriesArray = Array.isArray(data) ? data : (data?.data || []);
      setCategoryChildrenMap(prev => ({
        ...prev,
        [categoryId]: subcategoriesArray
      }));
    } catch (err) {
      console.error("Error fetching child categories:", err);
      setCategoryChildrenMap(prev => ({
        ...prev,
        [categoryId]: []
      }));
    } finally {
      setLoadingCategoryChildren(prev => {
        const newMap = { ...prev };
        delete newMap[categoryId];
        return newMap;
      });
    }
  };

  // Helper function to build category path from root to a specific category
  const buildCategoryPath = (rootCategoryId: string, targetCategoryId?: string): string[] => {
    if (!rootCategoryId) return [];
    
    const path: string[] = [rootCategoryId];
    
    if (!targetCategoryId || targetCategoryId === rootCategoryId) {
      return path;
    }
    
    // Find the target category and build path to it
    const findPathToTarget = (currentId: string, targetId: string, currentPath: string[]): string[] | null => {
      if (currentId === targetId) {
        return currentPath;
      }
      
      const children = categoryChildrenMap[currentId] || [];
      for (const child of children) {
        const newPath = [...currentPath, child._id];
        const result = findPathToTarget(child._id, targetId, newPath);
        if (result) return result;
      }
      
      return null;
    };
    
    // Try to find path in already loaded children
    const foundPath = findPathToTarget(rootCategoryId, targetCategoryId, path);
    if (foundPath) {
      return foundPath;
    }
    
    // If not found in loaded children, search in all categories
    const targetCategory = categories.find(cat => cat._id === targetCategoryId);
    if (targetCategory) {
      // Build path by traversing parent chain
      const reversePath: string[] = [];
      let currentId: string | null = targetCategoryId;
      
      while (currentId) {
        reversePath.unshift(currentId);
        if (currentId === rootCategoryId) break;
        
        const cat = categories.find(c => c._id === currentId);
        if (!cat || !cat.parent) break;
        
        currentId = typeof cat.parent === "object" ? cat.parent._id : cat.parent;
        if (reversePath.includes(currentId)) break; // Prevent loops
      }
      
      return reversePath;
    }
    
    return path;
  };

  // Filter categories by selected type - only show top-level categories (no parent)
  useEffect(() => {
    if (selectedType) {
      // Filter by type and only show top-level categories (those without a parent)
      const filtered = categories.filter(cat => 
        cat.type === selectedType && 
        (!cat.parent || cat.parent === null || (typeof cat.parent === 'object' && !cat.parent._id))
      );
      setFilteredCategoriesByType(filtered);
    } else {
      setFilteredCategoriesByType([]);
    }
    // Reset category path when type changes
    if (selectedType) {
      setProductForm(prev => ({
        ...prev,
        category: "",
        subcategory: "",
      }));
      setSelectedCategoryPath([]);
      setCategoryChildrenMap({});
    }
  }, [selectedType, categories]);

  // Fetch child categories when a category in the path is selected
  useEffect(() => {
    // Fetch children for the last category in the path (if any)
    const lastCategoryId = selectedCategoryPath[selectedCategoryPath.length - 1];
    if (lastCategoryId && !categoryChildrenMap[lastCategoryId]) {
      fetchCategoryChildren(lastCategoryId);
    }
    
    // Also fetch children for all categories in the path to ensure we have the data
    selectedCategoryPath.forEach(categoryId => {
      if (!categoryChildrenMap[categoryId]) {
        fetchCategoryChildren(categoryId);
      }
    });
  }, [selectedCategoryPath]);

  // Helper function to recursively fetch all products from a category and its subcategories
  const fetchAllProductsFromCategory = async (categoryId: string): Promise<Product[]> => {
    const allProducts: Product[] = [];
    
    try {
      // Fetch products directly under this category
      const productsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });
      
      if (productsResponse.ok) {
        const productsData = await handleNgrokResponse(productsResponse);
        if (Array.isArray(productsData)) {
          allProducts.push(...productsData);
        }
      }
      
      // Fetch child categories (subcategories) from SubCategory collection
      const subcategoriesResponse = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });
      
      if (subcategoriesResponse.ok) {
        const subcategoriesData = await handleNgrokResponse(subcategoriesResponse);
        const childCategories = Array.isArray(subcategoriesData) ? subcategoriesData : (subcategoriesData?.data || []);
        
        // Recursively fetch products from each subcategory
        for (const childCategory of childCategories) {
          const childProducts = await fetchAllProductsFromCategory(childCategory._id);
          allProducts.push(...childProducts);
        }
      } else {
        // Try fallback to old endpoint for backward compatibility
        try {
          const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
            headers: getAuthHeaders(),
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await handleNgrokResponse(fallbackResponse);
            const childCategories = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);
            
            for (const childCategory of childCategories) {
              const childProducts = await fetchAllProductsFromCategory(childCategory._id);
              allProducts.push(...childProducts);
            }
          }
        } catch (fallbackErr) {
          // Ignore fallback errors
        }
      }
    } catch (err) {
      console.error(`Error fetching products from category ${categoryId}:`, err);
    }
    
    return allProducts;
  };

  // Handle category click to show products directly and allow adding products
  const handleCategoryClick = async (categoryId: string) => {
    if (selectedCategory === categoryId) {
      // If same category clicked, collapse it
      setSelectedCategory(null);
      setCategorySubcategories([]);
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);
    } else {
      // Fetch products directly under this category and all subcategories
      setSelectedCategory(categoryId);
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);
      
      try {
        setLoadingCategoryProducts(true);
        
        // Fetch products directly under this category (without subcategory)
        const productsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
          headers: getAuthHeaders(),
        });
        
        let directProducts: Product[] = [];
        if (productsResponse.ok) {
          const productsData = await handleNgrokResponse(productsResponse);
          // Filter to only include products without subcategory (directly added to category)
          if (Array.isArray(productsData)) {
            directProducts = productsData.filter((product: Product) => 
              !product.subcategory || product.subcategory === null || 
              (typeof product.subcategory === 'string' && product.subcategory === '')
            );
          }
        }
        
        // Also fetch subcategories for this category from SubCategory collection
        let childCategories: any[] = [];
        try {
          // Fetch subcategories from SubCategory collection
          const response = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}`, {
            headers: getAuthHeaders(),
          });
          
          if (response.ok) {
            const data = await handleNgrokResponse(response);
            childCategories = Array.isArray(data) ? data : (data?.data || []);
            // Sort by sortOrder, then by createdAt
            childCategories.sort((a, b) => {
              const sortOrderA = a.sortOrder || 0;
              const sortOrderB = b.sortOrder || 0;
              if (sortOrderA !== sortOrderB) {
                return sortOrderA - sortOrderB;
              }
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });
            setCategorySubcategories(childCategories);
          }
        } catch (subcatErr) {
          console.error("Error fetching subcategories:", subcatErr);
          setCategorySubcategories([]);
        }
        
          // If there are subcategories, also fetch products from all subcategories
          if (childCategories.length > 0) {
            const allSubcategoryProducts: Product[] = [];
            for (const childCategory of childCategories) {
              try {
                // First priority: Fetch products with this subcategory
                let subcategoryProducts: Product[] = [];
                const subProductsResponse = await fetch(`${API_BASE_URL}/products/subcategory/${childCategory._id}`, {
                  headers: getAuthHeaders(),
                });
                if (subProductsResponse.ok) {
                  const subProductsData = await handleNgrokResponse(subProductsResponse);
                  if (Array.isArray(subProductsData)) {
                    subcategoryProducts = subProductsData;
                  }
                }
                
                // If no products found with subcategory, fall back to category products
                if (subcategoryProducts.length === 0) {
                  const categoryProductsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
                    headers: getAuthHeaders(),
                  });
                  if (categoryProductsResponse.ok) {
                    const categoryProductsData = await handleNgrokResponse(categoryProductsResponse);
                    if (Array.isArray(categoryProductsData)) {
                      // Filter to only include products without subcategory (directly added to category)
                      const directCategoryProducts = categoryProductsData.filter((p: Product) => 
                        !p.subcategory || p.subcategory === null || 
                        (typeof p.subcategory === 'string' && p.subcategory === '')
                      );
                      subcategoryProducts = directCategoryProducts;
                    }
                  }
                }
                
                // Deduplicate by product ID before adding
                const existingIds = new Set(allSubcategoryProducts.map(p => p._id));
                const newProducts = subcategoryProducts.filter((p: Product) => !existingIds.has(p._id));
                allSubcategoryProducts.push(...newProducts);
              } catch (err) {
                console.error(`Error fetching products from subcategory ${childCategory._id}:`, err);
              }
            }
            // Combine direct products and subcategory products
            setCategoryProducts([...directProducts, ...allSubcategoryProducts]);
          } else {
            // No subcategories, just show direct products
            setCategoryProducts(directProducts);
          }
      } catch (err) {
        console.error("Error fetching category products:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch category products");
        setCategoryProducts([]);
      } finally {
        setLoadingCategoryProducts(false);
      }
    }
  };

  // Handle subcategory click to show products for that specific subcategory
  const handleSubCategoryClick = async (subcategoryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (selectedSubCategoryForView === subcategoryId) {
      // If same subcategory clicked, collapse it
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);
    } else {
      setSelectedSubCategoryForView(subcategoryId);
      
      try {
        setLoadingCategoryProducts(true);
        
        // First priority: Fetch products with this specific subcategory
        let subcategoryProducts: Product[] = [];
        try {
          const subcatProductsResponse = await fetch(`${API_BASE_URL}/products/subcategory/${subcategoryId}`, {
            headers: getAuthHeaders(),
          });
          if (subcatProductsResponse.ok) {
            const subcatProductsData = await handleNgrokResponse(subcatProductsResponse);
            subcategoryProducts = Array.isArray(subcatProductsData) ? subcatProductsData : [];
          }
        } catch (subcatErr) {
          console.error("Error fetching subcategory products:", subcatErr);
        }
        
        // If no products found with subcategory, fall back to parent category products
        if (subcategoryProducts.length === 0 && selectedCategory) {
          console.log("No products found with subcategory, trying parent category products...");
          try {
            const categoryProductsResponse = await fetch(`${API_BASE_URL}/products/category/${selectedCategory}`, {
              headers: getAuthHeaders(),
            });
            if (categoryProductsResponse.ok) {
              const categoryProductsData = await handleNgrokResponse(categoryProductsResponse);
              // Filter to only include products without subcategory (directly added to category)
              if (Array.isArray(categoryProductsData)) {
                const directCategoryProducts = categoryProductsData.filter((product: Product) => 
                  !product.subcategory || product.subcategory === null || 
                  (typeof product.subcategory === 'string' && product.subcategory === '')
                );
                subcategoryProducts = directCategoryProducts;
                console.log(`Found ${subcategoryProducts.length} product(s) in parent category ${selectedCategory}`);
              }
            }
          } catch (categoryErr) {
            console.error("Error fetching category products as fallback:", categoryErr);
          }
        }
        
        setCategoryProducts(subcategoryProducts);
      } catch (err) {
        console.error("Error fetching subcategory products:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch subcategory products");
        setCategoryProducts([]);
      } finally {
        setLoadingCategoryProducts(false);
      }
    }
  };

  // Auto-scroll function for drag and drop with improved smoothness
  const handleAutoScroll = (e: React.DragEvent | MouseEvent, container: HTMLElement | null) => {
    if (!container || !draggedCategoryId) {
      stopAutoScroll();
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const mouseY = 'clientY' in e ? e.clientY : e.clientY;
    const scrollThreshold = 80; // Distance from edge to trigger scroll
    const maxScrollSpeed = 20; // Maximum pixels to scroll per frame
    const minScrollSpeed = 5; // Minimum pixels to scroll per frame

    // Calculate distance from top and bottom edges
    const distanceFromTop = mouseY - containerRect.top;
    const distanceFromBottom = containerRect.bottom - mouseY;

    // Determine if we should scroll and calculate speed
    let shouldScroll = false;
    let scrollDirection: 'up' | 'down' | null = null;
    let scrollSpeed = 0;

    // Check if near top edge and can scroll up
    if (distanceFromTop < scrollThreshold && container.scrollTop > 0) {
      shouldScroll = true;
      scrollDirection = 'up';
      // Calculate speed based on proximity to edge (closer = faster)
      const proximity = Math.max(0, scrollThreshold - distanceFromTop);
      scrollSpeed = minScrollSpeed + (proximity / scrollThreshold) * (maxScrollSpeed - minScrollSpeed);
    }
    // Check if near bottom edge and can scroll down
    else if (distanceFromBottom < scrollThreshold) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (container.scrollTop < maxScroll) {
        shouldScroll = true;
        scrollDirection = 'down';
        // Calculate speed based on proximity to edge (closer = faster)
        const proximity = Math.max(0, scrollThreshold - distanceFromBottom);
        scrollSpeed = minScrollSpeed + (proximity / scrollThreshold) * (maxScrollSpeed - minScrollSpeed);
      }
    }

    // Clear existing timeout if direction changed or should stop
    if (autoScrollIntervalRef.current) {
      clearTimeout(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    // Start scrolling if needed
    if (shouldScroll && scrollDirection) {
      const scroll = () => {
        if (!container) {
          stopAutoScroll();
          return;
        }

        if (scrollDirection === 'up') {
          if (container.scrollTop > 0) {
            container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
            // Continue scrolling
            autoScrollIntervalRef.current = setTimeout(scroll, 16);
          } else {
            stopAutoScroll();
          }
        } else if (scrollDirection === 'down') {
          const maxScroll = container.scrollHeight - container.clientHeight;
          if (container.scrollTop < maxScroll) {
            container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollSpeed);
            // Continue scrolling
            autoScrollIntervalRef.current = setTimeout(scroll, 16);
          } else {
            stopAutoScroll();
          }
        }
      };
      
      // Start the scroll loop
      scroll();
    } else {
      stopAutoScroll();
    }
  };

  // Stop auto-scroll
  const stopAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearTimeout(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  // Handle category reorder via drag and drop
  const handleCategoryReorder = async (draggedId: string, targetId: string, targetIndex: number) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to reorder these categories? This will update the sort order for all affected categories."
    );
    
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Get the dragged category - first try filteredCategories (what user sees), then categories
      let draggedCategory = filteredCategories.find(cat => cat._id === draggedId);
      if (!draggedCategory) {
        draggedCategory = categories.find(cat => cat._id === draggedId);
      }
      
      // If still not found, try to fetch it from the API
      if (!draggedCategory) {
        try {
          const response = await fetch(`${API_BASE_URL}/categories/${draggedId}`, {
            method: "GET",
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            const fetchedCategory = await handleNgrokResponse(response);
            draggedCategory = fetchedCategory;
          } else {
            // If not found in categories, it might be a subcategory - try subcategories endpoint
            try {
              const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${draggedId}`, {
                method: "GET",
                headers: getAuthHeaders(),
              });
              if (subcatResponse.ok) {
                const fetchedSubcat = await handleNgrokResponse(subcatResponse);
                // Convert subcategory to category-like format for compatibility
                draggedCategory = {
                  ...fetchedSubcat,
                  parent: fetchedSubcat.category,
                  type: fetchedSubcat.category && typeof fetchedSubcat.category === 'object' 
                    ? fetchedSubcat.category.type 
                    : 'Digital'
                } as Category;
              }
            } catch (subcatErr) {
              console.error("Error fetching dragged subcategory:", subcatErr);
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching dragged category:", fetchErr);
        }
      }

      if (!draggedCategory) {
        setError(`Dragged category not found (ID: ${draggedId}). Please refresh the page and try again.`);
        setLoading(false);
        return;
      }

      // Check if dragged category is actually a subcategory - if so, redirect to subcategory reorder
      const isDraggedSubcategory = (draggedCategory as any).isSubcategory || 
                                   ((draggedCategory as any).displayLevel && (draggedCategory as any).displayLevel > 0);
      if (isDraggedSubcategory) {
        setError("Subcategories should be reordered in their own section. Please use the subcategory drag and drop.");
        setLoading(false);
        return;
      }

      // Get the target category - first try filteredCategories (what user sees), then categories
      let targetCategory = filteredCategories.find(cat => cat._id === targetId);
      if (!targetCategory) {
        targetCategory = categories.find(cat => cat._id === targetId);
      }
      
      // If still not found, try to fetch it from the API
      if (!targetCategory) {
        try {
          const response = await fetch(`${API_BASE_URL}/categories/${targetId}`, {
            method: "GET",
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            const fetchedCategory = await handleNgrokResponse(response);
            targetCategory = fetchedCategory;
          } else {
            // If not found in categories, it might be a subcategory
            try {
              const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${targetId}`, {
                method: "GET",
                headers: getAuthHeaders(),
              });
              if (subcatResponse.ok) {
                const fetchedSubcat = await handleNgrokResponse(subcatResponse);
                // Convert subcategory to category-like format for compatibility
                targetCategory = {
                  ...fetchedSubcat,
                  parent: fetchedSubcat.category,
                  type: fetchedSubcat.category && typeof fetchedSubcat.category === 'object' 
                    ? fetchedSubcat.category.type 
                    : 'Digital'
                } as Category;
              }
            } catch (subcatErr) {
              console.error("Error fetching target subcategory:", subcatErr);
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching target category:", fetchErr);
        }
      }

      if (!targetCategory) {
        setError(`Target category not found (ID: ${targetId}). Please refresh the page and try again.`);
        setLoading(false);
        return;
      }

      // Check if target category is actually a subcategory - if so, redirect to subcategory reorder
      const isTargetSubcategory = (targetCategory as any).isSubcategory || 
                                  ((targetCategory as any).displayLevel && (targetCategory as any).displayLevel > 0);
      if (isTargetSubcategory) {
        setError("Subcategories should be reordered in their own section. Please use the subcategory drag and drop.");
        setLoading(false);
        return;
      }

      // Get the parent ID of the dragged category (null for top-level)
      const draggedParentId = draggedCategory.parent 
        ? (typeof draggedCategory.parent === 'object' ? draggedCategory.parent._id : draggedCategory.parent)
        : null;

      // Get the parent ID of the target category
      const targetParentId = targetCategory.parent 
        ? (typeof targetCategory.parent === 'object' ? targetCategory.parent._id : targetCategory.parent)
        : null;

      // Only allow reordering within the same level (same parent)
      if (draggedParentId !== targetParentId) {
        setError("Cannot reorder categories across different levels. Categories must have the same parent.");
        setLoading(false);
        return;
      }

      // Get all categories at the same level (same parent) from both filtered and main categories
      // Combine and deduplicate by _id
      const allCategoriesCombined = [
        ...categories,
        ...filteredCategories.filter(fc => !categories.find(c => c._id === fc._id))
      ];
      
      const allSiblings = allCategoriesCombined
        .filter(cat => {
          const catParentId = cat.parent 
            ? (typeof cat.parent === 'object' ? cat.parent._id : cat.parent)
            : null;
          return catParentId === draggedParentId;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Get filtered siblings (categories visible in the current filtered view at the same level)
      const filteredSiblings = filteredCategories
        .filter(cat => {
          const catParentId = cat.parent 
            ? (typeof cat.parent === 'object' ? cat.parent._id : cat.parent)
            : null;
          return catParentId === draggedParentId;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Find indices in filtered siblings
      const draggedFilteredIndex = filteredSiblings.findIndex(cat => cat._id === draggedId);
      const targetFilteredIndex = filteredSiblings.findIndex(cat => cat._id === targetId);

      if (draggedFilteredIndex === -1 || targetFilteredIndex === -1) {
        setError("Category not found in filtered view");
        setLoading(false);
        return;
      }

      // Get the target category from all siblings
      const targetCategoryInSiblings = allSiblings.find(cat => cat._id === targetId);
      if (!targetCategoryInSiblings) {
        setError("Target category not found in siblings");
        setLoading(false);
        return;
      }

      // Get sortOrder values
      const draggedSortOrder = draggedCategory.sortOrder ?? 0;
      const targetSortOrder = targetCategoryInSiblings.sortOrder ?? 0;

      // If they're the same, no need to update
      if (draggedSortOrder === targetSortOrder) {
        setSuccess("Categories are already in the same position");
        setLoading(false);
        return;
      }

      // Find indices in all siblings
      const draggedIndex = allSiblings.findIndex(cat => cat._id === draggedId);
      const targetIndex = allSiblings.findIndex(cat => cat._id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setError("Could not find categories in siblings list");
        setLoading(false);
        return;
      }

      // Build the list of categories to update with insert logic
      const categoriesToUpdate: { id: string; sortOrder: number }[] = [];
      
      // The dragged category gets the target's sortOrder
      categoriesToUpdate.push({ id: draggedId, sortOrder: targetSortOrder });

      // Update all items that need to shift based on drag direction
      if (draggedIndex < targetIndex) {
        // Dragging from left to right (e.g., drag position 1 to 4):
        // - Dragged item gets target's sortOrder (4)
        // - Items between dragged and target shift left (decrease by 1)
        // - Target item shifts right (increase by 1)
        for (let i = draggedIndex + 1; i <= targetIndex; i++) {
          const item = allSiblings[i];
          const currentSortOrder = item.sortOrder ?? i;
          if (i === targetIndex) {
            // Target item shifts right (gets +1)
            categoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder + 1 });
          } else {
            // Items between shift left (get -1)
            categoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder - 1 });
          }
        }
      } else {
        // Dragging from right to left (e.g., drag position 4 to 1):
        // - Dragged item gets target's sortOrder (1)
        // - Target item and items between shift right (increase by 1)
        for (let i = targetIndex; i < draggedIndex; i++) {
          const item = allSiblings[i];
          const currentSortOrder = item.sortOrder ?? i;
          // All items from target to dragged shift right (get +1)
          categoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder + 1 });
        }
      }

      // Update all affected categories
      const updatePromises = categoriesToUpdate.map(async ({ id, sortOrder }) => {
        // Try to get category data from combined sources
        let currentCat = categories.find(c => c._id === id) || 
                        filteredCategories.find(c => c._id === id);
        
        // If not found, fetch from API
        if (!currentCat) {
          try {
            const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
              method: "GET",
              headers: getAuthHeaders(),
            });
            if (response.ok) {
              currentCat = await handleNgrokResponse(response);
            }
          } catch (fetchErr) {
            console.error(`Error fetching category ${id}:`, fetchErr);
          }
        }

        const formData = new FormData();
        formData.append("sortOrder", sortOrder.toString());
        
        if (currentCat) {
          formData.append("name", currentCat.name);
          formData.append("description", currentCat.description || "");
          formData.append("type", currentCat.type);
          if (currentCat.parent) {
            const parentId = typeof currentCat.parent === 'object' ? currentCat.parent._id : currentCat.parent;
            formData.append("parent", parentId);
          } else {
            formData.append("parent", "");
          }
          if (currentCat.slug) {
            formData.append("slug", currentCat.slug);
          }
        } else {
          // If we can't find the category, still try to update with just sortOrder
          console.warn(`Category ${id} not found in local state, updating with sortOrder only`);
        }
        
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
          throw new Error(`Failed to update category ${id}: ${errorData.error || response.statusText}`);
        }
        
        return response;
      });

      await Promise.all(updatePromises);

      setSuccess(`Category moved successfully! Category moved from position ${draggedSortOrder + 1} to ${targetSortOrder + 1}.`);
      // Refresh categories to get updated order - this will update the service page too
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder categories");
    } finally {
      setLoading(false);
    }
  };

  // Handle subcategory reorder via drag and drop
  const handleSubCategoryReorder = async (draggedId: string, targetId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to reorder these subcategories? This will update the sort order for all affected subcategories."
    );
    
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Try to find dragged subcategory from categorySubcategories first, then from filteredCategories
      let draggedSubCategory = categorySubcategories.find(subCat => subCat._id === draggedId);
      if (!draggedSubCategory) {
        // Try to find in filteredCategories (main list)
        const draggedFromList = filteredCategories.find(cat => cat._id === draggedId && (cat as any).isSubcategory);
        if (draggedFromList) {
          draggedSubCategory = draggedFromList as any;
        }
      }
      
      if (!draggedSubCategory) {
        setError("Dragged subcategory not found");
        setLoading(false);
        return;
      }

      // Try to find target subcategory from categorySubcategories first, then from filteredCategories
      let targetSubCategory = categorySubcategories.find(subCat => subCat._id === targetId);
      if (!targetSubCategory) {
        // Try to find in filteredCategories (main list)
        const targetFromList = filteredCategories.find(cat => cat._id === targetId && (cat as any).isSubcategory);
        if (targetFromList) {
          targetSubCategory = targetFromList as any;
        }
      }
      
      if (!targetSubCategory) {
        setError("Target subcategory not found");
        setLoading(false);
        return;
      }

      // Verify both subcategories belong to the same parent category
      const draggedCategoryId = draggedSubCategory.category 
        ? (typeof draggedSubCategory.category === 'object' ? draggedSubCategory.category._id : draggedSubCategory.category)
        : null;
      const targetCategoryId = targetSubCategory.category 
        ? (typeof targetSubCategory.category === 'object' ? targetSubCategory.category._id : targetSubCategory.category)
        : null;

      if (draggedCategoryId !== targetCategoryId) {
        setError("Cannot reorder subcategories across different categories.");
        setLoading(false);
        return;
      }

      // Get all subcategories for this category, sorted by current sortOrder
      // First try from categorySubcategories, then from filteredCategories, then fetch from API
      let allSubcategoriesForCategory = [...categorySubcategories];
      if (allSubcategoriesForCategory.length === 0 || !allSubcategoriesForCategory.some(sc => {
        const scCategoryId = sc.category 
          ? (typeof sc.category === 'object' ? sc.category._id : sc.category)
          : null;
        return scCategoryId === draggedCategoryId;
      })) {
        // Get from filteredCategories (main list)
        const fromList = filteredCategories
          .filter(cat => {
            const isSub = (cat as any).isSubcategory || (cat as any).displayLevel > 0;
            if (!isSub) return false;
            const scCategoryId = (cat as any).category 
              ? (typeof (cat as any).category === 'object' ? (cat as any).category._id : (cat as any).category)
              : ((cat as any).parent ? (typeof (cat as any).parent === 'object' ? (cat as any).parent._id : (cat as any).parent) : null);
            return scCategoryId === draggedCategoryId;
          }) as any[];
        if (fromList.length > 0) {
          allSubcategoriesForCategory = fromList;
        } else {
          // Fetch from API
          try {
            const response = await fetch(`${API_BASE_URL}/subcategories/category/${draggedCategoryId}`, {
              headers: getAuthHeaders(),
            });
            if (response.ok) {
              const data = await handleNgrokResponse(response);
              allSubcategoriesForCategory = Array.isArray(data) ? data : (data?.data || []);
            }
          } catch (err) {
            console.error("Error fetching subcategories:", err);
          }
        }
      }
      
      const sortedSubcategories = allSubcategoriesForCategory
        .filter(sc => {
          const scCategoryId = sc.category 
            ? (typeof sc.category === 'object' ? sc.category._id : sc.category)
            : (sc.parent ? (typeof sc.parent === 'object' ? sc.parent._id : sc.parent) : null);
          return scCategoryId === draggedCategoryId;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Find indices of dragged and target subcategories
      const draggedIndex = sortedSubcategories.findIndex(sc => sc._id === draggedId);
      const targetIndex = sortedSubcategories.findIndex(sc => sc._id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setError("Could not find subcategories in sorted list");
        setLoading(false);
        return;
      }

      // If they're already in the same position, no need to update
      if (draggedIndex === targetIndex) {
        setSuccess("Subcategories are already in the same position");
        setLoading(false);
        return;
      }

      // Get the target's sortOrder (the position we're inserting into)
      const targetSortOrder = sortedSubcategories[targetIndex].sortOrder || targetIndex;

      // Build the list of items to update
      const subcategoriesToUpdate: Array<{ id: string; sortOrder: number }> = [];
      
      // The dragged item gets the target's sortOrder
      subcategoriesToUpdate.push({ id: draggedId, sortOrder: targetSortOrder });

      // Update all items that need to shift based on drag direction
      if (draggedIndex < targetIndex) {
        // Dragging from left to right (e.g., drag position 1 to 4):
        // - Dragged item gets target's sortOrder (4)
        // - Items between dragged and target shift left (decrease by 1): positions 2,3 get sortOrder 1,2
        // - Target item shifts right (increase by 1): position 4 gets sortOrder 5
        for (let i = draggedIndex + 1; i <= targetIndex; i++) {
          const item = sortedSubcategories[i];
          const currentSortOrder = item.sortOrder || i;
          if (i === targetIndex) {
            // Target item shifts right (gets +1, so 4 → 5)
            subcategoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder + 1 });
          } else {
            // Items between shift left (get -1, so 2→1, 3→2)
            subcategoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder - 1 });
          }
        }
      } else {
        // Dragging from right to left (e.g., drag position 4 to 1):
        // - Dragged item gets target's sortOrder (1)
        // - Target item and items between shift right (increase by 1): positions 1,2,3 get sortOrder 2,3,4
        for (let i = targetIndex; i < draggedIndex; i++) {
          const item = sortedSubcategories[i];
          const currentSortOrder = item.sortOrder || i;
          // All items from target to dragged shift right (get +1, so 1→2, 2→3, 3→4)
          subcategoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder + 1 });
        }
      }

      // Update all affected subcategories with new sortOrder values
      const updatePromises = subcategoriesToUpdate.map(({ id, sortOrder }) => {
        const formData = new FormData();
        formData.append("sortOrder", sortOrder.toString());
        const currentSubCat = categorySubcategories.find(sc => sc._id === id);
        if (currentSubCat) {
          formData.append("name", currentSubCat.name);
          formData.append("description", currentSubCat.description || "");
          formData.append("category", draggedCategoryId || "");
          if (currentSubCat.slug) {
            formData.append("slug", currentSubCat.slug);
          }
        }
        return fetch(`${API_BASE_URL}/subcategories/${id}`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });
      });

      await Promise.all(updatePromises);

      setSuccess(`Subcategory "${draggedSubCategory.name}" moved successfully!`);
      
      // Update local state immediately for better UX - insert at new position
      const updatedSubcategories = categorySubcategories.map(subCat => {
        const update = subcategoriesToUpdate.find(u => u.id === subCat._id);
        if (update) {
          return { ...subCat, sortOrder: update.sortOrder };
        }
        return subCat;
      });
      setCategorySubcategories(updatedSubcategories);
      
      // Refresh subcategories from server to ensure consistency
      if (selectedCategory) {
        await handleCategoryClick(selectedCategory);
      }
      
      // Refresh categories to update the main list
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder subcategories");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubCategoryToCategory = (categoryId: string) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (category) {
      // Pre-populate subcategory form with the selected category and its type
      setSubCategoryForm({
        name: "",
        description: "",
        category: categoryId,
        type: category.type || "",
        slug: "",
        sortOrder: 0,
        image: null,
      });
      setEditingSubCategoryId(null);
      setEditingSubCategoryImage(null);
      // Switch to categories tab to show the subcategory form
      setActiveTab("categories");
      setError(null);
      setSuccess(null);
    }
  };

  const handleAddProductToCategory = (categoryId: string, subcategoryId?: string) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (category) {
      // Set the type and category in the product form
      setSelectedType(category.type || "");
      
      // Build category path - if subcategory is provided, build the full path
      let categoryPath: string[] = [categoryId];
      if (subcategoryId) {
        // Build path from root category to subcategory
        categoryPath = buildCategoryPath(categoryId, subcategoryId);
      }
      setSelectedCategoryPath(categoryPath);
      
      // Set category and subcategory in product form
      setProductForm({
        ...productForm,
        category: categoryId,
        subcategory: subcategoryId || "", // Set subcategory if provided
      });
      
      // Filter categories by type
      if (category.type) {
        const filtered = categories.filter(cat => cat.type === category.type);
        setFilteredCategoriesByType(filtered);
      }
      
      // If subcategory is provided, fetch its children for the hierarchical selector
      if (subcategoryId) {
        fetchCategoryChildren(subcategoryId);
      }
      
      // Fetch children for all categories in the path
      categoryPath.forEach(catId => {
        fetchCategoryChildren(catId);
      });
      
      // Switch to products tab
      setActiveTab("products");
      setError(null);
      setSuccess(null);
    }
  };

  // Handle subcategory selection to show products
  const handleSubCategorySelect = async (subcategoryId: string) => {
    // Validate that we have a subcategoryId
    if (!subcategoryId) {
      console.error("No subcategory ID provided");
      setError("No subcategory ID provided. Please refresh and try again.");
      return;
    }
    
    // Convert to string and validate it's a proper MongoDB ObjectId (24 hex characters)
    const subcategoryIdString = String(subcategoryId).trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subcategoryIdString);
    
    if (!isObjectId) {
      console.error("Invalid subcategory ID format. Expected MongoDB ObjectId (24 hex characters), got:", subcategoryIdString);
      setError(`Invalid subcategory ID format: "${subcategoryIdString}". Please refresh the page and try again.`);
      return;
    }
    
    // Log the subcategoryId to help debug
    console.log("handleSubCategorySelect called with valid ID:", subcategoryIdString);

    if (selectedSubCategoryForView === subcategoryIdString) {
      // If same subcategory clicked, collapse it
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);
    } else {
      // Clear previous products immediately
      setCategoryProducts([]);
      setSelectedSubCategoryForView(subcategoryIdString);
      
      try {
        setLoadingCategoryProducts(true);
        setError(null);
        
        // Ensure we're using the correct ID format (already validated above)
        const url = `${API_BASE_URL}/products/subcategory/${subcategoryIdString}`;
        console.log("=== Fetching Products by Subcategory ===");
        console.log("Subcategory ID:", subcategoryIdString);
        console.log("Request URL:", url);
        console.log("Request Method: GET");
        
        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });
        
        console.log("Response Status:", response.status, response.statusText);
        console.log("Response OK:", response.ok);
        
        if (!response.ok) {
          let errorMessage = `Failed to fetch products: ${response.status} ${response.statusText}`;
          try {
            const errorText = await response.clone().text();
            console.error("API Error Response Text:", errorText);
            
            // Try to parse as JSON for better error message
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = errorJson.error;
              }
            } catch {
              // If not JSON, use the text as is
              if (errorText && errorText.trim()) {
                errorMessage = errorText;
              }
            }
          } catch (parseErr) {
            console.error("Error parsing error response:", parseErr);
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await handleNgrokResponse(response);
        console.log("=== Products Response ===");
        console.log("Response Type:", typeof data);
        console.log("Is Array:", Array.isArray(data));
        console.log("Products Count:", Array.isArray(data) ? data.length : "N/A");
        console.log("Products Data:", data);
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          if (data.length === 0) {
            console.log("No products found for this subcategory");
          } else {
            console.log(`Successfully fetched ${data.length} product(s)`);
            // Log first product structure for debugging
            if (data[0]) {
              console.log("First product structure:", {
                _id: data[0]._id,
                name: data[0].name,
                subcategory: data[0].subcategory,
              });
            }
          }
          setCategoryProducts(data);
        } else {
          console.error("Expected array but got:", typeof data, data);
          setCategoryProducts([]);
          setError("Invalid response format from server. Expected an array of products.");
        }
      } catch (err) {
        console.error("=== Error Fetching Subcategory Products ===");
        console.error("Error Type:", err instanceof Error ? err.constructor.name : typeof err);
        console.error("Error Message:", err instanceof Error ? err.message : String(err));
        console.error("Full Error:", err);
        
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch products";
        setError(errorMessage);
        setCategoryProducts([]);
      } finally {
        setLoadingCategoryProducts(false);
        console.log("=== Request Complete ===");
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch employees");
    }
  };

  const fetchUploads = async (includeImages = false) => {
    setLoadingUploads(true);
    try {
      // By default, don't include images to prevent timeout
      // Images can be loaded individually via getUploadById when needed
      const url = `${API_BASE_URL}/admin/uploads${includeImages ? '?includeImages=true' : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      // Use handleNgrokResponse which handles both success and error cases
      // This prevents reading the response body multiple times
      const data = await handleNgrokResponse(response);
      
      // Handle timeout errors specifically if needed
      if (response.status === 503) {
        throw new Error(data.error || "Database connection timeout. Try again without images.");
      }
      // Handle both new format (with uploads array) and legacy format (direct array)
      const uploadsList = Array.isArray(data) ? data : (data.uploads || []);
      setUploads(uploadsList);
    } catch (err) {
      console.error("Error fetching uploads:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch uploaded images");
    } finally {
      setLoadingUploads(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  // Attribute Type Management Functions
  const fetchAttributeTypes = async () => {
    setLoadingAttributeTypes(true);
    try {
      // Fetch all attribute types with usage status
      const url = `${API_BASE_URL}/attribute-types`;
      console.log("Fetching attribute types from:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      
      console.log("Attribute types response status:", response.status, response.statusText);
      
      // Check response status before parsing
      if (!response.ok) {
        if (response.status === 404) {
          // Route might not exist - return empty array instead of error
          console.warn("Attribute types endpoint not found (404). The server may need to be restarted. Returning empty array.");
          setAttributeTypes([]);
          return;
        }
        throw new Error(`Failed to fetch attribute types: ${response.status} ${response.statusText}`);
      }
      
      const data = await handleNgrokResponse(response);
      setAttributeTypes(data.data || data || []);
    } catch (err) {
      console.error("Error fetching attribute types:", err);
      // If it's a 404, just set empty array instead of showing error
      if (err instanceof Error && (err.message.includes("404") || err.message.includes("Not Found"))) {
        console.warn("Attribute types endpoint returned 404. Please restart the server to register the route.");
        setAttributeTypes([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch attribute types");
      }
    } finally {
      setLoadingAttributeTypes(false);
    }
  };

  // Convert simplified form to full attribute type structure
  const convertFormToAttributeType = () => {
    // Convert attributeOptionsTable to attributeValues
    let attributeValues: Array<{ value: string; label: string; priceMultiplier: number; description: string; image: string }> = [];
    
    // Use attributeOptionsTable if it has entries
    if (attributeTypeForm.attributeOptionsTable && attributeTypeForm.attributeOptionsTable.length > 0) {
      attributeValues = attributeTypeForm.attributeOptionsTable
        .filter(opt => opt.name.trim() !== "") // Only include options with names
        .map((option) => {
          const priceImpact = parseFloat(option.priceImpactPer1000) || 0;
          // Convert price impact per 1000 units to a multiplier
          // If admin enters "20 per 1000", that means +₹20 for every 1000 units
          // Per unit: 20/1000 = ₹0.02 per unit
          // We'll use a percentage approach: 20 per 1000 = 2% = 1.02 multiplier
          const multiplier = priceImpact > 0 ? 1 + (priceImpact / 1000) : 1.0;
          
          return {
            value: option.name.toLowerCase().replace(/\s+/g, '-'),
            label: option.name,
            priceMultiplier: multiplier,
            description: "",
            image: option.image || "",
          };
        });
    } else if (attributeTypeForm.simpleOptions) {
      // Fallback: parse simpleOptions (comma-separated string) for backward compatibility
      const options = attributeTypeForm.simpleOptions
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt !== "");
      
      attributeValues = options.map((option) => {
        return {
          value: option.toLowerCase().replace(/\s+/g, '-'),
          label: option,
          priceMultiplier: 1.0,
          description: "",
          image: "",
        };
      });
    } else if (attributeTypeForm.primaryEffectType === "PRICE" && attributeTypeForm.priceImpactPer1000) {
      // For single price impact (non-dropdown/radio), create a single option
      const priceImpact = parseFloat(attributeTypeForm.priceImpactPer1000) || 0;
      const multiplier = priceImpact > 0 ? 1 + (priceImpact / 1000) : 1.0;
      attributeValues = [{
        value: attributeTypeForm.attributeName.toLowerCase().replace(/\s+/g, '-'),
        label: attributeTypeForm.attributeName,
        priceMultiplier: multiplier,
        description: "",
        image: "",
      }];
    }

    // Auto-set fields based on selections
    // Use checkbox value if set, otherwise infer from description
    const isPricingAttribute = attributeTypeForm.isPriceEffect || 
      (attributeTypeForm.effectDescription && attributeTypeForm.effectDescription.toLowerCase().includes('price'));
    
    // If isPriceEffect is checked but no options table, create a single option with price effect
    if (attributeTypeForm.isPriceEffect && attributeTypeForm.priceEffectAmount && attributeValues.length === 0) {
      // If no options but price effect is set, create a single value
      const priceImpact = parseFloat(attributeTypeForm.priceEffectAmount) || 0;
      const multiplier = priceImpact > 0 ? 1 + (priceImpact / 1000) : 1.0;
      attributeValues = [{
        value: attributeTypeForm.attributeName.toLowerCase().replace(/\s+/g, '-'),
        label: attributeTypeForm.attributeName,
        priceMultiplier: multiplier,
        description: "",
        image: "",
      }];
    }
    
    // Determine primaryEffectType from description
    let primaryEffectType = attributeTypeForm.primaryEffectType;
    if (attributeTypeForm.effectDescription) {
      const desc = attributeTypeForm.effectDescription.toLowerCase();
      if (desc.includes('price') || desc.includes('cost')) {
        primaryEffectType = "PRICE";
      } else if (desc.includes('file') || desc.includes('upload') || desc.includes('image')) {
        primaryEffectType = "FILE";
      } else if (desc.includes('variant') || desc.includes('version') || desc.includes('type')) {
        primaryEffectType = "VARIANT";
      } else {
        primaryEffectType = "INFORMATIONAL";
      }
    }
    
    const functionType = attributeTypeForm.primaryEffectType === "FILE" 
      ? (attributeTypeForm.inputStyle === "FILE_UPLOAD" ? "PRINTING_IMAGE" : "GENERAL")
      : attributeTypeForm.primaryEffectType === "PRICE" && attributeTypeForm.inputStyle === "NUMBER"
      ? "QUANTITY_PRICING"
      : "GENERAL";

    // Store fixed quantity min/max in attributeValues as metadata (first value's description)
    if (attributeTypeForm.isFixedQuantity && attributeTypeForm.fixedQuantityMin && attributeTypeForm.fixedQuantityMax) {
      const min = parseInt(attributeTypeForm.fixedQuantityMin) || 0;
      const max = parseInt(attributeTypeForm.fixedQuantityMax) || 0;
      // Store in the first attributeValue's description as JSON, or create a special entry
      if (attributeValues.length > 0) {
        attributeValues[0].description = JSON.stringify({ fixedQuantityMin: min, fixedQuantityMax: max });
      } else {
        // Create a placeholder value to store the fixed quantity info
        attributeValues.push({
          value: "fixed-quantity",
          label: "Fixed Quantity",
          priceMultiplier: 1.0,
          description: JSON.stringify({ fixedQuantityMin: min, fixedQuantityMax: max }),
          image: "",
        });
      }
    }

    // Ensure primaryEffectType is always set (required by server)
    const finalPrimaryEffectType = primaryEffectType || attributeTypeForm.primaryEffectType || "INFORMATIONAL";
    
    return {
      attributeName: attributeTypeForm.attributeName || "",
      functionType: functionType || "GENERAL",
      isPricingAttribute: isPricingAttribute || false,
      inputStyle: attributeTypeForm.inputStyle || "DROPDOWN",
      isFixedQuantityNeeded: attributeTypeForm.isFixedQuantity || (attributeTypeForm.inputStyle === "NUMBER" && finalPrimaryEffectType === "PRICE"),
      primaryEffectType: finalPrimaryEffectType,
      effectDescription: attributeTypeForm.effectDescription || "", // Store the description
      isFilterable: attributeTypeForm.isFilterable !== undefined ? attributeTypeForm.isFilterable : (finalPrimaryEffectType === "INFORMATIONAL" || finalPrimaryEffectType === "VARIANT"),
      attributeValues: attributeValues,
      defaultValue: attributeValues.length > 0 ? attributeValues[0].value : "",
      isRequired: attributeTypeForm.isRequired !== undefined ? attributeTypeForm.isRequired : (finalPrimaryEffectType === "FILE" || finalPrimaryEffectType === "PRICE" || attributeTypeForm.isPriceEffect),
      displayOrder: 0,
      isCommonAttribute: attributeTypeForm.isCommonAttribute !== undefined ? attributeTypeForm.isCommonAttribute : true,
      applicableCategories: [],
      applicableSubCategories: [],
      // Store fixed quantity min/max as custom fields (will be stored in attributeValues description)
      fixedQuantityMin: attributeTypeForm.isFixedQuantity ? parseInt(attributeTypeForm.fixedQuantityMin) || 0 : undefined,
      fixedQuantityMax: attributeTypeForm.isFixedQuantity ? parseInt(attributeTypeForm.fixedQuantityMax) || 0 : undefined,
    };
  };

  const handleAttributeTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert simplified form to full structure
      const fullAttributeType = convertFormToAttributeType();
      
      // Validate required fields with auto-scroll
      if (!fullAttributeType.attributeName) {
        setError("Attribute name is required");
        setLoading(false);
        scrollToInvalidField("attributeName", "attribute-name");
        return;
      }
      if (!fullAttributeType.functionType) {
        setError("Function type is required");
        setLoading(false);
        scrollToInvalidField("functionType", "attribute-functionType");
        return;
      }
      if (!fullAttributeType.inputStyle) {
        setError("Input style is required");
        setLoading(false);
        scrollToInvalidField("inputStyle", "attribute-inputStyle");
        return;
      }
      if (!fullAttributeType.primaryEffectType) {
        setError("Primary effect type is required");
        setLoading(false);
        scrollToInvalidField("primaryEffectType", "attribute-primaryEffectType");
        return;
      }
      
      const payload = {
        ...fullAttributeType,
        attributeValues: JSON.stringify(fullAttributeType.attributeValues),
        applicableCategories: JSON.stringify(fullAttributeType.applicableCategories),
        applicableSubCategories: JSON.stringify(fullAttributeType.applicableSubCategories),
      };

      const url = editingAttributeTypeId
        ? `${API_BASE_URL}/attribute-types/${editingAttributeTypeId}`
        : `${API_BASE_URL}/attribute-types`;
      const method = editingAttributeTypeId ? "PUT" : "POST";

      console.log("Sending attribute type request:", { url, method, payload: { ...payload, attributeValues: "[stringified]" } });

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      console.log("Attribute type response status:", response.status, response.statusText);

      // Check if response is 404 - route might not exist
      if (response.status === 404) {
        throw new Error("Attribute types API endpoint not found (404). Please ensure the server is running and the route is registered. Try restarting the server.");
      }
      
      const data = await handleNgrokResponse(response);
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `Failed to save attribute type: ${response.status} ${response.statusText}`);
      }

      setSuccess(editingAttributeTypeId ? "Attribute type updated successfully" : "Attribute type created successfully");
      setAttributeTypeForm({
        attributeName: "",
        inputStyle: "DROPDOWN",
        effectDescription: "",
        simpleOptions: "",
        isPriceEffect: false,
        isFixedQuantity: false,
        priceEffectAmount: "",
        fixedQuantityMin: "",
        fixedQuantityMax: "",
        primaryEffectType: "INFORMATIONAL",
        priceImpactPer1000: "",
        fileRequirements: "",
        attributeOptionsTable: [],
        // Reset auto-set fields
        functionType: "GENERAL",
        isPricingAttribute: false,
        isFixedQuantityNeeded: false,
        isFilterable: false,
        attributeValues: [],
        defaultValue: "",
        isRequired: false,
        displayOrder: 0,
        isCommonAttribute: true,
        applicableCategories: [],
        applicableSubCategories: [],
      });
      const wasCreatingFromModal = showCreateAttributeModal;
      const createdAttributeId = data?._id || data?.attributeType?._id;
      
      setEditingAttributeTypeId(null);
      if (showCreateAttributeModal) {
        setShowCreateAttributeModal(false);
      }
      // Refresh attribute types list
      await fetchAttributeTypes();
      // If created from product form, automatically select the new attribute
      if (wasCreatingFromModal && createdAttributeId) {
        // Add the newly created attribute to selected attributes
        setSelectedAttributeTypes([
          ...(selectedAttributeTypes || []),
          {
            attributeTypeId: createdAttributeId,
            isEnabled: true,
            isRequired: false,
            displayOrder: (selectedAttributeTypes || []).length,
          },
        ]);
      }
    } catch (err) {
      console.error("Error saving attribute type:", err);
      setError(err instanceof Error ? err.message : "Failed to save attribute type");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttributeType = (attributeTypeId: string) => {
    const attributeType = attributeTypes.find((at) => at._id === attributeTypeId);
    if (attributeType) {
      // Convert attributeValues back to attributeOptionsTable
      const attributeOptionsTable = ((attributeType.attributeValues || [])
        .filter((av: any) => (av.label || av.value) && av.value !== "fixed-quantity")
        .map((av: any) => {
          // Convert multiplier back to price impact per 1000
          // multiplier = 1 + (impact/1000), so impact = (multiplier - 1) * 1000
          const priceImpact = av.priceMultiplier ? ((av.priceMultiplier - 1) * 1000).toFixed(2) : "0";
          return {
            name: av.label || av.value || "",
            priceImpactPer1000: priceImpact,
            image: av.image || undefined,
          };
        })) || [];
      
      // Also create simpleOptions for backward compatibility
      const simpleOptions = (attributeOptionsTable || []).map(opt => opt.name).join(", ");

      // Extract fixed quantity min/max from attributeValues description or custom fields
      let fixedQuantityMin = "";
      let fixedQuantityMax = "";
      let isFixedQuantity = false;
      
      if (attributeType.fixedQuantityMin !== undefined && attributeType.fixedQuantityMax !== undefined) {
        fixedQuantityMin = String(attributeType.fixedQuantityMin);
        fixedQuantityMax = String(attributeType.fixedQuantityMax);
        isFixedQuantity = true;
      } else if (attributeType.attributeValues && attributeType.attributeValues.length > 0) {
        // Try to extract from description
        try {
          const firstValue = attributeType.attributeValues[0];
          if (firstValue.description) {
            const parsed = JSON.parse(firstValue.description);
            if (parsed.fixedQuantityMin && parsed.fixedQuantityMax) {
              fixedQuantityMin = String(parsed.fixedQuantityMin);
              fixedQuantityMax = String(parsed.fixedQuantityMax);
              isFixedQuantity = true;
            }
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }

      // Check if price effect is set
      const isPriceEffect = attributeType.isPricingAttribute || false;
      let priceEffectAmount = "";
      if (isPriceEffect && attributeType.attributeValues && attributeType.attributeValues.length > 0) {
        const firstValue = attributeType.attributeValues[0];
        if (firstValue.priceMultiplier) {
          priceEffectAmount = ((firstValue.priceMultiplier - 1) * 1000).toFixed(2);
        }
      }

      setAttributeTypeForm({
        attributeName: attributeType.attributeName || "",
        inputStyle: attributeType.inputStyle || "DROPDOWN",
        effectDescription: attributeType.effectDescription || "",
        simpleOptions: simpleOptions,
        isPriceEffect: isPriceEffect,
        isFixedQuantity: isFixedQuantity,
        priceEffectAmount: priceEffectAmount,
        fixedQuantityMin: fixedQuantityMin,
        fixedQuantityMax: fixedQuantityMax,
        primaryEffectType: attributeType.primaryEffectType || "INFORMATIONAL",
        priceImpactPer1000: "",
        fileRequirements: "",
        attributeOptionsTable: attributeOptionsTable,
        // Keep auto-set fields for compatibility
        functionType: attributeType.functionType || "GENERAL",
        isPricingAttribute: attributeType.isPricingAttribute || false,
        isFixedQuantityNeeded: attributeType.isFixedQuantityNeeded || false,
        isFilterable: attributeType.isFilterable || false,
        attributeValues: attributeType.attributeValues || [],
        defaultValue: attributeType.defaultValue || "",
        isRequired: attributeType.isRequired || false,
        displayOrder: attributeType.displayOrder || 0,
        isCommonAttribute: attributeType.isCommonAttribute !== undefined ? attributeType.isCommonAttribute : true,
        applicableCategories: attributeType.applicableCategories?.map((c: any) => c._id || c) || [],
        applicableSubCategories: attributeType.applicableSubCategories?.map((sc: any) => sc._id || sc) || [],
      });
      setEditingAttributeTypeId(attributeTypeId);
    }
  };

  const handleDeleteAttributeType = async (attributeTypeId: string) => {
    const attributeType = attributeTypes.find(at => at._id === attributeTypeId);
    if (!attributeType) return;

    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to delete the attribute type "${attributeType.attributeName}"?\n\nNote: This action cannot be undone. If this attribute is being used in any products, the deletion will be prevented.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE_URL}/attribute-types/${attributeTypeId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      // Check response status before parsing
      if (!response.ok) {
        // Clone the response to read it without consuming the body
        const responseClone = response.clone();
        let errorMessage = "Failed to delete attribute type";
        
        try {
          const errorData = await responseClone.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.log("Error data received:", errorData);
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const text = await response.text();
            errorMessage = text || response.statusText || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
        }
        
        console.log("Error message:", errorMessage);
        
        // Check if the error is about attribute being in use
        const isInUseError = errorMessage.toLowerCase().includes("used") || 
                            errorMessage.toLowerCase().includes("in use") ||
                            errorMessage.toLowerCase().includes("product") ||
                            errorMessage.toLowerCase().includes("cannot delete");
        
        // Show toast notification
        if (isInUseError) {
          toast.error(
            <div>
              <div className="font-semibold">Attribute is in use</div>
              {/* <div className="text-sm mt-1">{errorMessage}</div> */}
            </div>,
            {
              duration: 5000,
              position: "bottom-right",
            }
          );
        } else {
          toast.error(errorMessage, {
            duration: 4000,
            position: "bottom-right",
          });
        }
        
        setError(errorMessage);
        setLoading(false);
        return; // Exit early, don't throw
      }

      // Parse successful response
      const data = await handleNgrokResponse(response);

      // Show success toast
      toast.success("Attribute deleted successfully", {
        duration: 3000,
        position: "bottom-right",
      });
      
      fetchAttributeTypes();
    } catch (err) {
      console.error("Error deleting attribute type:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete attribute type";
      
      // Check if error is about attribute being in use (in case it wasn't caught above)
      const isInUseError = errorMessage.toLowerCase().includes("used") || 
                          errorMessage.toLowerCase().includes("in use") ||
                          errorMessage.toLowerCase().includes("product");
      
      if (isInUseError) {
        toast.error(
          <div>
            <div className="font-semibold">Attribute is in use</div>
            {/* <div className="text-sm mt-1">{errorMessage}</div> */}
          </div>,
          {
            duration: 5000,
            position: "bottom-right",
          }
        );
      } else {
        toast.error(errorMessage, {
          duration: 4000,
          position: "bottom-right",
        });
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Department Management Functions
  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch departments: ${response.status} ${response.statusText}`);
      }

      const data = await handleNgrokResponse(response);
      setDepartments(data.data || data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch departments");
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Clear previous errors
      setDepartmentFormErrors({});
      setError(null);
      
      if (!departmentForm.name.trim()) {
        setDepartmentFormErrors({ name: "Department name is required" });
        setLoading(false);
        scrollToInvalidField("name", "department-name");
        return;
      }

      const url = editingDepartmentId
        ? `${API_BASE_URL}/departments/${editingDepartmentId}`
        : `${API_BASE_URL}/departments`;
      const method = editingDepartmentId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(departmentForm),
      });

      const data = await handleNgrokResponse(response);

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingDepartmentId ? "update" : "create"} department`);
      }

      setSuccess(editingDepartmentId ? "Department updated successfully" : "Department created successfully");
      setDepartmentForm({
        name: "",
        description: "",
        isEnabled: true,
        operators: [],
      });
      setEditingDepartmentId(null);
      fetchDepartments();
    } catch (err) {
      console.error("Error saving department:", err);
      setError(err instanceof Error ? err.message : "Failed to save department");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = (departmentId: string) => {
    const department = departments.find((d) => d._id === departmentId);
    if (department) {
      // Extract operator IDs, handling both populated objects and plain IDs
      const operatorIds = department.operators?.map((op: any) => {
        if (typeof op === 'object' && op !== null) {
          return op._id || op.id || String(op);
        }
        return String(op);
      }) || [];
      
      setDepartmentForm({
        name: department.name || "",
        description: department.description || "",
        isEnabled: department.isEnabled !== undefined ? department.isEnabled : true,
        operators: operatorIds,
      });
      setEditingDepartmentId(departmentId);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this department? This action cannot be undone if there are active orders.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${departmentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await handleNgrokResponse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete department");
      }

      setSuccess("Department deleted successfully");
      fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
      setError(err instanceof Error ? err.message : "Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  // Sequence Management Functions
  const fetchSequences = async () => {
    setLoadingSequences(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sequences`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sequences");
      }

      const data = await handleNgrokResponse(response);
      setSequences(data.data || data || []);
    } catch (err) {
      console.error("Error fetching sequences:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch sequences");
    } finally {
      setLoadingSequences(false);
    }
  };

  const handleSequenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Clear previous errors
      setSequenceFormErrors({});
      setError(null);
      
      let hasErrors = false;
      const errors: typeof sequenceFormErrors = {};
      
      if (!sequenceForm.name.trim()) {
        errors.name = "Sequence name is required";
        hasErrors = true;
      }
      if (!sequenceForm.printType) {
        errors.printType = "Print type is required";
        hasErrors = true;
      }
      // Require category for both digital and bulk print
      if (!sequenceForm.category) {
        errors.category = "Category is required";
        hasErrors = true;
      }
      // Subcategory is optional for both digital and bulk print
      if (!sequenceForm.selectedDepartments || sequenceForm.selectedDepartments.length === 0) {
        errors.selectedDepartments = "At least one department must be selected";
        hasErrors = true;
      }
      
      if (hasErrors) {
        setSequenceFormErrors(errors);
        setLoading(false);
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField === 'name') scrollToInvalidField("name", "sequence-name");
        else if (firstErrorField === 'printType') scrollToInvalidField("printType", "sequence-printType");
        else if (firstErrorField === 'category') scrollToInvalidField("category", "sequence-category");
        else if (firstErrorField === 'selectedDepartments') scrollToInvalidField("selectedDepartments", "sequence-departments");
        return;
      }

      const url = editingSequenceId
        ? `${API_BASE_URL}/sequences/${editingSequenceId}`
        : `${API_BASE_URL}/sequences`;
      const method = editingSequenceId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sequenceForm.name,
          printType: sequenceForm.printType,
          category: sequenceForm.category || null,
          subcategory: sequenceForm.subcategory || null,
          departments: sequenceForm.selectedDepartments,
          attributes: sequenceForm.selectedAttributes || [],
        }),
      });

      const data = await handleNgrokResponse(response);

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingSequenceId ? "update" : "create"} sequence`);
      }

      setSuccess(editingSequenceId ? "Sequence updated successfully" : "Sequence created successfully");
      setSequenceForm({
        name: "",
        printType: "",
        category: "",
        subcategory: "",
        selectedDepartments: [],
        selectedAttributes: [],
      });
      setEditingSequenceId(null);
      fetchSequences();
    } catch (err) {
      console.error("Error saving sequence:", err);
      setError(err instanceof Error ? err.message : "Failed to save sequence");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSequence = (sequenceId: string) => {
    const sequence = (sequences || []).find((s) => s._id === sequenceId);
    if (sequence) {
      // Determine print type from category type, or default to digital if category exists
      let printType = "";
      if (sequence.category) {
        const categoryObj = typeof sequence.category === 'object' ? sequence.category : categories.find(c => c._id === sequence.category);
        if (categoryObj && (categoryObj.type === "Digital" || categoryObj.type === "digital")) {
          printType = "digital";
        } else {
          printType = "bulk";
        }
      } else {
        // If no category, it might be bulk print
        printType = "bulk";
      }
      
      setSequenceForm({
        name: sequence.name || "",
        printType: printType,
        category: sequence.category && typeof sequence.category === 'object' && sequence.category !== null ? sequence.category._id : sequence.category || "",
        subcategory: sequence.subcategory && typeof sequence.subcategory === 'object' && sequence.subcategory !== null ? sequence.subcategory._id : sequence.subcategory || "",
        selectedDepartments: (sequence.departments || []).map((d: any) => {
          if (!d || !d.department) return null;
          return typeof d.department === 'object' && d.department !== null 
            ? d.department._id 
            : d.department;
        }).filter((id: any) => id !== null) || [],
        selectedAttributes: (sequence.attributes || []).map((attr: any) => {
          if (!attr) return null;
          return typeof attr === 'object' && attr !== null ? attr._id : attr;
        }).filter((id: any) => id !== null) || [],
      });
      setEditingSequenceId(sequenceId);
    }
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!window.confirm("Are you sure you want to delete this sequence? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sequences/${sequenceId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete sequence");
      }

      setSuccess("Sequence deleted successfully");
      fetchSequences();
    } catch (err) {
      console.error("Error deleting sequence:", err);
      setError(err instanceof Error ? err.message : "Failed to delete sequence");
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentToggle = (departmentId: string) => {
    const currentIndex = sequenceForm.selectedDepartments.indexOf(departmentId);
    if (currentIndex === -1) {
      // Add department (order is based on when it's added)
      setSequenceForm({
        ...sequenceForm,
        selectedDepartments: [...sequenceForm.selectedDepartments, departmentId],
      });
    } else {
      // Remove department
      setSequenceForm({
        ...sequenceForm,
        selectedDepartments: sequenceForm.selectedDepartments.filter(id => id !== departmentId),
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status?: string, action?: string, deliveryDate?: string) => {
    try {
      const updateData: any = {};
      if (action) {
        updateData.action = action;
      }
      if (status) {
        updateData.status = status;
      } else {
        if (orderStatusUpdate.status) updateData.status = orderStatusUpdate.status;
        if (orderStatusUpdate.deliveryDate) updateData.deliveryDate = orderStatusUpdate.deliveryDate;
        if (orderStatusUpdate.adminNotes !== undefined) updateData.adminNotes = orderStatusUpdate.adminNotes;
      }
      if (deliveryDate) {
        updateData.deliveryDate = deliveryDate;
      }

      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        throw new Error(errorData.error || `Failed to update order: ${response.status} ${response.statusText}`);
      }

      await handleNgrokResponse(response);

      setSuccess("Order updated successfully");
      setShowOrderModal(false);
      setSelectedOrder(null);
      setOrderStatusUpdate({ status: "", deliveryDate: "", adminNotes: "" });
      fetchOrders();
    } catch (err) {
      console.error("Error updating order:", err);
      setError(err instanceof Error ? err.message : "Failed to update order");
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to reject this order?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        throw new Error(errorData.error || `Failed to reject order: ${response.status} ${response.statusText}`);
      }

      await handleNgrokResponse(response);

      setSuccess("Order rejected successfully");
      fetchOrders();
    } catch (err) {
      console.error("Error rejecting order:", err);
      setError(err instanceof Error ? err.message : "Failed to reject order");
    }
  };

  // Helper function to format image data URL
  const getImageUrl = (imageData: string, contentType: string = "image/png"): string | null => {
    if (!imageData || imageData.trim() === "") return null;
    // If already a data URL, return as is
    if (imageData.startsWith("data:")) return imageData;
    // If base64 string, add data URL prefix
    if (imageData.startsWith("/9j/") || imageData.startsWith("iVBORw0KGgo")) {
      return `data:${contentType};base64,${imageData}`;
    }
    // Otherwise, assume it's already a valid URL or base64
    return imageData;
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    // Clear previous errors
    setProductFormErrors({});

    try {
      // Validate required fields with auto-scroll and field-level errors
      let firstErrorField: string | null = null;
      let firstErrorId: string | null = null;
      const errors: typeof productFormErrors = {};
      
      if (!productForm.name || !productForm.name.trim()) {
        errors.name = "Product name is required";
        if (!firstErrorField) {
          firstErrorField = "name";
          firstErrorId = "product-name";
        }
      }

      if (!productForm.basePrice || !productForm.basePrice.toString().trim()) {
        errors.basePrice = "Base price is required";
        if (!firstErrorField) {
          firstErrorField = "basePrice";
          firstErrorId = "product-basePrice";
        }
      }

      // Validate category (required)
      if (!productForm.category) {
        errors.category = "Please select a category";
        if (!firstErrorField) {
          firstErrorField = "category";
          firstErrorId = "product-category";
        }
      }

      // Get type from selected category
      const selectedCategory = categories.find(cat => cat._id === productForm.category);
      if (!selectedCategory && productForm.category) {
        errors.category = "Selected category not found. Please select a valid category.";
        if (!firstErrorField) {
          firstErrorField = "category";
          firstErrorId = "product-category";
        }
      }
      const categoryType = selectedCategory?.type;

      // Category ID - always use the selected category (parent category)
      const categoryId = productForm.category;

      // Validate GST Percentage (required field marked with *)
      if (!productForm.gstPercentage || !productForm.gstPercentage.toString().trim()) {
        errors.gstPercentage = "GST % is required for invoice calculation";
        if (!firstErrorField) {
          firstErrorField = "gstPercentage";
          firstErrorId = "product-gstPercentage";
        }
      }

      // Validate Instructions (required field marked with *)
      if (!productForm.instructions || !productForm.instructions.trim()) {
        errors.instructions = "Instructions are required";
        if (!firstErrorField) {
          firstErrorField = "instructions";
          firstErrorId = "product-instructions";
        }
      }

      // If there are validation errors, show them and scroll to first error
      if (Object.keys(errors).length > 0) {
        setProductFormErrors(errors);
        setLoading(false);
        
        // Show toast with error summary
        const errorMessages = Object.values(errors).filter((msg): msg is string => !!msg);
        toast.error(
          <div>
            <div className="font-semibold">Please fix the following errors:</div>
            <ul className="list-disc list-inside mt-1 text-sm">
              {errorMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>,
          { duration: 5000, position: "bottom-right" }
        );
        
        // Scroll to first error field
        if (firstErrorField && firstErrorId) {
          scrollToInvalidField(firstErrorField, firstErrorId);
        }
        return;
      }

      // If using subcategory, validate it exists in SubCategory collection and belongs to selected category
      let subcategoryId: string | undefined = undefined;
      if (productForm.subcategory && productForm.subcategory.trim() !== "") {
        // Find the subcategory in the subCategories list (from SubCategory collection)
        const selectedSubCategory = subCategories.find(
          (sc) => sc._id === productForm.subcategory
        );

        if (!selectedSubCategory) {
          // Also check in categoryChildrenMap in case it's loaded there
          const allSubcategories: any[] = [];
          Object.values(categoryChildrenMap).forEach((children: any[]) => {
            if (Array.isArray(children)) {
              allSubcategories.push(...children);
            }
          });
          const foundInMap = allSubcategories.find(sc => sc._id === productForm.subcategory);
          
          if (!foundInMap) {
            setError("Selected subcategory not found. Please select a valid subcategory.");
            setLoading(false);
            return;
          }
          
          // Verify subcategory belongs to the selected category
          const subcategoryCategoryId = foundInMap.category 
            ? (typeof foundInMap.category === 'object' ? foundInMap.category._id : foundInMap.category)
            : null;
          
          if (subcategoryCategoryId !== categoryId) {
            setError("Selected subcategory does not belong to the selected category. Please select a valid subcategory.");
            setLoading(false);
            return;
          }
          
          subcategoryId = foundInMap._id;
        } else {
          // Verify subcategory belongs to the selected category
          const subcategoryCategoryId = selectedSubCategory.category 
            ? (typeof selectedSubCategory.category === 'object' ? selectedSubCategory.category._id : selectedSubCategory.category)
            : null;
          
          if (subcategoryCategoryId !== categoryId) {
            setError("Selected subcategory does not belong to the selected category. Please select a valid subcategory.");
            setLoading(false);
            return;
          }
          
          subcategoryId = selectedSubCategory._id;
        }
      }

      const formData = new FormData();
      formData.append("name", productForm.name);
      formData.append("description", productForm.description || "");
      formData.append("basePrice", productForm.basePrice);
      
      // Append product image if provided
      if (productForm.image) {
        formData.append("image", productForm.image);
      }
      
      // Always append category (required field) - this is the parent category
      formData.append("category", categoryId);
      
      // For updates, always send subcategory (even if empty) to allow clearing it
      // For creates, only send if it's selected and not empty
      if (editingProductId) {
        // Update: explicitly send subcategory (empty string to clear, or value to set)
        formData.append("subcategory", subcategoryId && subcategoryId.trim() !== "" && subcategoryId !== "null" ? subcategoryId : "");
      } else {
        // Create: only append if it's selected and not empty
        if (subcategoryId && subcategoryId.trim() !== "" && subcategoryId !== "null") {
          formData.append("subcategory", subcategoryId);
        }
        // If subcategory is empty, don't append it - product will be created directly under category
      }
      // Product type is no longer used - removed from form
      
      // Parse description into array format for storage
      // Split by newlines and filter empty lines
      const descriptionLines = productForm.description
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (descriptionLines.length > 0) {
        formData.append("descriptionArray", JSON.stringify(descriptionLines));
      }
      
      // Append filters from tables - Printing options removed (should be attributes)
      const filtersToSend: any = {
        printingOption: [], // Empty - printing options should be attributes
        orderQuantity: productForm.filters.orderQuantity,
        deliverySpeed: deliverySpeedTable.map(item => typeof item === 'string' ? item : item.name).filter(name => name.trim()),
        textureType: textureTypeTable.map(item => typeof item === 'string' ? item : item.name).filter(name => name.trim()),
        filterPricesEnabled: filterPricesEnabled,
      };
      
      // Add filter prices if enabled (no printing option prices)
      if (filterPricesEnabled) {
        filtersToSend.printingOptionPrices = [];
        filtersToSend.deliverySpeedPrices = deliverySpeedTable
          .filter(item => typeof item === 'object' && item.name && item.name.trim())
          .map(item => ({ 
            name: item.name.trim(), 
            priceAdd: typeof item.priceAdd === 'number' ? item.priceAdd : (item.priceAdd ? parseFloat(item.priceAdd) || 0 : 0)
          }));
        filtersToSend.textureTypePrices = textureTypeTable
          .filter(item => typeof item === 'object' && item.name && item.name.trim())
          .map(item => ({ 
            name: item.name.trim(), 
            priceAdd: typeof item.priceAdd === 'number' ? item.priceAdd : (item.priceAdd ? parseFloat(item.priceAdd) || 0 : 0)
          }));
      } else {
        // Clear filter prices when disabled
        filtersToSend.printingOptionPrices = [];
        filtersToSend.deliverySpeedPrices = [];
        filtersToSend.textureTypePrices = [];
      }
      
      // Debug: Log filters being sent
      console.log("Filters being sent:", JSON.stringify(filtersToSend, null, 2));
      formData.append("filters", JSON.stringify(filtersToSend));
      
      // Always use optionsTable if it has data, otherwise use JSON string
      const optionsToSend =
        optionsTable.length > 0
          ? JSON.stringify(optionsTable)
          : productForm.options;
      if (optionsToSend) {
        formData.append("options", optionsToSend);
      }

      // Append dynamic attributes (attribute types assigned to this product)
      if (selectedAttributeTypes && selectedAttributeTypes.length > 0) {
        const dynamicAttributesToSend = selectedAttributeTypes.map((sa) => ({
          attributeType: sa.attributeTypeId,
          isEnabled: sa.isEnabled,
          isRequired: sa.isRequired,
          displayOrder: sa.displayOrder,
          customValues: [], // Can be customized per product if needed
        }));
        formData.append("dynamicAttributes", JSON.stringify(dynamicAttributesToSend));
      }

      // Append quantity discounts
      if (productForm.quantityDiscounts && productForm.quantityDiscounts.length > 0) {
        const discountsToSend = productForm.quantityDiscounts
          .filter(d => d.minQuantity > 0 && d.discountPercentage > 0) // Only send valid discounts
          .map(d => ({
            minQuantity: d.minQuantity,
            maxQuantity: d.maxQuantity,
            discountPercentage: d.discountPercentage,
            priceMultiplier: (100 - d.discountPercentage) / 100, // Calculate multiplier from percentage
          }));
        if (discountsToSend.length > 0) {
          formData.append("quantityDiscounts", JSON.stringify(discountsToSend));
        }
      }

      // Append file upload constraints
      if (productForm.maxFileSizeMB) {
        formData.append("maxFileSizeMB", productForm.maxFileSizeMB);
      }
      if (productForm.minFileWidth) {
        formData.append("minFileWidth", productForm.minFileWidth);
      }
      if (productForm.maxFileWidth) {
        formData.append("maxFileWidth", productForm.maxFileWidth);
      }
      if (productForm.minFileHeight) {
        formData.append("minFileHeight", productForm.minFileHeight);
      }
      if (productForm.maxFileHeight) {
        formData.append("maxFileHeight", productForm.maxFileHeight);
      }
      formData.append("blockCDRandJPG", productForm.blockCDRandJPG ? "true" : "false");

      // Append additional charges and taxes
      if (productForm.additionalDesignCharge) {
        formData.append("additionalDesignCharge", productForm.additionalDesignCharge);
      }
      if (productForm.gstPercentage) {
        formData.append("gstPercentage", productForm.gstPercentage);
      }
      // Append price display setting
      formData.append("showPriceIncludingGst", productForm.showPriceIncludingGst ? "true" : "false");

      // Append custom instructions
      if (productForm.instructions) {
        formData.append("instructions", productForm.instructions);
      }

      // Append production sequence (custom department order)
      if (productForm.productionSequence && productForm.productionSequence.length > 0) {
        formData.append("productionSequence", JSON.stringify(productForm.productionSequence));
      }

      const url = editingProductId
        ? `${API_BASE_URL}/products/${editingProductId}`
        : `${API_BASE_URL}/products`;
      const method = editingProductId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          // Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
      });

      // Handle response errors
      if (!response.ok) {
        const responseClone = response.clone();
        let errorMessage = "Failed to save product";
        const backendErrors: Record<string, string> = {};
        
        try {
          const errorData = await responseClone.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          
          // Try to map backend errors to fields
          // Common field mappings
          if (errorMessage.toLowerCase().includes("name")) {
            backendErrors.name = errorMessage;
          } else if (errorMessage.toLowerCase().includes("price") || errorMessage.toLowerCase().includes("baseprice")) {
            backendErrors.basePrice = errorMessage;
          } else if (errorMessage.toLowerCase().includes("category")) {
            backendErrors.category = errorMessage;
          } else if (errorMessage.toLowerCase().includes("gst")) {
            backendErrors.gstPercentage = errorMessage;
          } else if (errorMessage.toLowerCase().includes("instruction")) {
            backendErrors.instructions = errorMessage;
          }
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Set field errors if any were mapped
        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
          // Scroll to first error field
          const firstErrorField = Object.keys(backendErrors)[0];
          scrollToInvalidField(firstErrorField, `product-${firstErrorField}`);
        }
        
        // Show toast error
        toast.error(errorMessage, {
          duration: 5000,
          position: "bottom-right",
        });
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Use handleNgrokResponse for successful response
      const data = await handleNgrokResponse(response);

      // Store categoryId before clearing form to use for fetching products
      const createdCategoryId = categoryId;

      // Show success toast
      toast.success(`Product ${editingProductId ? "updated" : "created"} successfully!`, {
        duration: 3000,
        position: "bottom-right",
      });
      
      setSuccess(`Product ${editingProductId ? "updated" : "created"} successfully!`);
      setSelectedType("");
      setFilteredCategoriesByType([]);
      setSelectedCategoryPath([]);
      setCategoryChildrenMap({});
      setProductForm({
        name: "",
        description: "",
        descriptionArray: [],
        basePrice: "",
        category: "",
        subcategory: "",
        image: null,
        options: "",
        filters: {
          printingOption: [],
          orderQuantity: { min: 1000, max: 72000, multiples: 1000 },
          deliverySpeed: [],
          textureType: [],
        },
        quantityDiscounts: [],
        maxFileSizeMB: "",
        minFileWidth: "",
        maxFileWidth: "",
        minFileHeight: "",
        maxFileHeight: "",
        blockCDRandJPG: false,
        additionalDesignCharge: "",
        gstPercentage: "",
        showPriceIncludingGst: false,
        instructions: "",
        productionSequence: [] as string[],
      });
      setOptionsTable([]);
      setFilterPricesEnabled(false);
      setPrintingOptionsTable([]);
      setDeliverySpeedTable([]);
      setTextureTypeTable([]);
      setSelectedAttributeTypes([]);
      setSubcategoryProducts([]);
      setEditingProductId(null);
      setFieldErrors({}); // Clear field errors on success
      
      // Refresh products list using the category route based on the category ID used to create the product
      if (createdCategoryId) {
        fetchProducts(createdCategoryId);
      } else {
        fetchProducts();
      }
      
      // If viewing a category, refresh its products
      if (selectedCategory) {
        handleCategoryClick(selectedCategory);
      }
      
      // If viewing a subcategory, refresh its products
      if (selectedSubCategoryForView) {
        handleSubCategoryClick(selectedSubCategoryForView);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingProductId ? "update" : "create"} product`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (productId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
      }

      const product = await handleNgrokResponse(response);

      // Convert descriptionArray back to text format for editing
      const descriptionText = product.descriptionArray && Array.isArray(product.descriptionArray) 
        ? product.descriptionArray.join('\n')
        : product.description || "";

      // Determine category and type from product
      // If subcategory exists, get category from subcategory, otherwise use product.category
      let categoryId = "";
      let productType = "";
      
      if (product.subcategory) {
        const subcategoryObj = typeof product.subcategory === "object" && product.subcategory !== null 
          ? product.subcategory 
          : null;
        if (subcategoryObj && subcategoryObj.category) {
          const categoryObj = typeof subcategoryObj.category === "object" && subcategoryObj.category !== null
            ? subcategoryObj.category 
            : null;
          categoryId = categoryObj ? categoryObj._id : (subcategoryObj.category || "");
          productType = categoryObj ? categoryObj.type : "";
        }
      }
      
      // If no category from subcategory, use product.category
      if (!categoryId) {
        const categoryObj = typeof product.category === "object" && product.category !== null
          ? product.category 
          : null;
        categoryId = categoryObj ? categoryObj._id : (product.category || "");
        productType = categoryObj ? categoryObj.type : "";
      }
      
      // Set type first, then category (this will trigger filtering)
      setSelectedType(productType);
      
      // Filter categories by type for the dropdown
      if (productType) {
        const filtered = categories.filter(cat => cat.type === productType && !cat.parent);
        setFilteredCategoriesByType(filtered);
      } else {
        setFilteredCategoriesByType([]);
      }
      
      // Set category
      setProductForm({
        name: product.name || "",
        description: descriptionText,
        descriptionArray: product.descriptionArray || [],
        basePrice: product.basePrice?.toString() || "",
        category: categoryId || "",
        subcategory: product.subcategory && typeof product.subcategory === "object" && product.subcategory._id 
          ? product.subcategory._id 
          : (product.subcategory && product.subcategory !== null && product.subcategory !== "null" && product.subcategory !== "" ? String(product.subcategory) : ""),
        image: null,
        options: "",
        filters: {
          ...(product.filters || {}),
          printingOption: product.filters?.printingOption || [],
          orderQuantity: {
            min: product.filters?.orderQuantity?.min || 1000,
            max: product.filters?.orderQuantity?.max || 72000,
            multiples: product.filters?.orderQuantity?.multiples || 1000,
            quantityType: product.filters?.orderQuantity?.quantityType || "SIMPLE",
            stepWiseQuantities: product.filters?.orderQuantity?.stepWiseQuantities || [],
            rangeWiseQuantities: product.filters?.orderQuantity?.rangeWiseQuantities || [],
          },
          deliverySpeed: product.filters?.deliverySpeed || [],
          textureType: product.filters?.textureType || [],
        },
        quantityDiscounts: product.quantityDiscounts && Array.isArray(product.quantityDiscounts) 
          ? product.quantityDiscounts.map((qd: any) => ({
              minQuantity: qd.minQuantity || 0,
              maxQuantity: qd.maxQuantity || null,
              discountPercentage: qd.discountPercentage || 0,
            }))
          : [],
        maxFileSizeMB: product.maxFileSizeMB?.toString() || "",
        minFileWidth: product.minFileWidth?.toString() || "",
        maxFileWidth: product.maxFileWidth?.toString() || "",
        minFileHeight: product.minFileHeight?.toString() || "",
        maxFileHeight: product.maxFileHeight?.toString() || "",
        blockCDRandJPG: product.blockCDRandJPG || false,
        additionalDesignCharge: product.additionalDesignCharge?.toString() || "",
        gstPercentage: product.gstPercentage?.toString() || "",
        showPriceIncludingGst: product.showPriceIncludingGst || false,
        instructions: product.instructions || "",
        productionSequence: product.productionSequence && Array.isArray(product.productionSequence)
          ? product.productionSequence
              .filter((dept: any) => dept !== null && dept !== undefined) // Filter out null/undefined departments
              .map((dept: any) => typeof dept === 'object' && dept !== null ? (dept._id || "") : (dept || ""))
              .filter((id: string) => id) // Filter out empty IDs
          : [],
      });

      if (product.options && Array.isArray(product.options) && product.options.length > 0) {
        setOptionsTable(product.options);
      } else {
        setOptionsTable([]);
      }

      // Set filter prices enabled state
      setFilterPricesEnabled(product.filters?.filterPricesEnabled || false);
      
      // Set filter tables from product data - Printing options are now handled via attributes
      setPrintingOptionsTable([]); // Printing options should be configured as attributes
      
      const deliverySpeeds = product.filters?.deliverySpeed || [];
      const deliveryPrices = product.filters?.deliverySpeedPrices || [];
      setDeliverySpeedTable(deliverySpeeds.map((opt: string | any, idx: number) => {
        if (typeof opt === 'string') {
          const priceData = deliveryPrices.find((p: any) => p.name === opt);
          return { name: opt, priceAdd: priceData?.priceAdd };
        }
        return opt;
      }));
      
      const textureTypes = product.filters?.textureType || [];
      const texturePrices = product.filters?.textureTypePrices || [];
      setTextureTypeTable(textureTypes.map((opt: string | any, idx: number) => {
        if (typeof opt === 'string') {
          const priceData = texturePrices.find((p: any) => p.name === opt);
          return { name: opt, priceAdd: priceData?.priceAdd };
        }
        return opt;
      }));

      // Load dynamic attributes if they exist
      if (product.dynamicAttributes && Array.isArray(product.dynamicAttributes) && product.dynamicAttributes.length > 0) {
        const loadedAttributes = product.dynamicAttributes
          .filter((da: any) => da && da.attributeType) // Filter out null/undefined attributes
          .map((da: any) => {
            const attributeType = typeof da.attributeType === 'object' && da.attributeType !== null 
              ? da.attributeType 
              : null;
            return {
              attributeTypeId: attributeType ? attributeType._id : (da.attributeType || ""),
              isEnabled: da.isEnabled !== undefined ? da.isEnabled : true,
              isRequired: da.isRequired !== undefined ? da.isRequired : false,
              displayOrder: da.displayOrder || 0,
            };
          })
          .filter((attr: any) => attr.attributeTypeId); // Filter out attributes without valid IDs
        setSelectedAttributeTypes(loadedAttributes);
      } else {
        setSelectedAttributeTypes([]);
      }

      // Build category path for hierarchical selection
      // If subcategory exists, build the path from root category to subcategory
      const subcategoryId = product.subcategory && typeof product.subcategory === "object" && product.subcategory !== null
        ? (product.subcategory._id || "")
        : (product.subcategory && product.subcategory !== null && product.subcategory !== "null" ? String(product.subcategory) : "");
      
      // Wait for categories to be loaded, then build path
      if (categoryId) {
        // First, fetch children for the root category
        await fetchCategoryChildren(categoryId);
        
        // If subcategory exists and is valid, build path to it
        if (subcategoryId && subcategoryId.trim() !== "" && subcategoryId !== categoryId && subcategoryId !== "null") {
          // Wait a bit for children to load, then build path
          setTimeout(() => {
            const path = buildCategoryPath(categoryId, subcategoryId);
            setSelectedCategoryPath(path);
            
            // Fetch children for all categories in the path
            path.forEach(catId => {
              if (catId !== categoryId) { // Already fetched root
                fetchCategoryChildren(catId);
              }
            });
          }, 100);
        } else {
          // Only root category selected
          setSelectedCategoryPath([categoryId]);
        }
      } else {
        setSelectedCategoryPath([]);
      }
      
      // Fetch products for the selected category/subcategory
      const finalCategoryId = subcategoryId || categoryId;
      if (finalCategoryId) {
        try {
          setLoadingCategoryProducts(true);
          const productsResponse = await fetch(`${API_BASE_URL}/products/category/${finalCategoryId}`, {
            headers: getAuthHeaders(),
          });
          
          if (productsResponse.ok) {
            const productsData = await handleNgrokResponse(productsResponse);
            setCategoryProducts(productsData || []);
          }
        } catch (err) {
          console.error("Error fetching category products:", err);
          setCategoryProducts([]);
        } finally {
          setLoadingCategoryProducts(false);
        }
      }

      setEditingProductId(productId);
      // Reset sequence selection states
      setSelectedSequenceId(null);
      setIsCustomizingSequence(false);
      setActiveTab("products");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      
      // First, try to fetch from categories
      let category = null;
      let isSubcategory = false;
      
      try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          category = await handleNgrokResponse(response);
          // Check if it has a parent - if so, it might be in SubCategory collection
          if (category && category.parent) {
            // Try to fetch from subcategories as well
            try {
              const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${categoryId}`, {
                method: "GET",
                headers: getAuthHeaders(),
              });
              if (subcatResponse.ok) {
                const subcategory = await handleNgrokResponse(subcatResponse);
                // If found in subcategories, use that instead
                category = subcategory;
                isSubcategory = true;
              }
            } catch (subcatErr) {
              // Not found in subcategories, use category data
            }
          }
        }
      } catch (catErr) {
        // Category not found, try subcategory
        try {
          const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${categoryId}`, {
            method: "GET",
            headers: getAuthHeaders(),
          });
          if (subcatResponse.ok) {
            category = await handleNgrokResponse(subcatResponse);
            isSubcategory = true;
          } else {
            throw new Error(`Failed to fetch category: ${subcatResponse.status} ${subcatResponse.statusText}`);
          }
        } catch (subcatErr) {
          throw new Error(`Failed to fetch category or subcategory`);
        }
      }

      if (!category) {
        throw new Error("Category not found");
      }

      // Auto-generate slug if not present - always ensure slug is set
      const categorySlug = category.slug || (category.name ? category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : "");

      // If it's a subcategory, map category field to parent
      const parentId = isSubcategory 
        ? (category.category ? (typeof category.category === 'object' ? category.category._id : category.category) : "")
        : (category.parent ? (typeof category.parent === 'object' ? category.parent._id : category.parent) : "");

      setCategoryForm({
        name: category.name || "",
        description: category.description || "",
        type: isSubcategory ? (category.category && typeof category.category === 'object' ? category.category.type : "Digital") : (category.type || "Digital"),
        parent: parentId,
        sortOrder: category.sortOrder || 0,
        slug: categorySlug, // Always set slug, even if auto-generated
        image: null,
      });
      setIsSlugManuallyEdited(!!category.slug); // If category has a slug, consider it manually set

      setEditingCategoryId(categoryId);
      setEditingCategoryImage(category.image || null);
      setActiveTab("categories");
      setError(null);
      
      // Fetch available parent categories (excluding current category and its descendants)
      fetchAvailableParentCategories(categoryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditingCategoryId(null);
    setEditingCategoryImage(null);
    setEditingSubCategoryId(null);
    setSelectedType("");
    setFilteredCategoriesByType([]);
    setFilteredSubCategories([]);
      setProductForm({
        name: "",
        description: "",
        descriptionArray: [],
        basePrice: "",
        category: "",
        subcategory: "",
        image: null,
      options: "",
      filters: {
        printingOption: [],
        orderQuantity: { min: 1000, max: 72000, multiples: 1000 },
        deliverySpeed: [],
        textureType: [],
      },
      maxFileSizeMB: "",
      fileHeight: "",
      fileWidth: "",
      blockCDRandJPG: false,
      additionalDesignCharge: "",
      gstPercentage: "",
      instructions: "",
    });
    setOptionsTable([]);
    setPrintingOptionsTable([]);
    setDeliverySpeedTable([]);
    setTextureTypeTable([]);
    setSubcategoryProducts([]);
    setCategoryForm({
      name: "",
      description: "",
      type: "Digital",
      parent: "",
      sortOrder: 0,
      slug: "",
      image: null,
    });
    setIsSlugManuallyEdited(false);
    setSubCategoryForm({
      name: "",
      description: "",
      category: "",
      slug: "",
      sortOrder: 0,
      image: null,
    });
    setIsSubCategorySlugManuallyEdited(false);
    setEditingSubCategoryImage(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        throw new Error(errorData.error || `Failed to delete product: ${response.status} ${response.statusText}`);
      }

      await handleNgrokResponse(response);

      setSuccess("Product deleted successfully!");
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Clear previous errors
      setCategoryFormErrors({});
      setError(null);
      
      // Validate form fields with auto-scroll and field-level errors
      let hasErrors = false;
      const errors: typeof categoryFormErrors = {};
      
      if (!categoryForm.name || categoryForm.name.trim() === "") {
        errors.name = "Category name is required";
        hasErrors = true;
      }
      
      if (hasErrors) {
        setCategoryFormErrors(errors);
        setLoading(false);
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField === 'name') scrollToInvalidField("name", "category-name");
        return;
      }

      // If parent is selected, this should be saved as a subcategory
      if (categoryForm.parent) {
        // Validate parent category is selected
        if (!categoryForm.parent) {
          setError("Parent category is required for subcategory.");
          setLoading(false);
          return;
        }

        // Image is required when creating subcategory (not when updating)
        if (!editingCategoryId && !categoryForm.image) {
          errors.image = "Subcategory image is required. Please upload an image";
          hasErrors = true;
        }
        
        if (hasErrors) {
          setCategoryFormErrors(errors);
          setLoading(false);
          const firstErrorField = Object.keys(errors)[0];
          if (firstErrorField === 'image') scrollToInvalidField("image", "category-image");
          return;
        }

        // Validate image file type and size if image is provided
        if (categoryForm.image) {
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(categoryForm.image.type)) {
            setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
            setLoading(false);
            return;
          }
          // Validate file size (max 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB in bytes
          if (categoryForm.image.size > maxSize) {
            setError("Image size must be less than 5MB. Please compress the image and try again.");
            setLoading(false);
            return;
          }
        }

        // Create/update subcategory
        const formData = new FormData();
        formData.append("name", categoryForm.name.trim());
        formData.append("description", categoryForm.description || "");
        formData.append("category", categoryForm.parent); // parent becomes category in subcategory model
        // Add sort order
        formData.append("sortOrder", categoryForm.sortOrder.toString());
        // Add slug - use provided slug or auto-generate from name
        const slugToSend = categoryForm.slug || (categoryForm.name ? categoryForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
        if (slugToSend) {
          formData.append("slug", slugToSend.trim());
        }
        if (categoryForm.image) {
          formData.append("image", categoryForm.image);
        }

        const url = editingCategoryId
          ? `${API_BASE_URL}/subcategories/${editingCategoryId}`
          : `${API_BASE_URL}/subcategories`;
        const method = editingCategoryId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });

        // Use handleNgrokResponse which handles both success and error cases
        // This prevents reading the response body multiple times
        const data = await handleNgrokResponse(response);

        setSuccess(`Subcategory ${editingCategoryId ? "updated" : "created"} successfully!`);
        setCategoryForm({
          name: "",
          description: "",
          type: "Digital",
          parent: "",
          sortOrder: 0,
          slug: "",
          image: null,
        });
        setIsSlugManuallyEdited(false);
        setEditingCategoryId(null);
        setEditingCategoryImage(null);
        fetchCategories();
        fetchSubCategories(); // Refresh subcategories
        fetchAvailableParentCategories(); // Refresh available parents
      } else {
        // No parent selected - create/update as regular category
        if (!categoryForm.type) {
          setError("Category type is required.");
          setLoading(false);
          scrollToInvalidField("type", "category-type");
          return;
        }

        // Image is required when creating (not when updating)
        if (!editingCategoryId && !categoryForm.image) {
          setError("Category image is required. Please upload an image.");
          setLoading(false);
          scrollToInvalidField("image", "category-image");
          return;
        }

        // Validate image file type and size if image is provided
        if (categoryForm.image) {
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(categoryForm.image.type)) {
            setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
            setLoading(false);
            return;
          }
          // Validate file size (max 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB in bytes
          if (categoryForm.image.size > maxSize) {
            setError("Image size must be less than 5MB. Please compress the image and try again.");
            setLoading(false);
            return;
          }
        }

        const formData = new FormData();
        formData.append("name", categoryForm.name.trim());
        formData.append("description", categoryForm.description || "");
        formData.append("type", categoryForm.type);
        formData.append("parent", ""); // Explicitly set to empty for top-level
        // Add sort order
        formData.append("sortOrder", categoryForm.sortOrder.toString());
        // Add slug - use provided slug or auto-generate from name
        const slugToSend = categoryForm.slug || (categoryForm.name ? categoryForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
        if (slugToSend) {
          formData.append("slug", slugToSend.trim());
        }
        if (categoryForm.image) {
          formData.append("image", categoryForm.image);
        }

        const url = editingCategoryId
          ? `${API_BASE_URL}/categories/${editingCategoryId}`
          : `${API_BASE_URL}/categories`;
        const method = editingCategoryId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });

        // Use handleNgrokResponse which handles both success and error cases
        // This prevents reading the response body multiple times
        const data = await handleNgrokResponse(response);

        setSuccess(`Category ${editingCategoryId ? "updated" : "created"} successfully!`);
        setCategoryForm({
          name: "",
          description: "",
          type: "Digital",
          parent: "",
          sortOrder: 0,
          slug: "",
          image: null,
        });
        setIsSlugManuallyEdited(false);
        setEditingCategoryId(null);
        setEditingCategoryImage(null);
        fetchCategories();
        fetchAvailableParentCategories(); // Refresh available parents
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingCategoryId ? "update" : "create"} ${categoryForm.parent ? "subcategory" : "category"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Clear previous errors
      setSubCategoryFormErrors({});
      setError(null);
      
      let hasErrors = false;
      const errors: typeof subCategoryFormErrors = {};
      
      if (!subCategoryForm.name || subCategoryForm.name.trim() === "") {
        errors.name = "Subcategory name is required";
        hasErrors = true;
      }

      if (!subCategoryForm.category || subCategoryForm.category === "pending") {
        errors.category = "Parent category is required";
        hasErrors = true;
      }

      // Image is required when creating (not when updating)
      if (!editingSubCategoryId && !subCategoryForm.image) {
        errors.image = "Subcategory image is required. Please upload an image";
        hasErrors = true;
      }
      
      if (hasErrors) {
        setSubCategoryFormErrors(errors);
        setLoading(false);
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField === 'name') scrollToInvalidField("name", "subcategory-name");
        else if (firstErrorField === 'category') scrollToInvalidField("category", "subcategory-category");
        else if (firstErrorField === 'image') scrollToInvalidField("image", "subcategory-image");
        return;
      }

      // Validate image file type and size if image is provided
      if (subCategoryForm.image) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(subCategoryForm.image.type)) {
          setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
          setLoading(false);
          return;
        }
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (subCategoryForm.image.size > maxSize) {
          setError("Image size must be less than 5MB. Please compress the image and try again.");
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append("name", subCategoryForm.name.trim());
      formData.append("description", subCategoryForm.description || "");
      formData.append("category", subCategoryForm.category);
      formData.append("sortOrder", subCategoryForm.sortOrder.toString());
      if (subCategoryForm.slug) {
        formData.append("slug", subCategoryForm.slug.trim());
      }
      if (subCategoryForm.image) {
        formData.append("image", subCategoryForm.image);
      }

      const url = editingSubCategoryId
        ? `${API_BASE_URL}/subcategories/${editingSubCategoryId}`
        : `${API_BASE_URL}/subcategories`;
      const method = editingSubCategoryId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        throw new Error(errorData.error || `Failed to ${editingSubCategoryId ? "update" : "create"} subcategory: ${response.status} ${response.statusText}`);
      }

      await handleNgrokResponse(response);

      setSuccess(`Subcategory ${editingSubCategoryId ? "updated" : "created"} successfully!`);
      
      // If we were viewing a category, refresh its subcategories
      if (selectedCategory) {
        await handleCategoryClick(selectedCategory);
      }
      
      setSubCategoryForm({
        name: "",
        description: "",
        category: "",
        type: "",
        slug: "",
        sortOrder: 0,
        image: null,
      });
      setIsSubCategorySlugManuallyEdited(false);
      setEditingSubCategoryId(null);
      setEditingSubCategoryImage(null);
      fetchSubCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingSubCategoryId ? "update" : "create"} subcategory`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubCategory = async (subCategoryId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/subcategories/${subCategoryId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subcategory: ${response.status} ${response.statusText}`);
      }

      const subCategory = await handleNgrokResponse(response);

      // Get type from parent category
      const parentCategory = typeof subCategory.category === "object" 
        ? subCategory.category 
        : categories.find(c => c._id === subCategory.category);
      const categoryType = parentCategory?.type || "";

      // Auto-generate slug if not present - always ensure slug is set
      const subCategorySlug = subCategory.slug || (subCategory.name ? subCategory.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : "");

      setSubCategoryForm({
        name: subCategory.name || "",
        description: subCategory.description || "",
        category: typeof subCategory.category === "object" ? subCategory.category._id : subCategory.category || "",
        type: categoryType,
        slug: subCategorySlug, // Always set slug, even if auto-generated
        sortOrder: subCategory.sortOrder || 0,
        image: null,
      });
      setIsSubCategorySlugManuallyEdited(!!subCategory.slug); // If subcategory has a slug, consider it manually set

      setEditingSubCategoryId(subCategoryId);
      setEditingSubCategoryImage(subCategory.image || null);
      // Switch to categories tab to show the edit form
      setActiveTab("categories");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subcategory");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubCategory = async (subCategoryId: string) => {
    const subCategory = subCategories.find(sc => sc._id === subCategoryId);
    if (!subCategory) return;

    // Check for products under this subcategory
    try {
      const productsResponse = await fetch(`${API_BASE_URL}/products/subcategory/${subCategoryId}`, {
        headers: getAuthHeaders(),
      });
      
      let productCount = 0;
      if (productsResponse.ok) {
        const productsData = await handleNgrokResponse(productsResponse);
        productCount = Array.isArray(productsData) ? productsData.length : 0;
      }

      // Open confirmation modal
      setDeleteConfirmModal({
        isOpen: true,
        type: 'subcategory',
        id: subCategoryId,
        name: subCategory.name,
        productCount,
        subcategoryCount: 0,
        deleteText: '',
      });
    } catch (err) {
      console.error("Error checking products:", err);
      // Still open modal, but with 0 product count
      setDeleteConfirmModal({
        isOpen: true,
        type: 'subcategory',
        id: subCategoryId,
        name: subCategory.name,
        productCount: 0,
        subcategoryCount: 0,
        deleteText: '',
      });
    }
  };

  const confirmDeleteSubCategory = async () => {
    if (deleteConfirmModal.deleteText.toLowerCase() !== 'delete') {
      setError('Please type "delete" to confirm');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false });

    try {
      const response = await fetch(`${API_BASE_URL}/subcategories/${deleteConfirmModal.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        const errorMessage = errorData.error || `Failed to delete subcategory: ${response.status} ${response.statusText}`;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      await handleNgrokResponse(response);

      setSuccess("Subcategory deleted successfully!");
      fetchSubCategories();
      // Refresh category subcategories if viewing them
      if (selectedCategory) {
        handleCategoryClick(selectedCategory);
      }
      // Clear selection if deleted subcategory was selected
      if (selectedSubCategoryForView === deleteConfirmModal.id) {
        setSelectedSubCategoryForView(null);
        setCategoryProducts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subcategory");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c._id === categoryId);
    if (!category) return;

    try {
      // First check for child categories (subcategories) - if category has subcategories, prevent deletion
      const childCategoriesResponse = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });
      
      let childCategoryCount = 0;
      let childCategories: any[] = [];
      
      if (childCategoriesResponse.ok) {
        const childCategoriesData = await handleNgrokResponse(childCategoriesResponse);
        childCategories = Array.isArray(childCategoriesData) ? childCategoriesData : (childCategoriesData?.data || []);
        childCategoryCount = childCategories.length;
      } else {
        // Try fallback to old endpoint for backward compatibility
        try {
          const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
            headers: getAuthHeaders(),
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await handleNgrokResponse(fallbackResponse);
            childCategories = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);
            childCategoryCount = childCategories.length;
          }
        } catch (fallbackErr) {
          // Ignore fallback errors
        }
      }

      // If category has child categories, block deletion
      if (childCategoryCount > 0) {
        setError(`Cannot delete category "${category.name}". It has ${childCategoryCount} child categor${childCategoryCount === 1 ? 'y' : 'ies'}. Please delete or reassign all child categories first.`);
        return;
      }

      // Check for products under this category
      const productsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });
      
      let productCount = 0;
      if (productsResponse.ok) {
        const productsData = await handleNgrokResponse(productsResponse);
        productCount = Array.isArray(productsData) ? productsData.length : 0;
      }

      // Open confirmation modal
      setDeleteConfirmModal({
        isOpen: true,
        type: 'category',
        id: categoryId,
        name: category.name,
        productCount,
        subcategoryCount: childCategoryCount,
        deleteText: '',
      });
    } catch (err) {
      console.error("Error checking category dependencies:", err);
      setError("Failed to check category dependencies. Please try again.");
    }
  };

  const confirmDeleteCategory = async () => {
    if (deleteConfirmModal.deleteText.toLowerCase() !== 'delete') {
      setError('Please type "delete" to confirm');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false });

    try {
      const response = await fetch(`${API_BASE_URL}/categories/${deleteConfirmModal.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        const errorMessage = errorData.error || `Failed to delete category: ${response.status} ${response.statusText}`;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      await handleNgrokResponse(response);

      setSuccess("Category deleted successfully!");
      fetchCategories();
      // Clear selection if deleted category was selected
      if (selectedCategory === deleteConfirmModal.id) {
        setSelectedCategory(null);
        setCategorySubcategories([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/update-user-role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          username: userRoleForm.username,
          role: userRoleForm.role,
        }),
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        throw new Error(errorData.message || errorData.error || `Failed to update user role: ${response.status} ${response.statusText}`);
      }

      await handleNgrokResponse(response);

      setSuccess(`User role updated to ${userRoleForm.role} successfully!`);
      setUserRoleForm({
        username: "",
        role: "user",
      });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user role");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!window.confirm("Are you sure you want to delete this uploaded image?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/uploads/${uploadId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await handleNgrokResponse(response);
        throw new Error(errorData.error || `Failed to delete upload: ${response.status} ${response.statusText}`);
      }

      await handleNgrokResponse(response);

      setSuccess("Uploaded image deleted successfully!");
      fetchUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete upload");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = (imageData: string, filename: string) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(imageData.split(",")[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download image");
    }
  };

  const handleAddOptionRow = () => {
    const newIndex = optionsTable.length;
    setOptionsTable([
      ...optionsTable,
      { name: "", priceAdd: "", description: "", image: "" },
    ]);
  };

  const handleUpdateOptionRow = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...optionsTable];
    updated[index] = { ...updated[index], [field]: value };
    setOptionsTable(updated);
  };

  const handleRemoveOptionRow = (index: number) => {
    setOptionsTable(optionsTable.filter((_, i) => i !== index));
  };

  // Helper functions for filter tables
  const handleAddFilterRow = (type: 'printingOption' | 'deliverySpeed' | 'textureType') => {
    const newItem = { name: '', priceAdd: filterPricesEnabled ? 0 : undefined };
    if (type === 'printingOption') {
      setPrintingOptionsTable([...printingOptionsTable, newItem]);
    } else if (type === 'deliverySpeed') {
      setDeliverySpeedTable([...deliverySpeedTable, newItem]);
    } else if (type === 'textureType') {
      setTextureTypeTable([...textureTypeTable, newItem]);
    }
  };

  const handleUpdateFilterRow = (
    type: 'printingOption' | 'deliverySpeed' | 'textureType',
    index: number,
    field: 'name' | 'priceAdd',
    value: string | number
  ) => {
    if (type === 'printingOption') {
      const updated = [...printingOptionsTable];
      updated[index] = { ...updated[index], [field]: field === 'priceAdd' ? (value === '' ? undefined : parseFloat(value as string) || 0) : value };
      setPrintingOptionsTable(updated);
    } else if (type === 'deliverySpeed') {
      const updated = [...deliverySpeedTable];
      updated[index] = { ...updated[index], [field]: field === 'priceAdd' ? (value === '' ? undefined : parseFloat(value as string) || 0) : value };
      setDeliverySpeedTable(updated);
    } else if (type === 'textureType') {
      const updated = [...textureTypeTable];
      updated[index] = { ...updated[index], [field]: field === 'priceAdd' ? (value === '' ? undefined : parseFloat(value as string) || 0) : value };
      setTextureTypeTable(updated);
    }
  };

  const handleRemoveFilterRow = (
    type: 'printingOption' | 'deliverySpeed' | 'textureType',
    index: number
  ) => {
    if (type === 'printingOption') {
      setPrintingOptionsTable(printingOptionsTable.filter((_, i) => i !== index));
    } else if (type === 'deliverySpeed') {
      setDeliverySpeedTable(deliverySpeedTable.filter((_, i) => i !== index));
    } else if (type === 'textureType') {
      setTextureTypeTable(textureTypeTable.filter((_, i) => i !== index));
    }
  };

  const handleConvertOptionsToJSON = () => {
    const jsonString = JSON.stringify(optionsTable, null, 2);
    alert(`JSON Format:\n\n${jsonString}`);
  };

  const handleLoadOptionsFromJSON = () => {
    try {
      if (productForm.options) {
        const parsed = JSON.parse(productForm.options);
        if (Array.isArray(parsed)) {
          setOptionsTable(parsed);
          setShowOptionsTable(true);
        } else {
          setError("Options must be an array");
        }
      }
    } catch (err) {
      setError("Invalid JSON format");
    }
  };

  const tabs = [
    { id: "products", label: "Add Product", icon: Package },
    { id: "manage-products", label: "Manage Products", icon: Package },
    { id: "attribute-types", label: "Attribute Types", icon: Settings },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "sequences", label: "Sequences", icon: Settings },
    { id: "categories", label: "Add Category", icon: FolderPlus },
    { id: "manage-categories", label: "Manage Categories", icon: FolderPlus },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "uploads", label: "Uploaded Images", icon: ImageIcon },
    { id: "users", label: "Manage Users", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900 mb-4" />
        </div>
        <div className="mb-6 sm:mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-cream-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-cream-600">
            Manage products, categories, uploads, and admin users
          </p>
        </div>

        {/* Tabs - Production Ready Design */}
        <div className="bg-white rounded-xl shadow-md border border-cream-200 p-3 mb-6">
          <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setError(null);
                    setSuccess(null);
                    // Clear edit state when switching tabs
                    if (tab.id !== "products" && tab.id !== "categories") {
                      handleCancelEdit();
                    }
                    // Fetch data when switching to management tabs
                    if (tab.id === "manage-products") {
                      setSelectedSubCategoryFilter("");
                      fetchProducts();
                    } else if (tab.id === "manage-categories") {
                      fetchCategories();
                      fetchSubCategories(); // Also fetch subcategories for the manage page
                    } else if (tab.id === "users") {
                      fetchUsers();
                    } else if (tab.id === "orders") {
                      fetchOrders();
                    } else if (tab.id === "attribute-types") {
                      fetchAttributeTypes();
                    } else if (tab.id === "products") {
                      // Fetch attribute types when products tab is active so they're available for assignment
                      fetchAttributeTypes();
                      fetchProducts(); // Also refresh products list
                    }
                  }}
                  className={`flex items-center gap-2.5 px-5 py-3 text-sm sm:text-base font-semibold transition-all duration-200 whitespace-nowrap rounded-lg border-2 ${
                    activeTab === tab.id
                      ? "bg-cream-900 text-white border-cream-900 shadow-lg transform scale-105"
                      : "text-cream-700 bg-white border-cream-200 hover:bg-cream-50 hover:border-cream-300 hover:text-cream-900 hover:shadow-sm"
                  }`}
                >
                  <Icon size={18} className={`sm:w-5 sm:h-5 ${activeTab === tab.id ? "text-white" : "text-cream-600"}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
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
              <CheckCircle size={20} />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Add/Edit Product */}
          {activeTab === "products" && (
            <form onSubmit={handleProductSubmit} className="space-y-6">
              {editingProductId && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-blue-800 font-medium">
                    Editing Product: {productForm.name || "Loading..."}
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
              {/* Form Progress Indicator - Show all required fields */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Required Fields</span>
                  <span className="text-sm text-blue-700">
                    {(() => {
                      // Check all fields that are marked with (*) in the form
                      const requiredFields = [
                        { value: productForm.name?.trim(), label: 'Product Name' },
                        { value: productForm.basePrice, label: 'Base Price' },
                        { value: productForm.category || productForm.subcategory, label: 'Category/Subcategory' },
                        { value: productForm.gstPercentage, label: 'GST %' },
                        { value: productForm.instructions?.trim(), label: 'Instructions' },
                      ];
                      const completed = requiredFields.filter(f => f.value).length;
                      return `${completed}/${requiredFields.length} completed`;
                    })()}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(() => {
                        const requiredFields = [
                          productForm.name?.trim(),
                          productForm.basePrice,
                          productForm.category || productForm.subcategory,
                          productForm.gstPercentage,
                          productForm.instructions?.trim(),
                        ];
                        return (requiredFields.filter(Boolean).length / requiredFields.length) * 100;
                      })()}%`,
                    }}
                  />
                </div>
              </div>

              {/* Basic Information Section */}
              <div className="border border-cream-300 rounded-lg p-6 bg-white">
                <h3 className="text-lg font-semibold text-cream-900 mb-4 flex items-center gap-2">
                  <Package size={20} />
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2 flex items-center gap-2">
                      Product Name *
                      <div className="group relative">
                        <Info size={14} className="text-cream-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 bg-cream-900 text-white text-xs rounded-lg shadow-lg">
                          Enter a clear, descriptive name that customers will see. This should be unique and searchable.
                        </div>
                      </div>
                    </label>
                    <input
                      id="product-name"
                      name="name"
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => {
                        setProductForm({ ...productForm, name: e.target.value });
                        // Clear error when user starts typing
                        if (productFormErrors.name) {
                          setProductFormErrors({ ...productFormErrors, name: undefined });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                        productFormErrors.name ? 'border-red-300 bg-red-50' : 'border-cream-300'
                      }`}
                      placeholder="e.g., Glossy Business Cards - Premium"
                      maxLength={100}
                    />
                    {productFormErrors.name && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {productFormErrors.name}
                      </p>
                    )}
                    {productForm.name && productForm.name.length > 80 && !productFormErrors.name && (
                      <p className="text-xs text-yellow-600 mt-1">
                        {100 - productForm.name.length} characters remaining
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2 flex items-center gap-2">
                      Description
                      <div className="group relative">
                        <Info size={14} className="text-cream-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 bg-cream-900 text-white text-xs rounded-lg shadow-lg">
                          Detailed product description that customers will see. Use formatting to make it readable and professional. You can insert images and links using the toolbar buttons.
                        </div>
                      </div>
                    </label>
                    <CKEditor
                      value={productForm.description}
                      onChange={(html) =>
                        setProductForm({
                          ...productForm,
                          description: html,
                        })
                      }
                      placeholder="Enter product description. Use the toolbar to format text, insert images, links, and more."
                    />
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">💡 CKEditor Features:</p>
                      <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                        <li>Format text with <strong>bold</strong>, <em>italic</em>, underline, and more</li>
                        <li>Insert images and links using the toolbar buttons</li>
                        <li>Create lists, tables, and embed media (YouTube, etc.)</li>
                        <li>All formatting is preserved when saved</li>
                      </ul>
                    </div>
                  </div>

                  {/* Product Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2 flex items-center gap-2">
                      Product Image
                      <div className="group relative">
                        <Info size={14} className="text-cream-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 bg-cream-900 text-white text-xs rounded-lg shadow-lg">
                          Upload a product image that will be displayed to customers. Supported formats: JPG, PNG, WebP. Max size: 5MB.
                        </div>
                      </div>
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                            if (!validTypes.includes(file.type)) {
                              setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
                              return;
                            }
                            // Validate file size (5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              setError("Image size must be less than 5MB.");
                              return;
                            }
                            setProductForm({ ...productForm, image: file });
                            setError(null);
                          }
                        }}
                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cream-900 file:text-white hover:file:bg-cream-800"
                      />
                      {productForm.image && (
                        <div className="mt-2">
                          <p className="text-xs text-cream-600 mb-1">Selected: {productForm.image.name}</p>
                          <div className="relative w-32 h-32 border border-cream-300 rounded-lg overflow-hidden">
                            <img
                              src={URL.createObjectURL(productForm.image)}
                              alt="Product preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      {editingProductId && !productForm.image && (
                        <p className="text-xs text-cream-600">Leave empty to keep existing image</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Section - Order Quantity and Other Options */}
              <div className="border border-cream-300 rounded-lg p-4 bg-cream-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-cream-900">Product Filters</h3>
                  <div className="text-sm text-cream-600">
                    <Info size={14} className="inline mr-1" />
                    Printing options should be configured as attributes in the Product Attributes section below
                  </div>
                </div>
                
                {/* Order Quantity Configuration */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-cream-200">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-cream-900">
                      Quantity Configuration *
                    </label>
                    <div className="text-xs text-cream-600">
                      <Info size={14} className="inline mr-1" />
                      Configure quantity options based on production capabilities and raw material batching
                    </div>
                  </div>
                  
                  {/* Simple Quantity Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-cream-900 mb-2">
                        Min Quantity
                      </label>
                      <input
                        type="number"
                        value={productForm.filters.orderQuantity.min}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            filters: {
                              ...productForm.filters,
                              orderQuantity: {
                                ...productForm.filters.orderQuantity,
                                min: parseInt(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cream-900 mb-2">
                        Max Quantity
                      </label>
                      <input
                        type="number"
                        value={productForm.filters.orderQuantity.max}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            filters: {
                              ...productForm.filters,
                              orderQuantity: {
                                ...productForm.filters.orderQuantity,
                                max: parseInt(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cream-900 mb-2">
                        Multiples Of
                      </label>
                      <input
                        type="number"
                        value={productForm.filters.orderQuantity.multiples}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            filters: {
                              ...productForm.filters,
                              orderQuantity: {
                                ...productForm.filters.orderQuantity,
                                multiples: parseInt(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      />
                    </div>
                  </div>

                </div>

                {/* Delivery Speed Table */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-cream-900">
                      Delivery Speed Options
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddFilterRow('deliverySpeed')}
                      className="px-3 py-1 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Option
                    </button>
                  </div>
                  <div className="border border-cream-300 rounded-lg overflow-hidden bg-white">
                    {deliverySpeedTable.length === 0 ? (
                      <p className="text-sm text-cream-600 text-center py-4">
                        No delivery speed options added. Click "Add Option" to start.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-cream-100">
                              <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                Delivery Speed
                              </th>
                              {filterPricesEnabled && (
                                <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                  Price Add (per 1000 units)
                                </th>
                              )}
                              <th className="border border-cream-300 px-3 py-2 text-center text-sm font-medium text-cream-900 w-20">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {deliverySpeedTable.map((item, index) => {
                              const itemName = typeof item === 'string' ? item : item.name;
                              const itemPrice = typeof item === 'object' ? (item.priceAdd ?? 0) : 0;
                              return (
                                <tr key={index}>
                                  <td className="border border-cream-300 px-3 py-2">
                                    <input
                                      type="text"
                                      value={itemName}
                                      onChange={(e) => handleUpdateFilterRow('deliverySpeed', index, 'name', e.target.value)}
                                      className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                      placeholder="e.g., Standard"
                                    />
                                  </td>
                                  {filterPricesEnabled && (
                                    <td className="border border-cream-300 px-3 py-2">
                                      <input
                                        type="number"
                                        step="0.00001"
                                        value={itemPrice}
                                        onChange={(e) => handleUpdateFilterRow('deliverySpeed', index, 'priceAdd', e.target.value)}
                                        className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                        placeholder="0.00"
                                      />
                                    </td>
                                  )}
                                  <td className="border border-cream-300 px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFilterRow('deliverySpeed', index)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Texture Type Table (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-cream-900">
                      Texture Type Options (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddFilterRow('textureType')}
                      className="px-3 py-1 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Texture
                    </button>
                  </div>
                  <div className="border border-cream-300 rounded-lg overflow-hidden bg-white">
                    {textureTypeTable.length === 0 ? (
                      <p className="text-sm text-cream-600 text-center py-4">
                        No texture types added. Click "Add Texture" to start.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-cream-100">
                              <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                Texture Type
                              </th>
                              {filterPricesEnabled && (
                                <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                  Price Add (per 1000 units)
                                </th>
                              )}
                              <th className="border border-cream-300 px-3 py-2 text-center text-sm font-medium text-cream-900 w-20">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {textureTypeTable.map((item, index) => {
                              const itemName = typeof item === 'string' ? item : item.name;
                              const itemPrice = typeof item === 'object' ? (item.priceAdd ?? 0) : 0;
                              return (
                                <tr key={index}>
                                  <td className="border border-cream-300 px-3 py-2">
                                    <input
                                      type="text"
                                      value={itemName}
                                      onChange={(e) => handleUpdateFilterRow('textureType', index, 'name', e.target.value)}
                                      className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                      placeholder="e.g., Texture No.1"
                                    />
                                  </td>
                                  {filterPricesEnabled && (
                                    <td className="border border-cream-300 px-3 py-2">
                                      <input
                                        type="number"
                                        step="0.00001"
                                        value={itemPrice}
                                        onChange={(e) => handleUpdateFilterRow('textureType', index, 'priceAdd', e.target.value)}
                                        className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                        placeholder="0.00"
                                      />
                                    </td>
                                  )}
                                  <td className="border border-cream-300 px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFilterRow('textureType', index)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Discounts Section */}
              <div className="border border-cream-300 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-cream-900">Quantity-Based Discounts</h3>
                    <p className="text-sm text-cream-600 mt-1">
                      Set discounts based on order quantity. Customers get better prices when ordering in bulk.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm({
                        ...productForm,
                        quantityDiscounts: [
                          ...(productForm.quantityDiscounts || []),
                          { minQuantity: 0, maxQuantity: null, discountPercentage: 0 },
                        ],
                      });
                    }}
                    className="px-3 py-1 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Discount Tier
                  </button>
                </div>

                {(!productForm.quantityDiscounts || productForm.quantityDiscounts.length === 0) ? (
                  <div className="bg-cream-50 border border-cream-200 rounded-lg p-4">
                    <p className="text-sm text-cream-600 text-center">
                      No discount tiers added. Click "Add Discount Tier" to set quantity-based discounts.
                    </p>
                  </div>
                ) : (
                  <div className="border border-cream-300 rounded-lg overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-cream-100">
                            <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                              Min Quantity
                            </th>
                            <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                              Max Quantity
                            </th>
                            <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                              Discount (%)
                            </th>
                            <th className="border border-cream-300 px-3 py-2 text-center text-sm font-medium text-cream-900 w-20">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(productForm.quantityDiscounts || []).map((discount, index) => (
                            <tr key={index}>
                              <td className="border border-cream-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={discount.minQuantity}
                                  onChange={(e) => {
                                    const updated = [...(productForm.quantityDiscounts || [])];
                                    updated[index].minQuantity = parseInt(e.target.value) || 0;
                                    setProductForm({ ...productForm, quantityDiscounts: updated });
                                  }}
                                  className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                  placeholder="e.g., 1000"
                                  min="0"
                                />
                              </td>
                              <td className="border border-cream-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={discount.maxQuantity || ""}
                                  onChange={(e) => {
                                    const updated = [...(productForm.quantityDiscounts || [])];
                                    updated[index].maxQuantity = e.target.value ? parseInt(e.target.value) : null;
                                    setProductForm({ ...productForm, quantityDiscounts: updated });
                                  }}
                                  className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                  placeholder="Leave empty for no limit"
                                  min="0"
                                />
                                <p className="text-xs text-cream-500 mt-1">Leave empty for unlimited</p>
                              </td>
                              <td className="border border-cream-300 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={discount.discountPercentage}
                                    onChange={(e) => {
                                      const updated = [...(productForm.quantityDiscounts || [])];
                                      updated[index].discountPercentage = parseFloat(e.target.value) || 0;
                                      setProductForm({ ...productForm, quantityDiscounts: updated });
                                    }}
                                    className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                    placeholder="e.g., 5"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                  />
                                  <span className="text-sm text-cream-600">%</span>
                                </div>
                                {discount.discountPercentage > 0 && (
                                  <p className="text-xs text-cream-600 mt-1">
                                    Price: {((100 - discount.discountPercentage) / 100).toFixed(2)}x base price
                                  </p>
                                )}
                              </td>
                              <td className="border border-cream-300 px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (productForm.quantityDiscounts || []).filter((_, i) => i !== index);
                                    setProductForm({ ...productForm, quantityDiscounts: updated });
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 bg-blue-50 border-t border-cream-300">
                      <p className="text-xs text-blue-800">
                        <strong>Example:</strong> Min: 1000, Max: 5000, Discount: 5% → Customers ordering 1000-5000 units get 5% off.
                        Min: 5000, Max: (empty), Discount: 10% → Customers ordering 5000+ units get 10% off.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing & Category Section */}
              <div className="border border-cream-300 rounded-lg p-6 bg-white">
                <h3 className="text-lg font-semibold text-cream-900 mb-4 flex items-center gap-2">
                  <CreditCard size={20} />
                  Pricing & Category
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2 flex items-center gap-2">
                      Base Price (INR per unit) *
                      <div className="group relative">
                        <Info size={14} className="text-cream-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 bg-cream-900 text-white text-xs rounded-lg shadow-lg">
                          The base price per unit before any options, discounts, or taxes are applied.
                        </div>
                      </div>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-600">₹</span>
                      <input
                        id="product-basePrice"
                        name="basePrice"
                        type="number"
                        required
                        step="0.00001"
                        min="0"
                        value={productForm.basePrice}
                        onChange={(e) => {
                          setProductForm({
                            ...productForm,
                            basePrice: e.target.value,
                          });
                          // Clear error when user starts typing
                          if (productFormErrors.basePrice) {
                            setProductFormErrors({ ...productFormErrors, basePrice: undefined });
                          }
                        }}
                        className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                          productFormErrors.basePrice ? 'border-red-300 bg-red-50' : 'border-cream-300'
                        }`}
                        placeholder="0.00000"
                      />
                      {productFormErrors.basePrice && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {productFormErrors.basePrice}
                        </p>
                      )}
                    </div>
                    {productForm.basePrice && parseFloat(productForm.basePrice) < 0 && !productFormErrors.basePrice && (
                      <p className="text-xs text-red-600 mt-1">Price cannot be negative</p>
                    )}
                  </div>

                </div>
              </div>

              {/* Category & Subcategory Section */}
              <div className="border border-cream-300 rounded-lg p-6 bg-white">
                <h3 className="text-lg font-semibold text-cream-900 mb-4 flex items-center gap-2">
                  <CreditCard size={20} />
                  Category & Subcategory
                </h3>
                <div className="space-y-4">
                  {/* Step 1: Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Main Type * <span className="text-xs text-cream-500 font-normal">(Select first to filter categories)</span>
                    </label>
                    <ReviewFilterDropdown
                      label="Select Type"
                      value={selectedType || ""}
                      onChange={async (value) => {
                        const newType = value as string;
                        setSelectedType(newType);
                        
                        // Clear category and subcategory when type changes
                        setSelectedCategoryPath([]);
                        setCategoryChildrenMap({});
                        setProductForm({
                          ...productForm,
                          category: "",
                          subcategory: "",
                        });
                        setCategoryProducts([]);
                        
                        // Filter categories by type
                        if (newType) {
                          const filtered = categories.filter(cat => cat.type === newType && !cat.parent);
                          setFilteredCategoriesByType(filtered);
                        } else {
                          setFilteredCategoriesByType([]);
                        }
                      }}
                      options={[
                        { value: "", label: "Select Type" },
                        { value: "Digital", label: "Digital" },
                        { value: "Bulk", label: "Bulk" },
                      ]}
                      className="w-full"
                    />
                    {!selectedType && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Please select a type first to see available categories
                      </p>
                    )}
                  </div>

                  {/* Step 2: Category Selection (only shown after type is selected) */}
                  {selectedType && (
                    <div>
                      <label className="block text-sm font-medium text-cream-900 mb-2">
                        Category * <span className="text-xs text-cream-500 font-normal">(Select based on type)</span>
                      </label>
                      <ReviewFilterDropdown
                        id="product-category"
                        label="Select Category"
                        value={productForm.category || selectedCategoryPath[0] || ""}
                        onChange={async (value) => {
                          if (value) {
                            // Set the first level of the path
                            setSelectedCategoryPath([value]);
                            // Update product form with the selected category
                            setProductForm({
                              ...productForm,
                              category: value,
                              subcategory: "", // Reset subcategory when category changes
                            });
                            
                            // Clear error when user selects a category
                            if (productFormErrors.category) {
                              setProductFormErrors({ ...productFormErrors, category: undefined });
                            }
                            
                            // Immediately fetch children for this category
                            await fetchCategoryChildren(value);
                            
                            // Clear products - will show subcategories instead
                            setCategoryProducts([]);
                          } else {
                            // Clear everything
                            setSelectedCategoryPath([]);
                            setCategoryChildrenMap({});
                            setProductForm({
                              ...productForm,
                              category: "",
                              subcategory: "",
                            });
                            setCategoryProducts([]);
                          }
                        }}
                        options={[
                          { value: "", label: "Select Category" },
                          ...filteredCategoriesByType
                            .filter(cat => !cat.parent) // Only show top-level categories
                            .map((cat) => ({
                              value: cat._id,
                              label: cat.name,
                            })),
                        ]}
                        className={`w-full ${productFormErrors.category ? 'border-red-300' : ''}`}
                      />
                      {productFormErrors.category && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {productFormErrors.category}
                        </p>
                      )}
                      {!productForm.category && selectedType && !productFormErrors.category && (
                        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          Please select a category to continue
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Subcategory Selection - Only Level 1 */}
                {productForm.category && selectedCategoryPath.length > 0 && (() => {
                  const children = categoryChildrenMap[selectedCategoryPath[0]] || [];
                  const isLoading = loadingCategoryChildren[selectedCategoryPath[0]] || false;
                  const selectedChildId = selectedCategoryPath[1] || "";

                  return (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-cream-900 mb-2">
                        Subcategory <span className="text-xs text-cream-500 font-normal">(Optional - Leave empty to create product directly in category)</span>
                      </label>
                      {isLoading && children.length === 0 ? (
                        <div className="w-full py-2 border border-cream-300 rounded-lg flex items-center justify-center">
                          <Loader className="animate-spin text-cream-600" size={16} />
                          <span className="ml-2 text-sm text-cream-600">Loading...</span>
                        </div>
                      ) : children.length > 0 ? (
                        <ReviewFilterDropdown
                          label="Select Subcategory"
                          value={selectedChildId || productForm.subcategory || ""}
                          onChange={async (value) => {
                            if (value) {
                              // Update path to include subcategory
                              setSelectedCategoryPath([selectedCategoryPath[0], value]);
                              
                              // Update product form
                              setProductForm({
                                ...productForm,
                                category: selectedCategoryPath[0],
                                subcategory: value,
                              });
                              
                              // Fetch products for the selected subcategory
                              try {
                                setLoadingCategoryProducts(true);
                                const productsResponse = await fetch(`${API_BASE_URL}/products/category/${value}`, {
                                  headers: getAuthHeaders(),
                                });
                                
                                if (productsResponse.ok) {
                                  const productsData = await handleNgrokResponse(productsResponse);
                                  setCategoryProducts(productsData || []);
                                }
                              } catch (err) {
                                console.error("Error fetching category products:", err);
                                setCategoryProducts([]);
                              } finally {
                                setLoadingCategoryProducts(false);
                              }
                            } else {
                              // Clear subcategory
                              setSelectedCategoryPath([selectedCategoryPath[0]]);
                              setProductForm({
                                ...productForm,
                                category: selectedCategoryPath[0],
                                subcategory: "",
                              });
                              
                              // Fetch products for the category
                              try {
                                setLoadingCategoryProducts(true);
                                const productsResponse = await fetch(`${API_BASE_URL}/products/category/${selectedCategoryPath[0]}`, {
                                  headers: getAuthHeaders(),
                                });
                                
                                if (productsResponse.ok) {
                                  const productsData = await handleNgrokResponse(productsResponse);
                                  setCategoryProducts(productsData || []);
                                }
                              } catch (err) {
                                console.error("Error fetching category products:", err);
                                setCategoryProducts([]);
                              } finally {
                                setLoadingCategoryProducts(false);
                              }
                            }
                          }}
                          options={[
                            { value: "", label: "None (Use Category Directly)" },
                            ...children
                              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                              .map((child) => ({
                                value: child._id,
                                label: child.name,
                              })),
                          ]}
                          className="w-full"
                        />
                      ) : null}
                    </div>
                  );
                })()}
                
                {/* Display categories, subcategories, or products based on selection */}
                {selectedType && (
                    <div className="mt-4 p-4 bg-cream-50 border border-cream-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-cream-900">
                          Existing Products in this Category
                        </h4>
                        {loadingCategoryProducts && (
                          <Loader className="animate-spin text-cream-600" size={16} />
                        )}
                      </div>
                      
                      {loadingCategoryProducts ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-cream-600">Loading...</p>
                        </div>
                      ) : !productForm.category ? (
                        // Show all categories under selected type
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredCategoriesByType
                            .filter(cat => !cat.parent)
                            .map((category) => (
                              <div
                                key={category._id}
                                className="flex items-center justify-between p-3 bg-white border border-cream-200 rounded-lg hover:border-cream-300 transition-colors cursor-pointer"
                                onClick={async () => {
                                  setProductForm({
                                    ...productForm,
                                    category: category._id,
                                    subcategory: "",
                                  });
                                  setSelectedCategoryPath([category._id]);
                                  setCategoryProducts([]);
                                  await fetchCategoryChildren(category._id);
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  {category.image && category.image.trim() !== "" && (
                                    <img
                                      src={category.image}
                                      alt={category.name}
                                      className="w-12 h-12 object-cover rounded-lg"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-cream-900 text-sm truncate">
                                      {category.name}
                                    </p>
                                    <p className="text-xs text-cream-600">
                                      {category.type} Category
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="text-cream-600" size={16} />
                              </div>
                            ))}
                          {filteredCategoriesByType.filter(cat => !cat.parent).length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-sm text-cream-600">
                                No categories found for this type.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : !productForm.subcategory ? (
                        // Show all subcategories under selected category
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {(categoryChildrenMap[productForm.category] || []).length > 0 ? (
                            (categoryChildrenMap[productForm.category] || [])
                              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                              .map((subcategory) => (
                                <div
                                  key={subcategory._id}
                                  className="flex items-center justify-between p-3 bg-white border border-cream-200 rounded-lg hover:border-cream-300 transition-colors cursor-pointer"
                                  onClick={async () => {
                                    setProductForm({
                                      ...productForm,
                                      subcategory: subcategory._id,
                                    });
                                    setSelectedCategoryPath([productForm.category, subcategory._id]);
                                    // Fetch products for this subcategory
                                    try {
                                      setLoadingCategoryProducts(true);
                                      const response = await fetch(`${API_BASE_URL}/products/category/${subcategory._id}`, {
                                        headers: getAuthHeaders(),
                                      });
                                      if (response.ok) {
                                        const data = await handleNgrokResponse(response);
                                        setCategoryProducts(data || []);
                                      } else {
                                        setCategoryProducts([]);
                                      }
                                    } catch (err) {
                                      console.error("Error fetching products:", err);
                                      setCategoryProducts([]);
                                    } finally {
                                      setLoadingCategoryProducts(false);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    {subcategory.image && subcategory.image.trim() !== "" && (
                                      <img
                                        src={subcategory.image}
                                        alt={subcategory.name}
                                        className="w-12 h-12 object-cover rounded-lg"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-cream-900 text-sm truncate">
                                        {subcategory.name}
                                      </p>
                                      <p className="text-xs text-cream-600">
                                        Subcategory
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronRight className="text-cream-600" size={16} />
                                </div>
                              ))
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-cream-600">
                                No subcategories found. Product will be created directly under this category.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Show all products under selected subcategory
                        categoryProducts.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-cream-600">
                              No products found in this subcategory. This will be the first product.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {categoryProducts.map((product) => {
                              return (
                                <div
                                  key={product._id}
                                  className="flex items-center justify-between p-3 bg-white border border-cream-200 rounded-lg hover:border-cream-300 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    {product.image && product.image.trim() !== "" && (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-12 h-12 object-cover rounded-lg"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-cream-900 text-sm truncate">
                                        {product.name}
                                      </p>
                                      <p className="text-xs text-cream-600">
                                        ₹{product.basePrice} per unit
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleEditProduct(product._id)}
                                    className="px-3 py-1.5 text-xs bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors flex items-center gap-1 whitespace-nowrap"
                                  >
                                    <Eye size={14} />
                                    View
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-cream-900">
                    Options
                  </label>
                  {productForm.options && (
                    <button
                      type="button"
                      onClick={handleLoadOptionsFromJSON}
                      className="px-3 py-1 text-xs bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors"
                    >
                      Load from JSON
                    </button>
                  )}
                </div>

                <div className="border border-cream-300 rounded-lg p-4">
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={handleAddOptionRow}
                      className="px-3 py-1 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Option
                    </button>
                  </div>

                  {optionsTable.length === 0 ? (
                    <p className="text-sm text-cream-600 text-center py-4">
                      No options added. Click "Add Option" to start.
                    </p>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-cream-100">
                                <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900 min-w-[150px]">
                                  Name
                                </th>
                                <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900 min-w-[150px]">
                                  Price (INR per unit)
                                </th>
                                <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900 min-w-[200px]">
                                  Description
                                </th>
                                <th className="border border-cream-300 px-3 py-2 text-center text-sm font-medium text-cream-900 w-20">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {optionsTable.map((option, index) => (
                                <tr key={index}>
                                  <td className="border border-cream-300 px-3 py-2">
                                    <input
                                      type="text"
                                      value={option.name}
                                      onChange={(e) =>
                                        handleUpdateOptionRow(
                                          index,
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                      placeholder="Option name"
                                    />
                                  </td>
                                  <td className="border border-cream-300 px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.00001"
                                      min="0"
                                      value={option.priceAdd}
                                      onChange={(e) =>
                                        handleUpdateOptionRow(
                                          index,
                                          "priceAdd",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm font-medium"
                                      placeholder="0.00 (INR per unit)"
                                    />
                                  </td>
                                  <td className="border border-cream-300 px-3 py-2">
                                    <textarea
                                      value={option.description}
                                      onChange={(e) =>
                                        handleUpdateOptionRow(
                                          index,
                                          "description",
                                          e.target.value
                                        )
                                      }
                                      rows={2}
                                      className="w-full px-2 py-1 border border-cream-200 rounded text-sm resize-y"
                                      placeholder="Description"
                                    />
                                  </td>
                                  <td className="border border-cream-300 px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionRow(index)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-4">
                        {optionsTable.map((option, index) => (
                          <div
                            key={index}
                            className="bg-white border border-cream-300 rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-cream-900">Option {index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionRow(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-cream-700 mb-1">
                                Name
                              </label>
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) =>
                                  handleUpdateOptionRow(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-cream-200 rounded text-sm"
                                placeholder="Option name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-cream-700 mb-1">
                                Price (INR per unit)
                              </label>
                              <input
                                type="text"
                                value={option.priceAdd}
                                onChange={(e) =>
                                  handleUpdateOptionRow(
                                    index,
                                    "priceAdd",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-cream-200 rounded text-sm font-medium"
                                placeholder="0.00 (INR per unit)"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-cream-700 mb-1">
                                Description
                              </label>
                              <textarea
                                value={option.description}
                                onChange={(e) =>
                                  handleUpdateOptionRow(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-cream-200 rounded text-sm resize-y"
                                placeholder="Description"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* File Upload Constraints & Additional Settings */}
              <div className="border border-cream-300 rounded-lg p-4 bg-purple-50">
                <h3 className="text-lg font-semibold text-cream-900 mb-4">File Upload Constraints & Additional Settings</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Maximum File Size */}
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Maximum File Size (MB)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={productForm.maxFileSizeMB}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          maxFileSizeMB: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="e.g., 10"
                    />
                    <p className="text-xs text-cream-600 mt-1">Enforces technical constraints for Staff uploads</p>
                  </div>

                  {/* Block CDR and JPG */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm font-medium text-cream-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productForm.blockCDRandJPG}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            blockCDRandJPG: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-cream-900 border-cream-300 rounded focus:ring-cream-500"
                      />
                      <span>Block CDR and JPG Files</span>
                    </label>
                    <p className="text-xs text-cream-600 ml-2">Restricts accepted file formats for production</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* File Width Constraints */}
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Min File Width (pixels)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.minFileWidth}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          minFileWidth: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="e.g., 2000"
                    />
                    <p className="text-xs text-cream-600 mt-1">Minimum width for user artwork files</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Max File Width (pixels)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.maxFileWidth}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          maxFileWidth: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="e.g., 5000"
                    />
                    <p className="text-xs text-cream-600 mt-1">Maximum width for user artwork files</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* File Height Constraints */}
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Min File Height (pixels)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.minFileHeight}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          minFileHeight: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="e.g., 1500"
                    />
                    <p className="text-xs text-cream-600 mt-1">Minimum height for user artwork files</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Max File Height (pixels)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.maxFileHeight}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          maxFileHeight: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="e.g., 4000"
                    />
                    <p className="text-xs text-cream-600 mt-1">Maximum height for user artwork files</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Additional Design Charge */}
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Additional Design Charge (INR)
                    </label>
                    <input
                      type="number"
                      step="0.00001"
                      min="0"
                      value={productForm.additionalDesignCharge}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          additionalDesignCharge: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="e.g., 500"
                    />
                    <p className="text-xs text-cream-600 mt-1">Fixed fee if Staff requires design help</p>
                  </div>

                  {/* GST Percentage */}
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      GST % *
                    </label>
                    <input
                      id="product-gstPercentage"
                      name="gstPercentage"
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      max="100"
                      value={productForm.gstPercentage}
                      onChange={(e) => {
                        setProductForm({
                          ...productForm,
                          gstPercentage: e.target.value,
                        });
                        // Clear error when user starts typing
                        if (productFormErrors.gstPercentage) {
                          setProductFormErrors({ ...productFormErrors, gstPercentage: undefined });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                        productFormErrors.gstPercentage ? 'border-red-300 bg-red-50' : 'border-cream-300'
                      }`}
                      placeholder="e.g., 18"
                    />
                    {productFormErrors.gstPercentage && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {productFormErrors.gstPercentage}
                      </p>
                    )}
                    {!productFormErrors.gstPercentage && (
                      <p className="text-xs text-red-600 mt-1 font-medium">CRITICAL: Required for invoice calculation</p>
                    )}
                  </div>
                </div>

                {/* Price Display Setting */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.showPriceIncludingGst}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          showPriceIncludingGst: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-cream-900 block">
                        Show Prices Including GST
                      </span>
                      <p className="text-xs text-cream-600 mt-1">
                        {productForm.showPriceIncludingGst 
                          ? "Prices will be displayed including GST on the product page. (Not recommended - industry standard is to show excluding GST)"
                          : "Prices will be displayed excluding GST on the product page. GST will be added at checkout. (Recommended - industry standard)"}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Custom Instructions Section */}
                <div className="mt-6 border border-cream-300 rounded-lg p-6 bg-yellow-50">
                  <h3 className="text-lg font-semibold text-cream-900 mb-2 flex items-center gap-2">
                    <Info size={20} />
                    Custom Instructions for Customers
                  </h3>
                  <p className="text-sm text-cream-600 mb-4">
                    Add specific instructions that customers must follow. If instructions are not followed, the company is not responsible. These instructions will be displayed prominently to customers.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Instructions *
                    </label>
                    <textarea
                      id="product-instructions"
                      name="instructions"
                      value={productForm.instructions}
                      onChange={(e) => {
                        setProductForm({
                          ...productForm,
                          instructions: e.target.value,
                        });
                        // Clear error when user starts typing
                        if (productFormErrors.instructions) {
                          setProductFormErrors({ ...productFormErrors, instructions: undefined });
                        }
                      }}
                      rows={6}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                        productFormErrors.instructions ? 'border-red-300 bg-red-50' : 'border-cream-300'
                      }`}
                      placeholder="Example: Maximum file size: 10 MB. Files must be in PNG or PDF format only. CDR and JPG files are not accepted. Required dimensions: 3000 × 2000 pixels. Please ensure all text is converted to outlines before uploading."
                    />
                    {productFormErrors.instructions && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {productFormErrors.instructions}
                      </p>
                    )}
                    {!productFormErrors.instructions && (
                      <p className="text-xs text-yellow-700 mt-2 font-medium">
                        ⚠️ These instructions will be displayed to customers with a disclaimer that the company is not responsible if instructions are not followed.
                      </p>
                    )}
                  </div>
                </div>

                {/* Production Sequence Section */}
                <div className="mt-6 border border-cream-300 rounded-lg p-6 bg-blue-50">
                  <h3 className="text-lg font-semibold text-cream-900 mb-2 flex items-center gap-2">
                    <Info size={20} />
                    Production Sequence (Department Order)
                  </h3>
                  <p className="text-sm text-cream-600 mb-4">
                    Select a sequence or customize it for this specific product. If not set, the default department sequence will be used.
                  </p>
                  
                  {(() => {
                    // Check if we have any way to show the sequence UI
                    const hasDepartments = departments.length > 0;
                    const hasProductionSequence = productForm.productionSequence && productForm.productionSequence.length > 0;
                    const hasSelectedSequence = selectedSequenceId !== null;
                    const hasSequences = sequences.length > 0;
                    
                    // Check if selected sequence has departments
                    const selectedSequence = hasSelectedSequence 
                      ? sequences.find((s: any) => s._id === selectedSequenceId)
                      : null;
                    const selectedSequenceHasDepts = selectedSequence && 
                      selectedSequence.departments && 
                      selectedSequence.departments.length > 0;
                    
                    // Show error only if we have no way to display sequences
                    const shouldShowError = !hasDepartments && 
                      !hasProductionSequence && 
                      !hasSelectedSequence && 
                      !hasSequences;
                    
                    return shouldShowError ? (
                      <div className="p-4 bg-cream-50 border border-cream-200 rounded-lg">
                        <p className="text-sm text-cream-600 text-center">
                          No departments available. Please create departments first.
                        </p>
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {/* Sequence List - Clickable to expand/collapse */}
                      {sequences.length > 0 && (
                        <div className="border border-cream-300 rounded-lg p-4 bg-white">
                          <h4 className="text-sm font-medium text-cream-900 mb-3">Available Sequences:</h4>
                          <div className="space-y-2">
                            {sequences.map((seq: any) => {
                              const isExpanded = selectedSequenceId === seq._id;
                              const seqDepts = (seq.departments || []).map((d: any) => {
                                if (!d || !d.department) return null;
                                return typeof d.department === 'object' && d.department !== null 
                                  ? d.department._id 
                                  : d.department;
                              }).filter((id: any) => id !== null);
                              
                              return (
                                <div key={seq._id} className="border border-cream-200 rounded-lg overflow-hidden">
                                  <div
                                    onClick={() => {
                                      // Toggle: if same sequence, close; if different, open new one
                                      if (selectedSequenceId === seq._id) {
                                        // Close current
                                        setSelectedSequenceId(null);
                                        setProductForm({
                                          ...productForm,
                                          productionSequence: [],
                                        });
                                      } else {
                                        // Open new sequence
                                        setSelectedSequenceId(seq._id);
                                        // Load sequence departments into product form
                                        setProductForm({
                                          ...productForm,
                                          productionSequence: seqDepts,
                                        });
                                        
                                        // Load sequence attributes into selectedAttributeTypes
                                        if (seq.attributes && Array.isArray(seq.attributes) && seq.attributes.length > 0) {
                                          const loadedAttributes = seq.attributes
                                            .map((attr: any, index: number) => {
                                              if (!attr) return null;
                                              const attrId = typeof attr === 'object' && attr !== null ? attr._id : attr;
                                              if (!attrId) return null;
                                              return {
                                                attributeTypeId: attrId,
                                                isEnabled: true,
                                                isRequired: false,
                                                displayOrder: index,
                                              };
                                            })
                                            .filter((attr: any) => attr !== null);
                                          setSelectedAttributeTypes(loadedAttributes);
                                        }
                                      }
                                    }}
                                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
                                      isExpanded
                                        ? "bg-cream-100 border-cream-900"
                                        : "bg-cream-50 hover:bg-cream-100"
                                    }`}
                                  >
                                    <p className="font-medium text-cream-900">{seq.name}</p>
                                    <ChevronRight 
                                      size={18} 
                                      className={`text-cream-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    />
                                  </div>
                                  
                                  {/* Expanded Sequence Details */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="border-t border-cream-200 bg-white"
                                      >
                                        <div className="p-4 space-y-2">
                                          <h5 className="text-xs font-semibold text-cream-700 mb-2">Sequence Departments:</h5>
                                          <AnimatePresence>
                                            {productForm.productionSequence.map((deptId, index) => {
                                              const dept = departments.find((d: any) => d._id === deptId);
                                              if (!dept) return null;
                                              return (
                                                <motion.div
                                                  key={deptId}
                                                  initial={{ opacity: 0, x: -20 }}
                                                  animate={{ opacity: 1, x: 0 }}
                                                  exit={{ opacity: 0, x: -20 }}
                                                  transition={{ 
                                                    duration: 0.4,
                                                    delay: index * 0.1,
                                                    ease: "easeOut"
                                                  }}
                                                  className="flex items-center gap-3 p-3 bg-cream-50 border border-cream-200 rounded-lg"
                                                >
                                                  <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ 
                                                      duration: 0.3,
                                                      delay: index * 0.1 + 0.2,
                                                      type: "spring",
                                                      stiffness: 200
                                                    }}
                                                    className="flex items-center justify-center w-8 h-8 bg-cream-900 text-white rounded-full text-sm font-medium"
                                                  >
                                                    {index + 1}
                                                  </motion.span>
                                                  <div className="flex-1">
                                                    <p className="font-medium text-cream-900">{dept.name}</p>
                                                    <AnimatePresence>
                                                      {dept.description && (
                                                        <motion.p
                                                          initial={{ opacity: 0, height: 0, y: -10 }}
                                                          animate={{ opacity: 1, height: "auto", y: 0 }}
                                                          exit={{ opacity: 0, height: 0, y: -10 }}
                                                          transition={{ 
                                                            duration: 0.5,
                                                            delay: index * 0.1 + 0.3,
                                                            ease: "easeOut"
                                                          }}
                                                          className="text-xs text-cream-600 mt-1 overflow-hidden"
                                                        >
                                                          {dept.description}
                                                        </motion.p>
                                                      )}
                                                    </AnimatePresence>
                                                  </div>
                                                </motion.div>
                                              );
                                            })}
                                          </AnimatePresence>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom Sequence Button - Appears after sequences */}
                      {!isCustomizingSequence && (
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomizingSequence(true);
                              // Clear selected sequence when going to custom
                              setSelectedSequenceId(null);
                            }}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <Settings size={16} />
                            Create Custom Sequence
                          </button>
                        </div>
                      )}

                      {/* Custom Sequence Editor - Appears after sequences section */}
                      {isCustomizingSequence && (
                        <>
                          <div className="border-t-2 border-cream-300 pt-4 mt-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-lg font-semibold text-cream-900">Create Custom Sequence</h4>
                                <p className="text-sm text-cream-600 mt-1">
                                  Select departments in order to create a custom sequence for this product
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomizingSequence(false);
                                  // Reset production sequence when going back
                                  setProductForm({
                                    ...productForm,
                                    productionSequence: [],
                                  });
                                }}
                                className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                              >
                                <ChevronLeft size={14} />
                                Back
                              </button>
                            </div>
                          
                          {/* Selected Departments (in order) - Only show in custom mode */}
                          <AnimatePresence>
                            {productForm.productionSequence && productForm.productionSequence.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="border border-cream-300 rounded-lg p-4 bg-white"
                              >
                                <h4 className="text-sm font-medium text-cream-900 mb-3">Custom Production Sequence:</h4>
                                <div className="space-y-2">
                                  <AnimatePresence>
                                    {(productForm.productionSequence || []).map((deptId, index) => {
                                      const dept = departments.find((d: any) => d._id === deptId);
                                      if (!dept) return null;
                                      return (
                                        <motion.div
                                          key={deptId}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                          transition={{ 
                                            duration: 0.4,
                                            delay: index * 0.1,
                                            ease: "easeOut"
                                          }}
                                          className="flex items-center justify-between p-3 bg-cream-50 border border-cream-200 rounded-lg"
                                        >
                                          <div className="flex items-center gap-3 flex-1">
                                            <motion.span
                                              initial={{ scale: 0, rotate: -180 }}
                                              animate={{ scale: 1, rotate: 0 }}
                                              transition={{ 
                                                duration: 0.4,
                                                delay: index * 0.1 + 0.2,
                                                type: "spring",
                                                stiffness: 200
                                              }}
                                              className="flex items-center justify-center w-8 h-8 bg-cream-900 text-white rounded-full text-sm font-medium"
                                            >
                                              {index + 1}
                                            </motion.span>
                                            <div className="flex-1">
                                              <p className="font-medium text-cream-900">{dept.name}</p>
                                              <AnimatePresence>
                                                {dept.description && (
                                                  <motion.p
                                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                                    animate={{ opacity: 1, height: "auto", y: 0 }}
                                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                                    transition={{ 
                                                      duration: 0.5,
                                                      delay: index * 0.1 + 0.3,
                                                      ease: "easeOut"
                                                    }}
                                                    className="text-xs text-cream-600 mt-1 overflow-hidden"
                                                  >
                                                    {dept.description}
                                                  </motion.p>
                                                )}
                                              </AnimatePresence>
                                            </div>
                                          </div>
                                          <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            type="button"
                                            onClick={() => {
                                              const updated = (productForm.productionSequence || []).filter((id) => id !== deptId);
                                              setProductForm({
                                                ...productForm,
                                                productionSequence: updated,
                                              });
                                            }}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                          >
                                            <Trash2 size={16} />
                                          </motion.button>
                                        </motion.div>
                                      );
                                    })}
                                  </AnimatePresence>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Available Departments to Add - Only show in custom mode */}
                          <div className="border border-cream-300 rounded-lg p-4 bg-white">
                            <h4 className="text-sm font-medium text-cream-900 mb-3">Available Departments:</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {departments
                                .filter((d: any) => d.isEnabled && !(productForm.productionSequence || []).includes(d._id))
                                .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                                .map((dept: any) => (
                                  <div
                                    key={dept._id}
                                    className="flex items-center justify-between p-3 bg-cream-50 border border-cream-200 rounded-lg hover:bg-cream-100 transition-colors"
                                  >
                                    <div>
                                      <p className="font-medium text-cream-900">{dept.name}</p>
                                      {dept.description && (
                                        <p className="text-xs text-cream-600">{dept.description}</p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductForm({
                                          ...productForm,
                                          productionSequence: [...(productForm.productionSequence || []), dept._id],
                                        });
                                      }}
                                      className="px-3 py-1 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                                    >
                                      <Plus size={14} />
                                      Add
                                    </button>
                                  </div>
                                ))}
                            </div>
                            {departments.filter((d: any) => d.isEnabled && !(productForm.productionSequence || []).includes(d._id)).length === 0 && (
                              <p className="text-sm text-cream-600 text-center py-4">
                                All available departments have been added to the sequence.
                              </p>
                            )}
                          </div>

                          {/* Save Button */}
                          <div className="mt-4 flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                // Save the custom sequence (it's already in productForm.productionSequence)
                                // Exit custom mode
                                setIsCustomizingSequence(false);
                                // Clear selected sequence ID since we're using a custom sequence now
                                setSelectedSequenceId(null);
                                // Show success message
                                setSuccess("Custom sequence saved for this product. The original sequence template remains unchanged.");
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                              disabled={!productForm.productionSequence || productForm.productionSequence.length === 0}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                                productForm.productionSequence && productForm.productionSequence.length > 0
                                  ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
                              }`}
                            >
                              <CheckCircle size={16} />
                              Save Custom Sequence
                            </button>
                          </div>
                          </div>
                        </>
                      )}

                      {(!productForm.productionSequence || productForm.productionSequence.length === 0) && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> If no custom sequence is set, the default department sequence will be used when orders are created for this product.
                          </p>
                        </div>
                      )}
                    </div>
                    );
                  })()}
                </div>
              </div>

              {/* Product Attributes (Advanced) - Moved to end of form */}
              <div className="border border-cream-300 rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-cream-900">Product Attributes (Advanced)</h3>
                    <p className="text-sm text-cream-600 mt-1">
                      Assign reusable attribute types to this product. These are more flexible than the legacy options above.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateAttributeModal(true)}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      title="Create new attribute type"
                    >
                      <Plus size={14} />
                      Create Attribute
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchAttributeTypes()}
                      disabled={loadingAttributeTypes}
                      className="px-3 py-1.5 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                      title="Refresh attribute types list"
                    >
                      {loadingAttributeTypes ? (
                        <Loader className="animate-spin" size={14} />
                      ) : (
                        <Settings size={14} />
                      )}
                      Refresh
                    </button>
                  </div>
                </div>

                {loadingAttributeTypes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="animate-spin text-cream-600" size={24} />
                    <span className="ml-3 text-sm text-cream-600">Loading attribute types...</span>
                  </div>
                ) : (!attributeTypes || attributeTypes.length === 0) ? (
                  <div className="bg-cream-50 border border-cream-200 rounded-lg p-4">
                    <p className="text-sm text-cream-700">
                      <strong>No attribute types found.</strong> Click "Create Attribute" to create a new attribute type, or create attribute types in the "Attribute Types" tab.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Select Attribute Types to Use with This Product
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(attributeTypes || []).map((attrType) => {
                        const isSelected = (selectedAttributeTypes || []).some(
                          (sa) => sa.attributeTypeId === attrType._id
                        );
                        const selectedAttr = (selectedAttributeTypes || []).find(
                          (sa) => sa.attributeTypeId === attrType._id
                        );

                        return (
                          <div
                            key={attrType._id}
                            className={`border rounded-lg p-3 ${
                              isSelected
                                ? "border-green-500 bg-green-50"
                                : "border-cream-300 bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAttributeTypes([
                                      ...(selectedAttributeTypes || []),
                                      {
                                        attributeTypeId: attrType._id,
                                        isEnabled: true,
                                        isRequired: attrType.isRequired || false,
                                        displayOrder: (selectedAttributeTypes || []).length,
                                      },
                                    ]);
                                  } else {
                                    setSelectedAttributeTypes(
                                      (selectedAttributeTypes || []).filter(
                                        (sa) => sa.attributeTypeId !== attrType._id
                                      )
                                    );
                                  }
                                }}
                                className="w-4 h-4 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-cream-900">
                                      {attrType.attributeName}
                                    </h4>
                                    <p className="text-xs text-cream-600 mt-1">
                                      {attrType.inputStyle || "N/A"} • {attrType.primaryEffectType || "N/A"} •{" "}
                                      {attrType.isPricingAttribute ? "Affects Price" : "No Price Impact"}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="mt-3 space-y-2 pl-7">
                                    <div className="flex items-center gap-4">
                                      <label className="flex items-center gap-2 text-sm text-cream-700">
                                        <input
                                          type="checkbox"
                                          checked={selectedAttr?.isRequired || false}
                                          onChange={(e) => {
                                            setSelectedAttributeTypes(
                                              (selectedAttributeTypes || []).map((sa) =>
                                                sa.attributeTypeId === attrType._id
                                                  ? { ...sa, isRequired: e.target.checked }
                                                  : sa
                                              )
                                            );
                                          }}
                                          className="w-4 h-4 text-cream-900 border-cream-300 rounded"
                                        />
                                        Required for this product
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {selectedAttributeTypes && selectedAttributeTypes.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>{selectedAttributeTypes.length}</strong> attribute type(s) selected. These will be available when customers customize this product.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Create Attribute Modal - Full Form */}
              {showCreateAttributeModal && (
                <div 
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowCreateAttributeModal(false);
                    }
                  }}
                >
                  <div 
                    className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-cream-900">Create New Attribute Type</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateAttributeModal(false);
                          setEditingAttributeTypeId(null);
                          setAttributeTypeForm({
                            attributeName: "",
                            inputStyle: "DROPDOWN",
                            effectDescription: "",
                            simpleOptions: "",
                            isPriceEffect: false,
                            isFixedQuantity: false,
                            priceEffectAmount: "",
                            fixedQuantityMin: "",
                            fixedQuantityMax: "",
                            primaryEffectType: "INFORMATIONAL",
                            priceImpactPer1000: "",
                            fileRequirements: "",
                            attributeOptionsTable: [],
                            functionType: "GENERAL",
                            isPricingAttribute: false,
                            isFixedQuantityNeeded: false,
                            isFilterable: false,
                            attributeValues: [],
                            defaultValue: "",
                            isRequired: false,
                            displayOrder: 0,
                            isCommonAttribute: true,
                            applicableCategories: [],
                            applicableSubCategories: [],
                          });
                        }}
                        className="text-cream-600 hover:text-cream-900 p-1"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <form onSubmit={handleAttributeTypeSubmit} className="space-y-6">
                      {/* Step 1: Basic Information */}
                      <div className="border-b border-cream-200 pb-4">
                        <h3 className="text-lg font-semibold text-cream-900 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-cream-900 mb-2">
                              Attribute Name * <span className="text-xs text-cream-500 font-normal">(What customers will see)</span>
                            </label>
                            <input
                              id="attribute-name"
                              name="attributeName"
                              type="text"
                              value={attributeTypeForm.attributeName}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, attributeName: e.target.value })}
                              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent"
                              placeholder="e.g., Printing Option, Paper Type"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cream-900 mb-2">
                              How Customers Select This * <span className="text-xs text-cream-500 font-normal">(Input method)</span>
                            </label>
                            <select
                              id="attribute-inputStyle"
                              name="inputStyle"
                              value={attributeTypeForm.inputStyle}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, inputStyle: e.target.value })}
                              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent"
                              required
                            >
                              <option value="DROPDOWN">Dropdown Menu</option>
                              <option value="RADIO">Radio Buttons</option>
                              <option value="CHECKBOX">Checkbox</option>
                              <option value="TEXT_FIELD">Text Field</option>
                              <option value="NUMBER">Number Input</option>
                              <option value="FILE_UPLOAD">File Upload</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cream-900 mb-2">
                              What This Affects * <span className="text-xs text-cream-500 font-normal">(Description of impact on product)</span>
                            </label>
                            <textarea
                              value={attributeTypeForm.effectDescription}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, effectDescription: e.target.value })}
                              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent"
                              rows={3}
                              placeholder="e.g., Changes the product price, Requires customer to upload a file, Creates different product versions, Just displays information"
                              required
                            />
                            <p className="mt-1 text-xs text-cream-600">Describe how this attribute affects the product or customer experience</p>
                          </div>
                        </div>
                      </div>

                      {/* Options Table - Show when DROPDOWN/RADIO or when Is Price Effect is checked */}
                      {((attributeTypeForm.inputStyle === "DROPDOWN" || attributeTypeForm.inputStyle === "RADIO") || attributeTypeForm.isPriceEffect) ? (
                        <div className="border-b border-cream-200 pb-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-cream-900">Options</h3>
                            <button
                              type="button"
                              onClick={() => {
                                setAttributeTypeForm({
                                  ...attributeTypeForm,
                                  attributeOptionsTable: [...attributeTypeForm.attributeOptionsTable, { name: "", priceImpactPer1000: "", image: undefined }],
                                });
                              }}
                              className="px-3 py-1 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                            >
                              <Plus size={16} />
                              Add Option
                            </button>
                          </div>
                          <div className="border border-cream-300 rounded-lg overflow-hidden bg-white">
                            {attributeTypeForm.attributeOptionsTable.length === 0 ? (
                              <p className="text-sm text-cream-600 text-center py-4">
                                No options added. Click "Add Option" to start.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="bg-cream-100">
                                      <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                        Option Name *
                                      </th>
                                      <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                        Price Impact (₹ per 1000 units)
                                      </th>
                                      <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                        Image (Optional)
                                      </th>
                                      <th className="border border-cream-300 px-3 py-2 text-center text-sm font-medium text-cream-900 w-20">
                                        Action
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(attributeTypeForm.attributeOptionsTable || []).map((option, index) => (
                                      <tr key={index}>
                                        <td className="border border-cream-300 px-3 py-2">
                                          <input
                                            type="text"
                                            value={option.name}
                                            onChange={(e) => {
                                              const updated = [...attributeTypeForm.attributeOptionsTable];
                                              updated[index].name = e.target.value;
                                              setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                            }}
                                            className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                            placeholder="e.g., Both Sides, Express Delivery"
                                            required
                                          />
                                        </td>
                                        <td className="border border-cream-300 px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-cream-700">₹</span>
                                            <input
                                              type="number"
                                              value={option.priceImpactPer1000}
                                              onChange={(e) => {
                                                const updated = [...attributeTypeForm.attributeOptionsTable];
                                                updated[index].priceImpactPer1000 = e.target.value;
                                                setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                              }}
                                              className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                              placeholder="0.00000"
                                              step="0.00001"
                                              min="0"
                                            />
                                            <span className="text-xs text-cream-600 whitespace-nowrap">per 1000</span>
                                          </div>
                                        </td>
                                        <td className="border border-cream-300 px-3 py-2">
                                          <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                // Validate file type
                                                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                                if (!validTypes.includes(file.type)) {
                                                  setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
                                                  return;
                                                }
                                                // Validate file size (5MB)
                                                if (file.size > 5 * 1024 * 1024) {
                                                  setError("Image size must be less than 5MB.");
                                                  return;
                                                }
                                                
                                                // Upload to Cloudinary
                                                try {
                                                  setLoading(true);
                                                  const formData = new FormData();
                                                  formData.append('file', file);
                                                  formData.append('upload_preset', 'print24_uploads');
                                                  
                                                  const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/dhqpbfljb/image/upload', {
                                                    method: 'POST',
                                                    body: formData,
                                                  });
                                                  
                                                  if (!uploadResponse.ok) {
                                                    throw new Error('Failed to upload image');
                                                  }
                                                  
                                                  const uploadData = await uploadResponse.json();
                                                  const imageUrl = uploadData.secure_url;
                                                  
                                                  const updated = [...attributeTypeForm.attributeOptionsTable];
                                                  updated[index].image = imageUrl;
                                                  setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                  setError(null);
                                                } catch (err) {
                                                  console.error("Error uploading image:", err);
                                                  setError("Failed to upload image. Please try again.");
                                                } finally {
                                                  setLoading(false);
                                                }
                                              }
                                            }}
                                            className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm text-sm"
                                          />
                                          {option.image && (
                                            <div className="mt-2">
                                              <img src={option.image} alt={option.name} className="w-16 h-16 object-cover rounded border border-cream-200" />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const updated = [...attributeTypeForm.attributeOptionsTable];
                                                  updated[index].image = undefined;
                                                  setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                }}
                                                className="mt-1 text-xs text-red-600 hover:text-red-800"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                        <td className="border border-cream-300 px-3 py-2 text-center">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = attributeTypeForm.attributeOptionsTable.filter((_, i) => i !== index);
                                              setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                            }}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-cream-600">
                            Add all options customers can choose from. If "Is Price Effect" is checked, enter the price impact per 1000 units for each option.
                          </p>
                        </div>
                      ) : null}

                      {/* Step 2: Checkboxes */}
                      <div className="border-b border-cream-200 pb-4">
                        <h3 className="text-lg font-semibold text-cream-900 mb-4">Additional Settings</h3>
                        <div className="space-y-4">
                          {/* Is Price Effect Checkbox */}
                          <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                            <input
                              type="checkbox"
                              checked={attributeTypeForm.isPriceEffect}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isPriceEffect: e.target.checked })}
                              className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                            />
                            <div className="flex-1">
                              <label className="text-sm font-medium text-cream-900 cursor-pointer">
                                Is Price Effect?
                              </label>
                              <p className="text-xs text-cream-600 mt-1">
                                Check this if selecting this attribute changes the product price
                              </p>
                              {attributeTypeForm.isPriceEffect && (
                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-cream-900 mb-2">
                                    Price Effect Amount (₹ per 1000 units) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg text-cream-700">₹</span>
                                    <input
                                      type="number"
                                      value={attributeTypeForm.priceEffectAmount}
                                      onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, priceEffectAmount: e.target.value })}
                                      className="flex-1 px-3 py-2 border border-cream-300 rounded-lg"
                                      placeholder="e.g., 20 (means +₹20 per 1000 units)"
                                      step="0.00001"
                                      min="0"
                                      required={attributeTypeForm.isPriceEffect}
                                    />
                                    <span className="text-sm text-cream-600">per 1000 units</span>
                                  </div>
                                  <p className="mt-2 text-xs text-cream-600">
                                    Enter how much the price changes per 1000 units. Example: "20" means +₹20 for every 1000 units.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Is Fixed Quantity Checkbox */}
                          <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                            <input
                              type="checkbox"
                              checked={attributeTypeForm.isFixedQuantity}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isFixedQuantity: e.target.checked })}
                              className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                            />
                            <div className="flex-1">
                              <label className="text-sm font-medium text-cream-900 cursor-pointer">
                                Is Fixed Quantity?
                              </label>
                              <p className="text-xs text-cream-600 mt-1">
                                Check this if this attribute restricts quantity to specific values (e.g., 1000, 2000, 3000 only)
                              </p>
                              {attributeTypeForm.isFixedQuantity && (
                                <div className="mt-3 grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-cream-900 mb-2">
                                      Minimum Quantity *
                                    </label>
                                    <input
                                      type="number"
                                      value={attributeTypeForm.fixedQuantityMin}
                                      onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, fixedQuantityMin: e.target.value })}
                                      className="w-full px-3 py-2 border border-cream-300 rounded-lg"
                                      placeholder="e.g., 1000"
                                      step="100"
                                      min="0"
                                      required={attributeTypeForm.isFixedQuantity}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-cream-900 mb-2">
                                      Maximum Quantity *
                                    </label>
                                    <input
                                      type="number"
                                      value={attributeTypeForm.fixedQuantityMax}
                                      onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, fixedQuantityMax: e.target.value })}
                                      className="w-full px-3 py-2 border border-cream-300 rounded-lg"
                                      placeholder="e.g., 72000"
                                      step="100"
                                      min="0"
                                      required={attributeTypeForm.isFixedQuantity}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-xs text-cream-600">
                                      Customers will only be able to select quantities between {attributeTypeForm.fixedQuantityMin || "min"} and {attributeTypeForm.fixedQuantityMax || "max"}.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {attributeTypeForm.primaryEffectType === "FILE" && (
                        <div className="border-b border-cream-200 pb-4">
                          <h3 className="text-lg font-semibold text-cream-900 mb-4">File Requirements</h3>
                          <div>
                            <label className="block text-sm font-medium text-cream-900 mb-2">
                              File Requirements Description
                            </label>
                            <textarea
                              value={attributeTypeForm.fileRequirements}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, fileRequirements: e.target.value })}
                              className="w-full px-3 py-2 border border-cream-300 rounded-lg"
                              rows={3}
                              placeholder="e.g., Upload your design file (JPG, PNG, PDF). Minimum 300 DPI recommended."
                            />
                            <p className="mt-2 text-xs text-cream-600">
                              Describe what type of file customers need to upload and any requirements (format, size, resolution, etc.)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Settings */}
                      <div className="border-b border-cream-200 pb-4">
                        <h3 className="text-lg font-semibold text-cream-900 mb-4">Settings</h3>
                        <div className="space-y-4">
                          {/* Allow Filtering */}
                          <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                            <input
                              type="checkbox"
                              checked={attributeTypeForm.isFilterable}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isFilterable: e.target.checked })}
                              className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                            />
                            <div className="flex-1">
                              <label className="text-sm font-medium text-cream-900 cursor-pointer">
                                Allow Filtering
                              </label>
                              <p className="text-xs text-cream-600 mt-1">
                                Check this if customers can filter products by this attribute (e.g., filter by color, size, etc.)
                              </p>
                            </div>
                          </div>

                          {/* Required Selection */}
                          <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                            <input
                              type="checkbox"
                              checked={attributeTypeForm.isRequired}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isRequired: e.target.checked })}
                              className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                            />
                            <div className="flex-1">
                              <label className="text-sm font-medium text-cream-900 cursor-pointer">
                                Required Selection
                              </label>
                              <p className="text-xs text-cream-600 mt-1">
                                Check this if customers must select an option before they can place an order
                              </p>
                            </div>
                          </div>

                          {/* Available for All Products */}
                          <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                            <input
                              type="checkbox"
                              checked={attributeTypeForm.isCommonAttribute}
                              onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isCommonAttribute: e.target.checked })}
                              className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                            />
                            <div className="flex-1">
                              <label className="text-sm font-medium text-cream-900 cursor-pointer">
                                Available for All Products
                              </label>
                              <p className="text-xs text-cream-600 mt-1">
                                Check this if this attribute can be used with any product. Uncheck to restrict to specific categories/subcategories.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? "Creating..." : "Create Attribute"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateAttributeModal(false);
                            setEditingAttributeTypeId(null);
                            setAttributeTypeForm({
                              attributeName: "",
                              inputStyle: "DROPDOWN",
                              effectDescription: "",
                              simpleOptions: "",
                              isPriceEffect: false,
                              isFixedQuantity: false,
                              priceEffectAmount: "",
                              fixedQuantityMin: "",
                              fixedQuantityMax: "",
                              primaryEffectType: "INFORMATIONAL",
                              priceImpactPer1000: "",
                              fileRequirements: "",
                              attributeOptionsTable: [],
                              functionType: "GENERAL",
                              isPricingAttribute: false,
                              isFixedQuantityNeeded: false,
                              isFilterable: false,
                              attributeValues: [],
                              defaultValue: "",
                              isRequired: false,
                              displayOrder: 0,
                              isCommonAttribute: true,
                              applicableCategories: [],
                              applicableSubCategories: [],
                            });
                          }}
                          className="flex-1 px-6 py-2 border border-cream-300 text-cream-700 rounded-lg hover:bg-cream-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    {editingProductId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    {editingProductId ? "Update Product" : "Create Product"}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Category Level - Always visible when adding (not editing) */}
          {activeTab === "categories" && !editingCategoryId && !editingSubCategoryId && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-cream-900 mb-2">
                Category Level *
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 cursor-pointer hover:border-cream-400 transition-all hover:shadow-sm" style={{ borderColor: !categoryForm.parent ? '#d97706' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="categoryLevel"
                    checked={!categoryForm.parent}
                    onChange={() => {
                      setCategoryForm({ ...categoryForm, parent: "", sortOrder: 0 });
                      // Reset subcategory form when switching back to main category
                      setSubCategoryForm({
                        name: "",
                        description: "",
                        category: "",
                        type: "",
                        slug: "",
                        sortOrder: 0,
                        image: null,
                      });
                      setError(null);
                    }}
                    className="w-4 h-4 text-cream-600 focus:ring-cream-500"
                    value="toplevel"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-cream-900">Main Category</p>
                    <p className="text-xs text-cream-600 mt-0.5">Create a top-level category</p>
                  </div>
                  {!categoryForm.parent && (
                    <CheckCircle className="text-cream-600" size={20} />
                  )}
                </label>
                <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 cursor-pointer hover:border-cream-400 transition-all hover:shadow-sm" style={{ borderColor: categoryForm.parent ? '#d97706' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="categoryLevel"
                    checked={!!categoryForm.parent}
                    onChange={() => {
                      // When subcategory is selected, initialize subcategory form to trigger subcategory form display
                      setSubCategoryForm({
                        name: "",
                        description: "",
                        category: "pending", // Set to "pending" to trigger subcategory form display
                        type: categoryForm.type || "",
                        slug: "",
                        sortOrder: 0,
                        image: null,
                      });
                      setCategoryForm({ ...categoryForm, parent: "pending" });
                      setError(null);
                    }}
                    className="w-4 h-4 text-cream-600 focus:ring-cream-500"
                    value="subcategory"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-cream-900">Subcategory</p>
                    <p className="text-xs text-cream-600 mt-0.5">Create under an existing category</p>
                  </div>
                  {categoryForm.parent && (
                    <CheckCircle className="text-cream-600" size={20} />
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Add/Edit Category */}
          {activeTab === "categories" && !editingSubCategoryId && !subCategoryForm.category && (
            <form onSubmit={handleCategorySubmit} className="space-y-6">
              {editingCategoryId && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-blue-800 font-medium">
                    Editing Category: {categoryForm.name || "Loading..."}
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}

              {/* Show main category form only when Main Category is selected */}
              {!categoryForm.parent && (
                <>
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Category Name *
                </label>
                <input
                  id="category-name"
                  name="name"
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Auto-generate slug if it hasn't been manually edited
                    let newSlug = categoryForm.slug;
                    if (!isSlugManuallyEdited) {
                      // Auto-generate slug from the new name
                      newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    }
                    setCategoryForm({ ...categoryForm, name: newName, slug: newSlug });
                    setError(null); // Clear error when user starts typing
                    if (categoryFormErrors.name) {
                      setCategoryFormErrors({ ...categoryFormErrors, name: undefined });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                    categoryFormErrors.name ? 'border-red-300 bg-red-50' : 'border-cream-300'
                  }`}
                  placeholder="Enter category name"
                />
                {((error && !categoryForm.name.trim()) || (!categoryForm.name.trim() && categoryForm.name !== "")) && (
                  <p className="mt-1 text-xs text-red-600">Category name is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Slug (URL-friendly identifier)
                </label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    setCategoryForm({ ...categoryForm, slug: e.target.value });
                  }}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  placeholder="e.g., visiting-cards (auto-generated from name)"
                />
                <p className="mt-1 text-xs text-cream-600">
                  Auto-generated from category name. You can customize it if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Type *
                </label>
                <ReviewFilterDropdown
                  id="category-type"
                  label="Select Type"
                  value={categoryForm.type}
                  onChange={(value) => {
                    const newType = value as string;
                    setCategoryForm({ 
                      ...categoryForm, 
                      type: newType,
                      // Reset parent when type changes to ensure parent matches type
                      parent: ""
                    });
                    setError(null); // Clear error when user selects type
                    if (categoryFormErrors.type) {
                      setCategoryFormErrors({ ...categoryFormErrors, type: undefined });
                    }
                    // Refresh available parent categories filtered by type
                    // Use setTimeout to ensure state is updated before fetching
                    setTimeout(() => {
                      if (editingCategoryId) {
                        fetchAvailableParentCategories(editingCategoryId);
                      } else {
                        fetchAvailableParentCategories();
                      }
                    }, 0);
                  }}
                  options={[
                    { value: "Digital", label: "Digital" },
                    { value: "Bulk", label: "Bulk" },
                  ]}
                  className="w-full"
                />
                {categoryFormErrors.type && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {categoryFormErrors.type}
                  </p>
                )}
                {error && !categoryForm.type && (
                  <p className="mt-1 text-xs text-red-600">Category type is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Category Image * 
                  {editingCategoryId && <span className="text-xs text-cream-500 font-normal ml-2">(Leave empty to keep current)</span>}
                  {!editingCategoryId && <span className="text-xs text-red-600 font-normal ml-2">(Required - JPG, PNG, WebP, max 5MB)</span>}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  required={!editingCategoryId}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      // Validate file type
                      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                      if (!allowedTypes.includes(file.type)) {
                        setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
                        e.target.value = '';
                        setCategoryForm({ ...categoryForm, image: null });
                        return;
                      }
                      // Validate file size (max 5MB)
                      const maxSize = 5 * 1024 * 1024;
                      if (file.size > maxSize) {
                        setError("Image size must be less than 5MB. Please compress the image and try again.");
                        e.target.value = '';
                        setCategoryForm({ ...categoryForm, image: null });
                        return;
                      }
                      setError(null);
                    } else if (!editingCategoryId) {
                      setError("Category image is required. Please upload an image.");
                    }
                    setCategoryForm({
                      ...categoryForm,
                      image: file,
                    });
                  }}
                  onBlur={() => {
                    if (!editingCategoryId && !categoryForm.image) {
                      setError("Category image is required. Please upload an image.");
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                    error && !editingCategoryId && !categoryForm.image ? 'border-red-300 bg-red-50' : 'border-cream-300'
                  }`}
                />
                {editingCategoryId && editingCategoryImage && !categoryForm.image && (
                  <div className="mt-3">
                    <p className="text-sm text-cream-700 mb-2">Current Image:</p>
                    <img
                      src={editingCategoryImage}
                      alt="Current category"
                      className="w-32 h-32 object-cover rounded-lg border border-cream-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/Glossy.png";
                      }}
                    />
                  </div>
                )}
                {categoryForm.image && (
                  <div className="mt-3">
                    <p className="text-sm text-green-700 mb-2 font-medium flex items-center gap-1">
                      <CheckCircle size={14} />
                      New Image Preview:
                    </p>
                    <img
                      src={URL.createObjectURL(categoryForm.image)}
                      alt="New category preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-green-400"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/Glossy.png";
                      }}
                    />
                    <p className="mt-2 text-xs text-green-600">
                      {categoryForm.image.name} ({(categoryForm.image.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
                {error && !editingCategoryId && !categoryForm.image && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Category image is required
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    {editingCategoryId ? "Update Category" : "Create Category"}
                  </>
                )}
              </button>
                </>
              )}
            </form>
          )}

          {/* Subcategory Form - Show when editing subcategory or when subcategory is selected in Category Level */}
          {activeTab === "categories" && (editingSubCategoryId || (subCategoryForm.category && subCategoryForm.category !== "")) && (
            <form onSubmit={handleSubCategorySubmit} className="space-y-6 mt-8 border-t border-cream-200 pt-8">
              {editingSubCategoryId && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-blue-800 font-medium">
                    Editing Subcategory: {subCategoryForm.name || "Loading..."}
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
              {!editingSubCategoryId && subCategoryForm.category && subCategoryForm.category !== "pending" && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-green-800 font-medium">
                    Adding Subcategory to: {categories.find(c => c._id === subCategoryForm.category)?.name || "Category"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubCategoryForm({
                        name: "",
                        description: "",
                        category: "",
                        type: "",
                        slug: "",
                        sortOrder: 0,
                        image: null,
                      });
                      setIsSubCategorySlugManuallyEdited(false);
                      setCategoryForm({ ...categoryForm, parent: "" });
                      setError(null);
                    }}
                    className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Subcategory Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="subcategory-name"
                  name="name"
                  type="text"
                  required
                  value={subCategoryForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Auto-generate slug if it hasn't been manually edited
                    let newSlug = subCategoryForm.slug;
                    if (!isSubCategorySlugManuallyEdited) {
                      // Auto-generate slug from the new name
                      newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    }
                    setSubCategoryForm({ ...subCategoryForm, name: newName, slug: newSlug });
                    setError(null);
                    if (subCategoryFormErrors.name) {
                      setSubCategoryFormErrors({ ...subCategoryFormErrors, name: undefined });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                    subCategoryFormErrors.name ? 'border-red-300 bg-red-50' : 'border-cream-300'
                  }`}
                  placeholder="Enter subcategory name"
                />
                {subCategoryFormErrors.name && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {subCategoryFormErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Description
                </label>
                <textarea
                  value={subCategoryForm.description}
                  onChange={(e) =>
                    setSubCategoryForm({
                      ...subCategoryForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <ReviewFilterDropdown
                  label="Select Type"
                  value={subCategoryForm.type || ""}
                  onChange={(value) => {
                    const newType = value as string;
                    setSubCategoryForm({ 
                      ...subCategoryForm, 
                      type: newType,
                      // Reset category when type changes to ensure category matches type
                      // But keep "pending" if we're in add subcategory mode
                      category: subCategoryForm.category === "pending" ? "pending" : ""
                    });
                    setError(null);
                  }}
                  options={[
                    { value: "", label: "Select Type" },
                    { value: "Digital", label: "Digital" },
                    { value: "Bulk", label: "Bulk" },
                  ]}
                  className="w-full"
                />
                {error && !subCategoryForm.type && (
                  <p className="mt-1 text-xs text-red-600">Type is required to select parent category</p>
                )}
              </div>

              {subCategoryForm.type && (
                <div>
                  <label className="block text-sm font-medium text-cream-900 mb-2">
                    Parent Category <span className="text-red-500">*</span>
                  </label>
                  <ReviewFilterDropdown
                    id="subcategory-category"
                    label="Select Category"
                    value={subCategoryForm.category === "pending" ? "" : (subCategoryForm.category || "")}
                    onChange={(value) => {
                      setSubCategoryForm({
                        ...subCategoryForm,
                        category: (value || "") as string,
                      });
                      setError(null);
                      if (subCategoryFormErrors.category) {
                        setSubCategoryFormErrors({ ...subCategoryFormErrors, category: undefined });
                      }
                    }}
                    options={[
                      { value: "", label: "Select Category" },
                      ...categories
                        .filter(cat => cat.type === subCategoryForm.type)
                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                        .map((cat) => {
                          const categoryType = cat.type === "Digital" ? "Digital Print" : "Bulk Print";
                          return {
                            value: cat._id,
                            label: `${cat.name} (${categoryType})`,
                          };
                        }),
                    ]}
                    className="w-full"
                  />
                  {subCategoryFormErrors.category && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {subCategoryFormErrors.category}
                    </p>
                  )}
                  {error && (!subCategoryForm.category || subCategoryForm.category === "pending") && subCategoryForm.type && (
                    <p className="mt-1 text-xs text-red-600">Parent category is required</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Slug (URL-friendly identifier)
                </label>
                <input
                  type="text"
                  value={subCategoryForm.slug}
                  onChange={(e) => {
                    setIsSubCategorySlugManuallyEdited(true);
                    setSubCategoryForm({ ...subCategoryForm, slug: e.target.value });
                  }}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  placeholder="e.g., gloss-finish (auto-generated from name)"
                />
                <p className="mt-1 text-xs text-cream-600">
                  Auto-generated from subcategory name. You can customize it if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={subCategoryForm.sortOrder}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 0;
                    setSubCategoryForm({ ...subCategoryForm, sortOrder: value });
                  }}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-cream-600">Lower numbers appear first. Default: 0</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Subcategory Image {editingSubCategoryId && <span className="text-xs text-cream-500">(Leave empty to keep current image)</span>}
                </label>
                {editingSubCategoryId && editingSubCategoryImage && !subCategoryForm.image && (
                  <div className="mb-3">
                    <p className="text-sm text-cream-700 mb-2">Current Image:</p>
                    <img
                      src={getImageUrl(editingSubCategoryImage)}
                      alt="Current subcategory"
                      className="w-32 h-32 object-cover rounded-lg border border-cream-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/Glossy.png";
                      }}
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setSubCategoryForm({
                      ...subCategoryForm,
                      image: e.target.files?.[0] || null,
                    });
                    setError(null);
                  }}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                />
                {subCategoryForm.image && (
                  <div className="mt-3">
                    <p className="text-sm text-green-700 mb-2 font-medium flex items-center gap-1">
                      <CheckCircle size={14} />
                      New Image Preview:
                    </p>
                    <img
                      src={URL.createObjectURL(subCategoryForm.image)}
                      alt="New subcategory preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-green-400"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/Glossy.png";
                      }}
                    />
                    <p className="mt-2 text-xs text-green-600">
                      {subCategoryForm.image.name} ({(subCategoryForm.image.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    {editingSubCategoryId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {editingSubCategoryId ? <Edit size={20} /> : <Plus size={20} />}
                    {editingSubCategoryId ? "Update Subcategory" : "Create Subcategory"}
                  </>
                )}
              </button>
            </form>
          )}


          {/* Orders Management */}
          {activeTab === "orders" && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-cream-900">
                  Orders ({orders.length})
                </h2>
                <button
                  onClick={fetchOrders}
                  disabled={loadingOrders}
                  className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingOrders ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      Loading...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>

              {loadingOrders ? (
                <div className="text-center py-12">
                  <Loader className="animate-spin text-cream-600 mx-auto mb-4" size={48} />
                  <p className="text-cream-600">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-cream-200">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-50 text-cream-400" />
                  <p className="text-cream-600">No orders found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    // Skip orders with null product
                    if (!order.product) {
                      return (
                        <div
                          key={order._id}
                          className="bg-white rounded-lg border border-cream-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg border border-cream-200 flex items-center justify-center">
                              <Package size={24} className="text-gray-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-cream-900 text-lg">Product Not Found</h3>
                              <p className="text-sm text-cream-600 font-semibold">Order #{order.orderNumber}</p>
                              <p className="text-xs text-cream-500 mt-1">
                                {order.user?.name || "Unknown"} ({order.user?.email || "Unknown"})
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={order._id}
                        className="bg-white rounded-lg border border-cream-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-cream-100">
                          <div className="flex items-center gap-4">
                            <img
                              src={order.product?.image || PLACEHOLDER_IMAGE}
                              alt={order.product?.name || "Product"}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-cream-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = PLACEHOLDER_IMAGE;
                              }}
                            />
                            <div>
                              <h3 className="font-bold text-cream-900 text-lg">{order.product?.name || "Unknown Product"}</h3>
                              <p className="text-sm text-cream-600 font-semibold">Order #{order.orderNumber}</p>
                              <p className="text-xs text-cream-500 mt-1">
                                {order.user?.name || "Unknown"} ({order.user?.email || "Unknown"})
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 ${
                            order.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                            order.status === "processing" ? "bg-blue-100 text-blue-800 border-blue-200" :
                            order.status === "approved" ? "bg-purple-100 text-purple-800 border-purple-200" :
                            order.status === "production_ready" ? "bg-orange-100 text-orange-800 border-orange-200" :
                            order.status === "request" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                            order.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                            "bg-gray-100 text-gray-800 border-gray-200"
                          }`}>
                            <span className="text-sm font-semibold capitalize">{order.status}</span>
                          </div>
                          {order.currentDepartment && typeof order.currentDepartment === "object" && (
                            <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 flex items-center gap-2">
                              <Building2 size={14} />
                              <span className="text-xs font-medium">
                                Current: {order.currentDepartment.name}
                                {order.currentDepartmentIndex !== null && order.currentDepartmentIndex !== undefined && (
                                  <span className="ml-1 text-indigo-500">(#{order.currentDepartmentIndex + 1})</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                        <div className="bg-cream-50 rounded-lg p-3">
                          <p className="text-xs text-cream-600 mb-1">Quantity</p>
                          <p className="font-bold text-cream-900">{order.quantity} units</p>
                        </div>
                        <div className="bg-cream-50 rounded-lg p-3">
                          <p className="text-xs text-cream-600 mb-1">Finish</p>
                          <p className="font-bold text-cream-900">{order.finish}</p>
                        </div>
                        <div className="bg-cream-50 rounded-lg p-3">
                          <p className="text-xs text-cream-600 mb-1">Shape</p>
                          <p className="font-bold text-cream-900">{order.shape}</p>
                        </div>
                        <div className="bg-cream-50 rounded-lg p-3">
                          <p className="text-xs text-cream-600 mb-1">Total Price</p>
                          <p className="font-bold text-cream-900">₹{order.totalPrice.toFixed(2)}</p>
                        </div>
                        <div className="bg-cream-50 rounded-lg p-3">
                          <p className="text-xs text-cream-600 mb-1">Mobile</p>
                          <p className="font-bold text-cream-900 text-xs">{order.mobileNumber || "N/A"}</p>
                        </div>
                      </div>

                      {order.selectedOptions && order.selectedOptions.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-cream-600 mb-2">Selected Options</p>
                          <div className="flex flex-wrap gap-2">
                            {order.selectedOptions.map((option, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-cream-100 text-cream-800 rounded text-xs"
                              >
                                {typeof option === "string" ? option : option.optionName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uploaded Front Image Display */}
                      {order.uploadedDesign?.frontImage && (
                        <div className="mb-4 p-3 bg-cream-50 rounded-lg border border-cream-200">
                          <p className="text-xs font-medium text-cream-700 mb-2 flex items-center gap-2">
                            <ImageIcon size={14} />
                            Uploaded Front Design
                          </p>
                          <img
                            src={order.uploadedDesign.frontImage.data || PLACEHOLDER_IMAGE}
                            alt="Front design"
                            className="w-full max-h-48 object-contain rounded border border-cream-300 bg-white"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const errorDiv = document.createElement("div");
                              errorDiv.className = "w-full h-48 flex items-center justify-center bg-red-50 text-red-600 rounded border border-red-200 text-sm";
                              errorDiv.textContent = "Failed to load image";
                              target.parentElement?.appendChild(errorDiv);
                            }}
                          />
                        </div>
                      )}

                      {/* Customer Notes - Small Display */}
                      {order.notes && (
                        <div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-semibold text-blue-700 mb-1">Customer Notes:</p>
                          <p className="text-xs text-blue-900 line-clamp-2">{order.notes}</p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setOrderStatusUpdate({
                              status: order.status,
                              deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
                              adminNotes: order.adminNotes || "",
                            });
                            setShowOrderModal(true);
                          }}
                          className="flex-1 px-4 py-2.5 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                        >
                          <Eye size={16} />
                          {order.status !== "cancelled" ? "View & Manage" : "View Details"}
                        </button>
                        {order.status === "request" && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(order._id, "production_ready")}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Check size={16} />
                              Production Ready
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order._id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </>
                        )}
                        {order.status === "production_ready" && (
                          <>
                            <div className="flex flex-col gap-2">
                              <input
                                type="date"
                                value={order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  if (newDate) {
                                    handleUpdateOrderStatus(order._id, undefined, undefined, newDate);
                                  }
                                }}
                                className="px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 text-sm"
                                placeholder="Delivery Date"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateOrderStatus(order._id, undefined, "start_production")}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Play size={16} />
                                  Start
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to cancel this order?")) {
                                      handleUpdateOrderStatus(order._id, "cancelled");
                                    }
                                  }}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <XCircle size={16} />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-cream-500 pt-2 border-t border-cream-100">
                        Ordered: {!isClient 
                          ? 'Loading...' 
                          : new Date(order.createdAt).toLocaleString()
                        }
                        {order.deliveryDate && (
                          <span className="ml-4">
                            Delivery: {!isClient 
                              ? 'Loading...' 
                              : new Date(order.deliveryDate).toLocaleDateString()
                            }
                          </span>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Uploaded Images */}
          {activeTab === "uploads" && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-cream-900">
                  Uploaded Images ({uploads.length})
                </h2>
                <button
                  onClick={fetchUploads}
                  disabled={loadingUploads}
                  className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingUploads ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      Loading...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>

              {loadingUploads ? (
                <div className="text-center py-12">
                  <Loader className="animate-spin text-cream-600 mx-auto mb-4" size={48} />
                  <p className="text-cream-600">Loading uploaded images...</p>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-12 text-cream-600">
                  <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No uploaded images yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {uploads.map((upload) => (
                    <div
                      key={upload._id}
                      className="border border-cream-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative bg-white"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedUpload(upload);
                          setShowUploadModal(true);
                        }}
                      >
                      {upload.frontImage ? (
                        <div className="aspect-video bg-cream-100 relative group">
                          {imageLoading[`front-${upload._id}`] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-cream-100 z-10">
                              <Loader className="animate-spin text-cream-600" size={24} />
                            </div>
                          )}
                          <img
                            src={getImageUrl(upload.frontImage.data, upload.frontImage.contentType) || PLACEHOLDER_IMAGE}
                            alt={upload.frontImage.filename}
                            className={`w-full h-full object-cover ${imageLoading[`front-${upload._id}`] ? "opacity-0" : "opacity-100"} transition-opacity`}
                            onLoad={() => setImageLoading(prev => ({ ...prev, [`front-${upload._id}`]: false }))}
                            onError={(e) => {
                              setImageLoading(prev => ({ ...prev, [`front-${upload._id}`]: false }));
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const errorDiv = document.createElement("div");
                              errorDiv.className = "absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-xs p-2";
                              errorDiv.textContent = "Failed to load image";
                              target.parentElement?.appendChild(errorDiv);
                            }}
                            onLoadStart={() => setImageLoading(prev => ({ ...prev, [`front-${upload._id}`]: true }))}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadImage(
                                upload.frontImage!.data,
                                upload.frontImage!.filename || "image.jpg"
                              );
                            }}
                            className="absolute top-2 left-2 p-2 bg-cream-900/80 text-white rounded-lg hover:bg-cream-900 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 shadow-md z-20"
                            title="Download image"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-video bg-cream-100 flex items-center justify-center">
                          <p className="text-cream-400 text-sm">No image</p>
                        </div>
                      )}
                        <div className="p-3 sm:p-4">
                          <p className="font-semibold text-sm sm:text-base text-cream-900 truncate">
                            {upload.user.name}
                          </p>
                          <p className="text-xs sm:text-sm text-cream-600 truncate">
                            {upload.user.email}
                          </p>
                          <p className="text-xs text-cream-500 mt-2">
                            {upload.width} × {upload.height}px
                          </p>
                          <p className="text-xs text-cream-500">
                            {!isClient 
                              ? 'Loading...' 
                              : new Date(upload.createdAt).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUpload(upload._id);
                        }}
                        disabled={loading}
                        className="absolute top-2 right-2 p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1 shadow-md z-20"
                        title="Delete upload"
                      >
                        {loading ? (
                          <Loader className="animate-spin" size={14} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manage Products */}
          {activeTab === "manage-products" && (
            <div>
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-cream-900 mb-2">
                    Products ({filteredProducts.length})
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="flex-1 sm:max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" size={18} />
                        <input
                          type="text"
                          placeholder="Search products by name, description, or subcategory..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 text-sm"
                        />
                        {productSearchQuery && (
                          <button
                            onClick={() => setProductSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-cream-700"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Category Filter - Shows all categories (including subcategories) */}
                    <div className="flex-1 sm:max-w-xs">
                      <ReviewFilterDropdown
                        label="Filter by Category"
                        value={selectedSubCategoryFilter || ""}
                        onChange={(value) => handleSubCategoryFilterChange(value as string)}
                        options={[
                          { value: "", label: "All Products" },
                          ...categories.map((cat) => {
                            // Build display name with hierarchy indicator
                            const getCategoryPath = (category: Category, path: string[] = []): string[] => {
                              if (!category.parent) {
                                return [category.name, ...path];
                              }
                              const parent = categories.find(c => c._id === (typeof category.parent === 'object' ? category.parent._id : category.parent));
                              if (parent) {
                                return getCategoryPath(parent, [category.name, ...path]);
                              }
                              return [category.name, ...path];
                            };
                            
                            const path = getCategoryPath(cat);
                            const displayName = path.join(" > ");
                            
                            return {
                              value: cat._id,
                              label: `${displayName} (${cat.type})`,
                            };
                          }),
                        ]}
                        className="w-full"
                      />
                    </div>
                    {(selectedSubCategoryFilter || productSearchQuery) && (
                      <button
                        onClick={() => {
                          setSelectedSubCategoryFilter("");
                          setProductSearchQuery("");
                        }}
                        className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <X size={16} />
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedSubCategoryFilter("");
                    setProductSearchQuery("");
                    fetchProducts();
                  }}
                  className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  <Package size={16} />
                  Refresh
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-cream-600">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>
                    {selectedSubCategoryFilter
                      ? "No products found for this subcategory"
                      : "No products yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((product) => {
                    // Get category and subcategory information
                    let categoryName = "No Category";
                    let subcategoryName = "";
                    let categoryType = "";
                    
                    // Check if product has a subcategory
                    if (product.subcategory) {
                      const subcategoryId = typeof product.subcategory === "object" 
                        ? product.subcategory._id 
                        : product.subcategory;
                      
                      // Find subcategory in subCategories state
                      const productSubcategory = subCategories.find((sc: any) => sc._id === subcategoryId);
                      
                      if (productSubcategory) {
                        subcategoryName = productSubcategory.name || "";
                        
                        // Get parent category from subcategory
                        const parentCategoryId = typeof productSubcategory.category === "object"
                          ? productSubcategory.category._id
                          : productSubcategory.category;
                        
                        if (parentCategoryId) {
                          const parentCategory = categories.find((c: Category) => c._id === parentCategoryId);
                          if (parentCategory) {
                            categoryName = parentCategory.name || "No Category";
                            categoryType = parentCategory.type || "";
                          }
                        }
                      } else if (typeof product.subcategory === "object" && product.subcategory.name) {
                        // If subcategory is populated in the product object
                        subcategoryName = product.subcategory.name;
                        if (product.subcategory.category) {
                          const parentCategory = typeof product.subcategory.category === "object"
                            ? product.subcategory.category
                            : categories.find((c: Category) => c._id === product.subcategory.category);
                          if (parentCategory) {
                            categoryName = typeof parentCategory === "object" ? parentCategory.name : "No Category";
                            categoryType = typeof parentCategory === "object" ? parentCategory.type : "";
                          }
                        }
                      }
                    } else if (product.category) {
                      // Product has direct category (no subcategory)
                      const categoryId = typeof product.category === "object" 
                        ? product.category._id 
                        : product.category;
                      
                      const productCategory = categories.find((c: Category) => c._id === categoryId);
                      if (productCategory) {
                        categoryName = productCategory.name || "No Category";
                        categoryType = productCategory.type || "";
                      } else if (typeof product.category === "object" && product.category.name) {
                        // If category is populated in the product object
                        categoryName = product.category.name;
                        categoryType = product.category.type || "";
                      }
                    }
                    
                    // Build display text - show "Direct" if no subcategory
                    const categoryDisplay = subcategoryName 
                      ? `${categoryName} > ${subcategoryName}`
                      : `${categoryName} (Direct)`;
                    
                    return (
                      <div
                        key={product._id}
                        className="border border-cream-300 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {product.image && product.image.trim() !== "" && (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold text-cream-900">
                              {product.name}
                            </h3>
                            <p className="text-sm text-cream-600">
                              Category: {categoryDisplay}
                            </p>
                            {categoryType && (
                              <p className="text-xs text-cream-500">
                                Type: {categoryType}
                              </p>
                            )}
                            <p className="text-sm text-cream-500 font-medium">
                              ₹{product.basePrice}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditProduct(product._id)}
                            disabled={loading}
                            className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Edit size={18} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Trash2 size={18} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Manage Categories */}
          {activeTab === "manage-categories" && (
            <div>
              <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-xl font-bold text-cream-900">
                  Categories ({filteredCategories.length} of {categories.length})
                </h2>
                <button
                  onClick={fetchCategories}
                  className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors"
                >
                  Refresh
                </button>
              </div>

              {/* Search and Filter Section */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search categories by name, description, or type..."
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                    />
                    {categorySearchQuery && (
                      <button
                        onClick={() => setCategorySearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cream-500 hover:text-cream-700"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Type Filter */}
                  <div className="sm:w-48">
                    <ReviewFilterDropdown
                      label="Filter by Type"
                      value={categoryTypeFilter}
                      onChange={(value) => setCategoryTypeFilter(value as string)}
                      options={[
                        { value: "all", label: "All Types" },
                        { value: "Digital", label: "Digital" },
                        { value: "Bulk", label: "Bulk" },
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Top-Level Filter */}
                  <div className="sm:w-48">
                    <ReviewFilterDropdown
                      label="Filter by Level"
                      value={categoryTopLevelFilter}
                      onChange={(value) => setCategoryTopLevelFilter(value as string)}
                      options={[
                        { value: "all", label: categoryTypeFilter !== "all" ? `All ${categoryTypeFilter} Categories` : "All Categories" },
                        { value: "top-level", label: categoryTypeFilter !== "all" ? `Top-Level ${categoryTypeFilter}` : "Top-Level Only" },
                        { value: "subcategories", label: categoryTypeFilter !== "all" ? `${categoryTypeFilter} Subcategories` : "Subcategories Only" },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Active Filters Display */}
                {(categorySearchQuery || categoryTypeFilter !== "all" || categoryTopLevelFilter !== "all") && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-cream-600">Active filters:</span>
                    {categorySearchQuery && (
                      <span className="px-3 py-1 bg-cream-200 text-cream-900 rounded-full text-sm flex items-center gap-2">
                        Search: "{categorySearchQuery}"
                        <button
                          onClick={() => setCategorySearchQuery("")}
                          className="hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )}
                    {categoryTypeFilter !== "all" && (
                      <span className="px-3 py-1 bg-cream-200 text-cream-900 rounded-full text-sm flex items-center gap-2">
                        Type: {categoryTypeFilter}
                        <button
                          onClick={() => setCategoryTypeFilter("all")}
                          className="hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )}
                    {categoryTopLevelFilter !== "all" && (
                      <span className="px-3 py-1 bg-cream-200 text-cream-900 rounded-full text-sm flex items-center gap-2">
                        Level: {categoryTopLevelFilter === "top-level" ? "Top-Level" : "Subcategories"}
                        <button
                          onClick={() => setCategoryTopLevelFilter("all")}
                          className="hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setCategorySearchQuery("");
                        setCategoryTypeFilter("all");
                        setCategoryTopLevelFilter("all");
                      }}
                      className="text-sm text-cream-600 hover:text-cream-900 underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-12 text-cream-600">
                  <FolderPlus size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No categories yet</p>
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-12 text-cream-600">
                  <Search size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No categories match your search criteria</p>
                  <button
                    onClick={() => {
                      setCategorySearchQuery("");
                      setCategoryTypeFilter("all");
                      setCategoryTopLevelFilter("all");
                    }}
                    className="mt-4 text-cream-900 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div 
                  ref={categoryListRef}
                  className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scroll-smooth"
                  style={{ scrollBehavior: 'auto' }} // Use auto for programmatic scrolling
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedCategoryId) {
                      handleAutoScroll(e, categoryListRef.current);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (draggedCategoryId) {
                      handleAutoScroll(e, categoryListRef.current);
                    }
                  }}
                  onDragLeave={(e) => {
                    // Only stop if leaving the container entirely
                    const relatedTarget = e.relatedTarget as Node;
                    if (!categoryListRef.current?.contains(relatedTarget) && relatedTarget !== categoryListRef.current) {
                      stopAutoScroll();
                    }
                  }}
                >
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                      <Info size={16} />
                      💡 Drag and drop categories to reorder them. Changes will be saved after confirmation.
                    </p>
                  </div>
                  {filteredCategories.map((category, index) => {
                    const displayLevel = (category as any).displayLevel || 0;
                    const indentClass = displayLevel > 0 ? `ml-${displayLevel * 6}` : '';
                    // Check if this is a subcategory (has parent or isSubcategory flag)
                    const isSubcategory = (category as any).isSubcategory || (displayLevel > 0);
                    
                    // Get parent category name for display
                    let parentName = '';
                    if (isSubcategory) {
                      // For subcategories, get parent from category field or parent field
                      const parentId = (category as any).parent || 
                        ((category as any).category && typeof (category as any).category === 'object' 
                          ? (category as any).category._id 
                          : (category as any).category);
                      if (parentId) {
                        const parentCat = categories.find(c => c._id === parentId);
                        parentName = parentCat ? parentCat.name : 'Unknown';
                      }
                    }
                    
                    return (
                    <div key={category._id} className="space-y-3">
                      <div
                        draggable
                        onDragStart={(e) => {
                          setDraggedCategoryId(category._id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", category._id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation(); // Prevent event from bubbling to container
                          e.dataTransfer.dropEffect = "move";
                          const target = e.currentTarget;
                          if (draggedCategoryId !== category._id) {
                            target.style.opacity = "0.5";
                          }
                          // Trigger auto-scroll when dragging over items
                          if (draggedCategoryId) {
                            handleAutoScroll(e, categoryListRef.current);
                          }
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.opacity = "1";
                          const draggedId = e.dataTransfer.getData("text/plain");
                          if (draggedId && draggedId !== category._id) {
                            // Check if either item is a subcategory - if so, use subcategory reorder
                            const draggedItem = filteredCategories.find(c => c._id === draggedId);
                            const targetItem = category;
                            const isDraggedSubcategory = draggedItem && ((draggedItem as any).isSubcategory || (draggedItem as any).displayLevel > 0);
                            const isTargetSubcategory = (targetItem as any).isSubcategory || (targetItem as any).displayLevel > 0;
                            
                            if (isDraggedSubcategory || isTargetSubcategory) {
                              // Handle subcategory reorder in the main list
                              handleSubCategoryReorder(draggedId, category._id);
                              return;
                            }
                            
                            handleCategoryReorder(draggedId, category._id, index);
                          }
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = "1";
                          stopAutoScroll();
                          // Small delay to ensure drag end is processed
                          setTimeout(() => {
                            setDraggedCategoryId(null);
                          }, 100);
                        }}
                        className={`border border-cream-300 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-move ${
                          draggedCategoryId === category._id ? "opacity-50" : ""
                        } ${displayLevel > 0 ? 'bg-cream-50' : 'bg-white'}`}
                        style={{ marginLeft: `${displayLevel * 24}px` }}
                        onClick={(e) => {
                          // Only handle click if not dragging
                          if (!draggedCategoryId) {
                            handleCategoryClick(category._id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {displayLevel > 0 && (
                            <div className="flex items-center">
                              <ChevronRight size={16} className="text-cream-400" />
                            </div>
                          )}
                          <div className="cursor-move text-cream-400 hover:text-cream-600">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                            </svg>
                          </div>
                          <div className="flex items-center gap-4 flex-1">
                          {category.image && category.image.trim() !== "" && (
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-cream-900">
                                {category.name}
                              </h3>
                              {isSubcategory && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Subcategory
                                </span>
                              )}
                              {!isSubcategory && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  Top-level
                                </span>
                              )}
                              {selectedCategory === category._id && (
                                <span className="text-xs bg-cream-200 text-cream-900 px-2 py-1 rounded-full">
                                  {categorySubcategories.length} child categor{categorySubcategories.length === 1 ? 'y' : 'ies'}
                                </span>
                              )}
                            </div>
                            {isSubcategory && parentName && (
                              <p className="text-xs text-cream-500 mt-1">
                                Parent: {parentName}
                              </p>
                            )}
                            <p className="text-xs text-cream-500">
                              Type: {category.type} | Sort Order: {category.sortOrder || 0}
                            </p>
                            {category.slug && (
                              <p className="text-xs text-cream-500">
                                Slug: {category.slug}
                              </p>
                            )}
                            <p className="text-xs text-cream-600 mt-1">
                              Click to view products | Drag handle to reorder
                            </p>
                          </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewDescriptionModal({
                                isOpen: true,
                                type: 'category',
                                name: category.name,
                                description: category.description || 'No description available.',
                              });
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Eye size={18} />
                            View
                          </button>
                          {isSubcategory ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSubCategory(category._id);
                                }}
                                disabled={loading}
                                className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <Edit size={18} />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubCategory(category._id);
                                }}
                                disabled={loading}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <Trash2 size={18} />
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCategory(category._id);
                                }}
                                disabled={loading}
                                className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <Edit size={18} />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(category._id);
                                }}
                                disabled={loading}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <Trash2 size={18} />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      </div>
                    );
                  })}

                  {/* Display Products when category is selected - moved outside map */}
                  {selectedCategory && (() => {
                    const selectedCat = categories.find(c => c._id === selectedCategory);
                    if (!selectedCat) return null;
                    
                    return (
                      <div className="mt-6 space-y-3 border-t-2 border-cream-300 pt-6 bg-cream-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-cream-900">
                            Products in: {selectedCat.name}
                          </h3>
                          <button
                            onClick={() => setSelectedCategory(null)}
                            className="text-cream-600 hover:text-cream-900"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        
                        {/* Add Product and Subcategory Buttons */}
                        <div className="mb-4 flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedSubCategoryForView) {
                                handleAddProductToCategory(selectedCategory, selectedSubCategoryForView);
                              } else {
                                handleAddProductToCategory(selectedCategory);
                              }
                            }}
                            className="px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                          >
                            <Plus size={18} />
                            {selectedSubCategoryForView 
                              ? `Add Product to ${categorySubcategories.find(sc => sc._id === selectedSubCategoryForView)?.name || 'Subcategory'}`
                              : "Add Product to this Category"}
                          </button>
                          {!selectedSubCategoryForView && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddSubCategoryToCategory(selectedCategory || '');
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <Plus size={18} />
                              Add Subcategory to this Category
                            </button>
                          )}
                        </div>

                        {/* Show which category/subcategory products are from */}
                        {selectedSubCategoryForView && (
                          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-blue-800 font-medium">
                                  Showing products from: {categorySubcategories.find(sc => sc._id === selectedSubCategoryForView)?.name || 'Subcategory'}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSubCategoryForView(null);
                                    handleCategoryClick(selectedCategory || '');
                                  }}
                                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Show all products from category and subcategories
                                </button>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedCategory && selectedSubCategoryForView) {
                                    handleAddProductToCategory(selectedCategory, selectedSubCategoryForView);
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <Plus size={14} />
                                Add Product to this Subcategory
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Products List */}
                        {loadingCategoryProducts ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader className="animate-spin text-cream-600" size={24} />
                            <span className="ml-2 text-cream-600">Loading products...</span>
                          </div>
                        ) : categoryProducts.length === 0 ? (
                          <div className="text-center py-4 text-cream-600 text-sm bg-white rounded-lg">
                            {categorySubcategories.length > 0 ? (
                              <>
                                <p>No products found directly in this category</p>
                                <p className="text-xs text-cream-500 mt-1">
                                  {selectedSubCategoryForView 
                                    ? "No products found in this subcategory. Click 'Add Product to this Category' to create one."
                                    : "Click on a subcategory above to view its products, or click 'Add Product to this Category' to add products directly to this category."}
                                </p>
                              </>
                            ) : (
                              <>
                                <p>No products found in this category</p>
                                <p className="text-xs text-cream-500 mt-1">
                                  Click "Add Product to this Category" to create one
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {categoryProducts.map((product) => (
                              <div
                                key={product._id}
                                className="border border-cream-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  {product.image && product.image.trim() !== "" && (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-12 h-12 object-cover rounded-lg"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <h5 className="font-medium text-cream-900 text-sm">
                                      {product.name}
                                    </h5>
                                    <p className="text-xs text-cream-600 line-clamp-1">
                                      {product.description || "No description"}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-xs text-cream-700 font-medium">
                                        ₹{product.basePrice || 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditProduct(product._id);
                                  }}
                                  className="px-3 py-1.5 text-xs bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors flex items-center gap-1"
                                >
                                  <Edit size={14} />
                                  Edit
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Show child categories (subcategories) - clickable to view their products */}
                        {categorySubcategories.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-cream-200">
                            <p className="text-xs text-cream-500 mb-2 font-medium">
                              Subcategories ({categorySubcategories.length}) - Drag to reorder, click to view products:
                            </p>
                            <div className="space-y-2">
                              {categorySubcategories
                                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                                .map((subCat, index) => (
                                <div
                                  key={subCat._id}
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedSubCategoryId(subCat._id);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", subCat._id);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.dataTransfer.dropEffect = "move";
                                    const target = e.currentTarget;
                                    if (draggedSubCategoryId && draggedSubCategoryId !== subCat._id) {
                                      target.style.opacity = "0.5";
                                      target.style.borderColor = "#d97706"; // Highlight border
                                    }
                                  }}
                                  onDragEnter={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (draggedSubCategoryId && draggedSubCategoryId !== subCat._id) {
                                      e.currentTarget.style.borderColor = "#d97706";
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.style.opacity = "1";
                                    e.currentTarget.style.borderColor = "";
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.style.opacity = "1";
                                    e.currentTarget.style.borderColor = "";
                                    const draggedId = e.dataTransfer.getData("text/plain");
                                    if (draggedId && draggedId !== subCat._id) {
                                      handleSubCategoryReorder(draggedId, subCat._id);
                                    }
                                  }}
                                  onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = "1";
                                    setDraggedSubCategoryId(null);
                                  }}
                                  className={`text-sm pl-3 py-2 rounded-lg border transition-colors cursor-move ${
                                    selectedSubCategoryForView === subCat._id
                                      ? 'bg-cream-200 border-cream-400 text-cream-900 font-medium'
                                      : 'bg-white border-cream-200 text-cream-700 hover:bg-cream-100 hover:border-cream-300'
                                  } ${draggedSubCategoryId === subCat._id ? "opacity-50" : ""}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <div className="cursor-move text-cream-400 hover:text-cream-600">
                                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                        </svg>
                                      </div>
                                      <div 
                                        onClick={(e) => handleSubCategoryClick(subCat._id, e)}
                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                      >
                                        <ChevronRight
                                          size={14}
                                          className={`transition-transform ${
                                            selectedSubCategoryForView === subCat._id ? 'rotate-90' : ''
                                          }`}
                                        />
                                        <span>{subCat.name}</span>
                                        {subCat.sortOrder !== undefined && subCat.sortOrder !== null && (
                                          <span className="text-xs text-cream-500">
                                            (Order: {subCat.sortOrder})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {selectedSubCategoryForView === subCat._id && (
                                        <span className="text-xs text-cream-600 mr-2">
                                          {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewDescriptionModal({
                                            isOpen: true,
                                            type: 'subcategory',
                                            name: subCat.name,
                                            description: subCat.description || 'No description available.',
                                          });
                                        }}
                                        disabled={loading}
                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="View Description"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          try {
                                            await handleEditSubCategory(subCat._id);
                                          } catch (err) {
                                            console.error("Error editing subcategory:", err);
                                            setError("Failed to load subcategory for editing");
                                          }
                                        }}
                                        disabled={loading}
                                        className="px-2 py-1 bg-cream-200 text-cream-900 rounded hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="Edit Subcategory"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSubCategory(subCat._id);
                                        }}
                                        disabled={loading}
                                        className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="Delete Subcategory"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Attribute Types Management */}
          {activeTab === "attribute-types" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-cream-900 mb-4">
                  {editingAttributeTypeId ? "Edit Attribute Type" : "Create Attribute Type"}
                </h2>
                <form onSubmit={handleAttributeTypeSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-cream-200">
                  {/* Step 1: Basic Information */}
                  <div className="border-b border-cream-200 pb-4">
                    <h3 className="text-lg font-semibold text-cream-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-cream-900 mb-2">
                          Attribute Name * <span className="text-xs text-cream-500 font-normal">(What customers will see)</span>
                        </label>
                        <input
                          type="text"
                          value={attributeTypeForm.attributeName}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, attributeName: e.target.value })}
                          className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent"
                          placeholder="e.g., Printing Option, Paper Type"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-cream-900 mb-2">
                          How Customers Select This * <span className="text-xs text-cream-500 font-normal">(Input method)</span>
                        </label>
                        <select
                          value={attributeTypeForm.inputStyle}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, inputStyle: e.target.value })}
                          className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent"
                          required
                        >
                          <option value="DROPDOWN">Dropdown Menu</option>
                          <option value="RADIO">Radio Buttons</option>
                          <option value="CHECKBOX">Checkbox</option>
                          <option value="TEXT_FIELD">Text Field</option>
                          <option value="NUMBER">Number Input</option>
                          <option value="FILE_UPLOAD">File Upload</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-cream-900 mb-2">
                          What This Affects * <span className="text-xs text-cream-500 font-normal">(Description of impact on product)</span>
                        </label>
                        <textarea
                          value={attributeTypeForm.effectDescription}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, effectDescription: e.target.value })}
                          className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent"
                          rows={3}
                          placeholder="e.g., Changes the product price, Requires customer to upload a file, Creates different product versions, Just displays information"
                          required
                        />
                        <p className="mt-1 text-xs text-cream-600">Describe how this attribute affects the product or customer experience</p>
                      </div>
                    </div>
                  </div>

                  {/* Options Table - Show when DROPDOWN/RADIO or when Is Price Effect is checked */}
                  {((attributeTypeForm.inputStyle === "DROPDOWN" || attributeTypeForm.inputStyle === "RADIO") || attributeTypeForm.isPriceEffect) ? (
                    <div className="border-b border-cream-200 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-cream-900">Options</h3>
                        <button
                          type="button"
                          onClick={() => {
                            setAttributeTypeForm({
                              ...attributeTypeForm,
                              attributeOptionsTable: [...attributeTypeForm.attributeOptionsTable, { name: "", priceImpactPer1000: "", image: undefined }],
                            });
                          }}
                          className="px-3 py-1 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Add Option
                        </button>
                      </div>
                      <div className="border border-cream-300 rounded-lg overflow-hidden bg-white">
                        {attributeTypeForm.attributeOptionsTable.length === 0 ? (
                          <p className="text-sm text-cream-600 text-center py-4">
                            No options added. Click "Add Option" to start.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-cream-100">
                                  <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                    Option Name *
                                  </th>
                                  <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                    Price Impact (₹ per 1000 units)
                                  </th>
                                  <th className="border border-cream-300 px-3 py-2 text-left text-sm font-medium text-cream-900">
                                    Image (Optional)
                                  </th>
                                  <th className="border border-cream-300 px-3 py-2 text-center text-sm font-medium text-cream-900 w-20">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(attributeTypeForm.attributeOptionsTable || []).map((option, index) => (
                                  <tr key={index}>
                                    <td className="border border-cream-300 px-3 py-2">
                                      <input
                                        type="text"
                                        value={option.name}
                                        onChange={(e) => {
                                          const updated = [...attributeTypeForm.attributeOptionsTable];
                                          updated[index].name = e.target.value;
                                          setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                        }}
                                        className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                        placeholder="e.g., Both Sides, Express Delivery"
                                        required
                                      />
                                    </td>
                                    <td className="border border-cream-300 px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-cream-700">₹</span>
                                        <input
                                          type="number"
                                          value={option.priceImpactPer1000}
                                          onChange={(e) => {
                                            const updated = [...attributeTypeForm.attributeOptionsTable];
                                            updated[index].priceImpactPer1000 = e.target.value;
                                            setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                          }}
                                          className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm"
                                          placeholder="0.00000"
                                          step="0.00001"
                                          min="0"
                                        />
                                        <span className="text-xs text-cream-600 whitespace-nowrap">per 1000</span>
                                      </div>
                                    </td>
                                    <td className="border border-cream-300 px-3 py-2">
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            // Validate file type
                                            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                            if (!validTypes.includes(file.type)) {
                                              setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
                                              return;
                                            }
                                            // Validate file size (5MB)
                                            if (file.size > 5 * 1024 * 1024) {
                                              setError("Image size must be less than 5MB.");
                                              return;
                                            }
                                            
                                            // Upload to Cloudinary
                                            try {
                                              setLoading(true);
                                              const formData = new FormData();
                                              formData.append('file', file);
                                              formData.append('upload_preset', 'print24_uploads');
                                              
                                              const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/dhqpbfljb/image/upload', {
                                                method: 'POST',
                                                body: formData,
                                              });
                                              
                                              if (!uploadResponse.ok) {
                                                throw new Error('Failed to upload image');
                                              }
                                              
                                              const uploadData = await uploadResponse.json();
                                              const imageUrl = uploadData.secure_url;
                                              
                                              const updated = [...attributeTypeForm.attributeOptionsTable];
                                              updated[index].image = imageUrl;
                                              setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                              setError(null);
                                            } catch (err) {
                                              console.error("Error uploading image:", err);
                                              setError("Failed to upload image. Please try again.");
                                            } finally {
                                              setLoading(false);
                                            }
                                          }
                                        }}
                                        className="w-full px-2 py-2.5 border border-cream-200 rounded text-sm text-sm"
                                      />
                                      {option.image && (
                                        <div className="mt-2">
                                          <img src={option.image} alt={option.name} className="w-16 h-16 object-cover rounded border border-cream-200" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...attributeTypeForm.attributeOptionsTable];
                                              updated[index].image = undefined;
                                              setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                            }}
                                            className="mt-1 text-xs text-red-600 hover:text-red-800"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="border border-cream-300 px-3 py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = attributeTypeForm.attributeOptionsTable.filter((_, i) => i !== index);
                                          setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                        }}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-cream-600">
                        Add all options customers can choose from. If "Is Price Effect" is checked, enter the price impact per 1000 units for each option.
                      </p>
                    </div>
                  ) : null}

                  {/* Step 2: Checkboxes */}
                  <div className="border-b border-cream-200 pb-4">
                    <h3 className="text-lg font-semibold text-cream-900 mb-4">Additional Settings</h3>
                    <div className="space-y-4">
                      {/* Is Price Effect Checkbox */}
                      <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                        <input
                          type="checkbox"
                          checked={attributeTypeForm.isPriceEffect}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isPriceEffect: e.target.checked })}
                          className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                        />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-cream-900 cursor-pointer">
                            Is Price Effect?
                          </label>
                          <p className="text-xs text-cream-600 mt-1">
                            Check this if selecting this attribute changes the product price
                          </p>
                          {attributeTypeForm.isPriceEffect && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-cream-900 mb-2">
                                Price Effect Amount (₹ per 1000 units) *
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-lg text-cream-700">₹</span>
                                <input
                                  type="number"
                                  value={attributeTypeForm.priceEffectAmount}
                                  onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, priceEffectAmount: e.target.value })}
                                  className="flex-1 px-3 py-2 border border-cream-300 rounded-lg"
                                  placeholder="e.g., 20 (means +₹20 per 1000 units)"
                                  step="0.00001"
                                  min="0"
                                  required={attributeTypeForm.isPriceEffect}
                                />
                                <span className="text-sm text-cream-600">per 1000 units</span>
                              </div>
                              <p className="mt-2 text-xs text-cream-600">
                                Enter how much the price changes per 1000 units. Example: "20" means +₹20 for every 1000 units.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Is Fixed Quantity Checkbox */}
                      <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                        <input
                          type="checkbox"
                          checked={attributeTypeForm.isFixedQuantity}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isFixedQuantity: e.target.checked })}
                          className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                        />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-cream-900 cursor-pointer">
                            Is Fixed Quantity?
                          </label>
                          <p className="text-xs text-cream-600 mt-1">
                            Check this if this attribute restricts quantity to specific values (e.g., 1000, 2000, 3000 only)
                          </p>
                          {attributeTypeForm.isFixedQuantity && (
                            <div className="mt-3 grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-cream-900 mb-2">
                                  Minimum Quantity *
                                </label>
                                <input
                                  type="number"
                                  value={attributeTypeForm.fixedQuantityMin}
                                  onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, fixedQuantityMin: e.target.value })}
                                  className="w-full px-3 py-2 border border-cream-300 rounded-lg"
                                  placeholder="e.g., 1000"
                                  step="100"
                                  min="0"
                                  required={attributeTypeForm.isFixedQuantity}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-cream-900 mb-2">
                                  Maximum Quantity *
                                </label>
                                <input
                                  type="number"
                                  value={attributeTypeForm.fixedQuantityMax}
                                  onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, fixedQuantityMax: e.target.value })}
                                  className="w-full px-3 py-2 border border-cream-300 rounded-lg"
                                  placeholder="e.g., 72000"
                                  step="100"
                                  min="0"
                                  required={attributeTypeForm.isFixedQuantity}
                                />
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-cream-600">
                                  Customers will only be able to select quantities between {attributeTypeForm.fixedQuantityMin || "min"} and {attributeTypeForm.fixedQuantityMax || "max"}.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  {attributeTypeForm.primaryEffectType === "FILE" && (
                    <div className="border-b border-cream-200 pb-4">
                      <h3 className="text-lg font-semibold text-cream-900 mb-4">File Requirements</h3>
                      <div>
                        <label className="block text-sm font-medium text-cream-900 mb-2">
                          File Requirements Description
                        </label>
                        <textarea
                          value={attributeTypeForm.fileRequirements}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, fileRequirements: e.target.value })}
                          className="w-full px-3 py-2 border border-cream-300 rounded-lg"
                          rows={3}
                          placeholder="e.g., Upload your design file (JPG, PNG, PDF). Minimum 300 DPI recommended."
                        />
                        <p className="mt-2 text-xs text-cream-600">
                          Describe what type of file customers need to upload and any requirements (format, size, resolution, etc.)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Settings */}
                  <div className="border-b border-cream-200 pb-4">
                    <h3 className="text-lg font-semibold text-cream-900 mb-4">Settings</h3>
                    <div className="space-y-4">
                      {/* Allow Filtering */}
                      <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                        <input
                          type="checkbox"
                          checked={attributeTypeForm.isFilterable}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isFilterable: e.target.checked })}
                          className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                        />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-cream-900 cursor-pointer">
                            Allow Filtering
                          </label>
                          <p className="text-xs text-cream-600 mt-1">
                            Check this if customers can filter products by this attribute (e.g., filter by color, size, etc.)
                          </p>
                        </div>
                      </div>

                      {/* Required Selection */}
                      <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                        <input
                          type="checkbox"
                          checked={attributeTypeForm.isRequired}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isRequired: e.target.checked })}
                          className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                        />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-cream-900 cursor-pointer">
                            Required Selection
                          </label>
                          <p className="text-xs text-cream-600 mt-1">
                            Check this if customers must select an option before they can place an order
                          </p>
                        </div>
                      </div>

                      {/* Available for All Products */}
                      <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-lg border border-cream-200">
                        <input
                          type="checkbox"
                          checked={attributeTypeForm.isCommonAttribute}
                          onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isCommonAttribute: e.target.checked })}
                          className="w-5 h-5 text-cream-900 border-cream-300 rounded focus:ring-cream-900 mt-1"
                        />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-cream-900 cursor-pointer">
                            Available for All Products
                          </label>
                          <p className="text-xs text-cream-600 mt-1">
                            Check this if this attribute can be used with any product. Uncheck to restrict to specific categories/subcategories.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Saving..." : editingAttributeTypeId ? "Update Attribute Type" : "Create Attribute Type"}
                    </button>
                    {editingAttributeTypeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttributeTypeId(null);
      setAttributeTypeForm({
        attributeName: "",
        inputStyle: "DROPDOWN",
        effectDescription: "",
        simpleOptions: "",
        isPriceEffect: false,
        isFixedQuantity: false,
        priceEffectAmount: "",
        fixedQuantityMin: "",
        fixedQuantityMax: "",
        primaryEffectType: "INFORMATIONAL",
        priceImpactPer1000: "",
        fileRequirements: "",
        attributeOptions: [],
                            // Reset auto-set fields
                            functionType: "GENERAL",
                            isPricingAttribute: false,
                            isFixedQuantityNeeded: false,
                            isFilterable: false,
                            attributeValues: [],
                            defaultValue: "",
                            isRequired: false,
                            displayOrder: 0,
                            isCommonAttribute: true,
                            applicableCategories: [],
                            applicableSubCategories: [],
                          });
                        }}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-lg border border-cream-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-cream-900">All Attribute Types</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={attributeTypeSearch}
                        onChange={(e) => setAttributeTypeSearch(e.target.value)}
                        placeholder="Search attribute types..."
                        className="pl-10 pr-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 w-64"
                      />
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-500" />
                    </div>
                    <div className="text-sm text-cream-600">
                      {(() => {
                        const filtered = attributeTypes.filter((at) =>
                          !attributeTypeSearch ||
                          at.attributeName?.toLowerCase().includes(attributeTypeSearch.toLowerCase()) ||
                          at.inputStyle?.toLowerCase().includes(attributeTypeSearch.toLowerCase()) ||
                          at.primaryEffectType?.toLowerCase().includes(attributeTypeSearch.toLowerCase())
                        );
                        return `${filtered.length} of ${attributeTypes.length}`;
                      })()}
                    </div>
                  </div>
                </div>
                {loadingAttributeTypes ? (
                  <div className="text-center py-8">
                    <Loader className="animate-spin text-cream-900 mx-auto" size={32} />
                  </div>
                ) : attributeTypes.length === 0 ? (
                  <div className="text-center py-8 bg-cream-50 rounded-lg border border-cream-200">
                    <p className="text-cream-600">No attribute types found. Create one above.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-cream-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-cream-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Input Style</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Effect Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Pricing</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Common</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-cream-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-200">
                          {attributeTypes
                            .filter((at) =>
                              !attributeTypeSearch ||
                              at.attributeName?.toLowerCase().includes(attributeTypeSearch.toLowerCase()) ||
                              at.inputStyle?.toLowerCase().includes(attributeTypeSearch.toLowerCase()) ||
                              at.primaryEffectType?.toLowerCase().includes(attributeTypeSearch.toLowerCase())
                            )
                            .map((at) => (
                            <tr key={at._id} className="hover:bg-cream-50">
                              <td className="px-4 py-3 text-sm text-cream-900">{at.attributeName}</td>
                              <td className="px-4 py-3 text-sm text-cream-600">{at.inputStyle}</td>
                              <td className="px-4 py-3 text-sm text-cream-600">{at.primaryEffectType}</td>
                              <td className="px-4 py-3 text-sm text-cream-600">{at.isPricingAttribute ? "Yes" : "No"}</td>
                              <td className="px-4 py-3 text-sm text-cream-600">{at.isCommonAttribute ? "Yes" : "No"}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditAttributeType(at._id)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAttributeType(at._id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Department Management */}
          {activeTab === "departments" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-cream-900 mb-4">
                  {editingDepartmentId ? "Edit Department" : "Create Department"}
                </h2>
                <form onSubmit={handleDepartmentSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-cream-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-cream-900 mb-2">
                        Department Name *
                      </label>
                      <input
                        id="department-name"
                        name="name"
                        type="text"
                        required
                        value={departmentForm.name}
                        onChange={(e) => {
                          setDepartmentForm({ ...departmentForm, name: e.target.value });
                          if (departmentFormErrors.name) {
                            setDepartmentFormErrors({ ...departmentFormErrors, name: undefined });
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                          departmentFormErrors.name ? 'border-red-300 bg-red-50' : 'border-cream-300'
                        }`}
                        placeholder="e.g., Prepress, Digital Printing"
                      />
                      {departmentFormErrors.name && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {departmentFormErrors.name}
                        </p>
                      )}
                    </div>

                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={departmentForm.description}
                      onChange={(e) =>
                        setDepartmentForm({ ...departmentForm, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="Brief description of department responsibilities"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={departmentForm.isEnabled}
                        onChange={(e) =>
                          setDepartmentForm({ ...departmentForm, isEnabled: e.target.checked })
                        }
                        className="w-4 h-4 text-cream-900 border-cream-300 rounded focus:ring-cream-500"
                      />
                      <span className="text-sm font-medium text-cream-900">Enabled</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Assign Operators (Optional)
                    </label>
                    <p className="text-xs text-cream-600 mb-2">
                      Select employees who can perform actions for this department. Only employees can be assigned. Leave empty to allow all authenticated users.
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-cream-200 rounded-lg p-3">
                      {employees.length === 0 ? (
                        <p className="text-sm text-cream-600">No employees available. Create users and mark them as employees first.</p>
                      ) : (
                        employees.map((employee) => {
                          // Ensure proper ID comparison (handle both string and ObjectId formats)
                          const isAssigned = departmentForm.operators.some((opId: any) => 
                            String(opId) === String(employee._id)
                          );
                          
                          // Find all departments where this employee is assigned as operator
                          const assignedDepartments = departments
                            .filter((dept: any) => {
                              if (!dept.operators || dept.operators.length === 0) return false;
                              return dept.operators.some((op: any) => {
                                const opId = typeof op === 'object' ? (op._id || op.id || String(op)) : String(op);
                                return String(opId) === String(employee._id);
                              });
                            })
                            .map((dept: any) => dept.name);
                          
                          return (
                            <label key={employee._id} className="flex items-center gap-3 p-3 bg-cream-50 border border-cream-200 rounded-lg hover:bg-cream-100 transition-colors cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDepartmentForm({
                                      ...departmentForm,
                                      operators: [...departmentForm.operators, employee._id],
                                    });
                                  } else {
                                    setDepartmentForm({
                                      ...departmentForm,
                                      operators: departmentForm.operators.filter((id: any) => String(id) !== String(employee._id)),
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-cream-900 border-cream-300 rounded focus:ring-cream-500 focus:ring-2"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-cream-900">{employee.name}</p>
                                <p className="text-xs text-cream-600">
                                  {employee.email}
                                  {assignedDepartments.length > 0 && (
                                    <span className="ml-1 text-cream-500">
                                      ({assignedDepartments.join(", ")})
                                    </span>
                                  )}
                                </p>
                              </div>
                              {isAssigned && (
                                <Check className="text-cream-900" size={20} />
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        {editingDepartmentId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        {editingDepartmentId ? "Update Department" : "Create Department"}
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="border-t border-cream-300 pt-6">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-cream-900">
                    All Departments ({departments.length})
                  </h2>
                  <button
                    onClick={fetchDepartments}
                    className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {loadingDepartments ? (
                  <div className="text-center py-8">
                    <Loader className="animate-spin text-cream-900 mx-auto" size={32} />
                  </div>
                ) : departments.length === 0 ? (
                  <div className="text-center py-8 bg-cream-50 rounded-lg border border-cream-200">
                    <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-cream-600">No departments found. Create one above.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-cream-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-cream-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Description</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-cream-900">Operators</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-cream-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-200">
                          {departments
                            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                            .map((dept) => (
                            <tr key={dept._id} className="hover:bg-cream-50">
                              <td className="px-4 py-3 text-sm text-cream-900 font-semibold">{dept.name}</td>
                              <td className="px-4 py-3 text-sm text-cream-600">{dept.description || "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  dept.isEnabled
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {dept.isEnabled ? "Enabled" : "Disabled"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-cream-600">
                                {dept.operators && dept.operators.length > 0
                                  ? `${dept.operators.length} operator(s)`
                                  : "All users"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditDepartment(dept._id)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDepartment(dept._id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sequences Management */}
          {activeTab === "sequences" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-cream-900 mb-4">
                  {editingSequenceId ? "Edit Sequence" : "Create Sequence"}
                </h2>
                <p className="text-sm text-cream-600 mb-4">
                  Create production sequences for categories/subcategories. Select departments in order - first selected gets sequence 1, second gets 2, etc.
                </p>
                {editingSequenceId && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-blue-800 font-medium">
                      Editing Sequence: {sequenceForm.name || "Loading..."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSequenceId(null);
                        setSequenceForm({
                          name: "",
                          printType: "",
                          category: "",
                          subcategory: "",
                          selectedDepartments: [],
                        });
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
                <form onSubmit={handleSequenceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Sequence Name *
                    </label>
                    <input
                      id="sequence-name"
                      name="name"
                      type="text"
                      required
                      value={sequenceForm.name}
                      onChange={(e) => {
                        setSequenceForm({ ...sequenceForm, name: e.target.value });
                        if (sequenceFormErrors.name) {
                          setSequenceFormErrors({ ...sequenceFormErrors, name: undefined });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${
                        sequenceFormErrors.name ? 'border-red-300 bg-red-50' : 'border-cream-300'
                      }`}
                      placeholder="e.g., Standard Printing Sequence"
                    />
                    {sequenceFormErrors.name && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {sequenceFormErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Print Type *
                    </label>
                    <ReviewFilterDropdown
                      id="sequence-printType"
                      label="Select Print Type"
                      value={sequenceForm.printType}
                      onChange={(value) => {
                        setSequenceForm({
                          ...sequenceForm,
                          printType: value,
                          category: "", // Reset category when print type changes
                          subcategory: "", // Reset subcategory when print type changes
                        });
                        if (sequenceFormErrors.printType) {
                          setSequenceFormErrors({ ...sequenceFormErrors, printType: undefined });
                        }
                      }}
                      options={[
                        { value: "", label: "Select Print Type" },
                        { value: "digital", label: "Digital Print" },
                        { value: "bulk", label: "Bulk Print" },
                      ]}
                      className="w-full"
                    />
                    {sequenceFormErrors.printType && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {sequenceFormErrors.printType}
                      </p>
                    )}
                  </div>

                  {(sequenceForm.printType === "digital" || sequenceForm.printType === "bulk") && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-cream-900 mb-2">
                            Category *
                          </label>
                          <ReviewFilterDropdown
                            id="sequence-category"
                            label="Select Category"
                            value={sequenceForm.category}
                            onChange={(value) => {
                              setSequenceForm({
                                ...sequenceForm,
                                category: value,
                                subcategory: "", // Reset subcategory when category changes
                              });
                              if (sequenceFormErrors.category) {
                                setSequenceFormErrors({ ...sequenceFormErrors, category: undefined });
                              }
                            }}
                            options={[
                              { value: "", label: "Select Category" },
                              ...categories
                                .filter((cat) => {
                                  // Only show top-level categories (no parent)
                                  const isTopLevel = !cat.parent || cat.parent === null || (typeof cat.parent === 'object' && !cat.parent._id);
                                  if (!isTopLevel) return false;
                                  
                                  if (sequenceForm.printType === "digital") {
                                    return cat.type === "Digital" || cat.type === "digital";
                                  } else if (sequenceForm.printType === "bulk") {
                                    return cat.type === "Bulk" || cat.type === "bulk";
                                  }
                                  return false;
                                })
                                .map((cat) => ({
                                  value: cat._id,
                                  label: cat.name,
                                })),
                            ]}
                            className="w-full"
                          />
                          {sequenceFormErrors.category && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={12} />
                              {sequenceFormErrors.category}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-cream-900 mb-2">
                            Subcategory {sequenceForm.category ? "*" : "(Optional)"}
                          </label>
                          <ReviewFilterDropdown
                            label="Select Subcategory"
                            value={sequenceForm.subcategory}
                            onChange={(value) =>
                              setSequenceForm({ ...sequenceForm, subcategory: value })
                            }
                            options={[
                              { value: "", label: "Select Subcategory (Optional)" },
                              ...subCategories
                                .filter((subCat) => {
                                  if (!sequenceForm.category) return false;
                                  const categoryId = subCat.category 
                                    ? (typeof subCat.category === 'object' ? subCat.category._id : subCat.category)
                                    : null;
                                  return categoryId === sequenceForm.category;
                                })
                                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                                .map((subCat) => ({
                                  value: subCat._id,
                                  label: subCat.name,
                                })),
                            ]}
                            className="w-full"
                            disabled={!sequenceForm.category}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div id="sequence-departments">
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Select Departments (in order) *
                    </label>
                    <p className="text-xs text-cream-600 mb-3">
                      Check departments in the order they should process. First checked = Sequence 1, second = Sequence 2, etc.
                    </p>
                    {departments.length === 0 ? (
                      <div className="p-4 bg-cream-50 border border-cream-200 rounded-lg">
                        <p className="text-sm text-cream-600 text-center">
                          No departments available. Please create departments first.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-cream-300 rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          {(departments || [])
                            .filter((d: any) => d.isEnabled)
                            .map((dept: any) => {
                              const selectedDepts = sequenceForm.selectedDepartments || [];
                              const isSelected = selectedDepts.includes(dept._id);
                              const orderIndex = selectedDepts.indexOf(dept._id);
                              return (
                                <div
                                  key={dept._id}
                                  className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                                    isSelected
                                      ? "border-green-500 bg-green-50"
                                      : "border-cream-200 bg-white hover:bg-cream-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleDepartmentToggle(dept._id)}
                                    className="w-4 h-4 text-cream-900 border-cream-300 rounded focus:ring-cream-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {isSelected && (
                                        <span className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-xs font-bold">
                                          {orderIndex + 1}
                                        </span>
                                      )}
                                      <span className="font-medium text-cream-900">{dept.name}</span>
                                    </div>
                                    {dept.operators && dept.operators.length > 0 && (
                                      <div className="mt-1">
                                        <p className="text-xs font-medium text-cream-700">Operators:</p>
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {dept.operators.map((op: any) => (
                                            <span key={op && typeof op === 'object' ? op._id : op} className="text-xs text-cream-600 bg-cream-100 px-2 py-0.5 rounded">
                                              {op && typeof op === 'object' ? op.name : 'N/A'}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {(!dept.operators || dept.operators.length === 0) && (
                                      <p className="text-xs text-cream-500 mt-1">No operators assigned</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {sequenceForm.selectedDepartments && sequenceForm.selectedDepartments.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">Selected Sequence:</p>
                        <div className="space-y-1">
                          {sequenceForm.selectedDepartments.map((deptId, index) => {
                            const dept = departments.find((d: any) => d._id === deptId);
                            return dept ? (
                              <div key={deptId} className="flex items-center gap-2 text-sm text-blue-800">
                                <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
                                  {index + 1}
                                </span>
                                <span>{dept.name}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attributes Selection */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Select Attributes (Optional)
                    </label>
                    <p className="text-xs text-cream-600 mb-3">
                      Select attribute types that should be automatically assigned when this sequence is used for a product.
                    </p>
                    {loadingAttributeTypes ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader className="animate-spin text-cream-600" size={20} />
                        <span className="ml-2 text-sm text-cream-600">Loading attributes...</span>
                      </div>
                    ) : (!attributeTypes || attributeTypes.length === 0) ? (
                      <div className="p-4 bg-cream-50 border border-cream-200 rounded-lg">
                        <p className="text-sm text-cream-600 text-center">
                          No attribute types available. Create attribute types first in the "Attribute Types" tab.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-cream-300 rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          {attributeTypes.map((attrType: any) => {
                            const isSelected = (sequenceForm.selectedAttributes || []).includes(attrType._id);
                            return (
                              <div
                                key={attrType._id}
                                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                                  isSelected
                                    ? "border-green-500 bg-green-50"
                                    : "border-cream-200 bg-white hover:bg-cream-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSequenceForm({
                                        ...sequenceForm,
                                        selectedAttributes: [...(sequenceForm.selectedAttributes || []), attrType._id],
                                      });
                                    } else {
                                      setSequenceForm({
                                        ...sequenceForm,
                                        selectedAttributes: (sequenceForm.selectedAttributes || []).filter(
                                          (id) => id !== attrType._id
                                        ),
                                      });
                                    }
                                  }}
                                  className="w-4 h-4 text-cream-900 border-cream-300 rounded focus:ring-cream-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium text-cream-900">{attrType.attributeName}</h4>
                                      <p className="text-xs text-cream-600 mt-1">
                                        {attrType.inputStyle || "N/A"} • {attrType.primaryEffectType || "N/A"} •{" "}
                                        {attrType.isPricingAttribute ? "Affects Price" : "No Price Impact"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {sequenceForm.selectedAttributes && sequenceForm.selectedAttributes.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">Selected Attributes:</p>
                        <div className="flex flex-wrap gap-2">
                          {sequenceForm.selectedAttributes.map((attrId) => {
                            const attr = attributeTypes.find((a: any) => a._id === attrId);
                            return attr ? (
                              <span
                                key={attrId}
                                className="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded"
                              >
                                {attr.attributeName}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        {editingSequenceId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        {editingSequenceId ? "Update Sequence" : "Create Sequence"}
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Sequences List */}
              <div className="mt-8">
                <h2 className="text-xl font-bold text-cream-900 mb-4">All Sequences</h2>
                {loadingSequences ? (
                  <div className="text-center py-12">
                    <Loader className="animate-spin mx-auto mb-4 text-cream-900" size={32} />
                    <p className="text-cream-600">Loading sequences...</p>
                  </div>
                ) : !sequences || sequences.length === 0 ? (
                  <div className="text-center py-12 bg-cream-50 rounded-lg border border-cream-200">
                    <Settings size={48} className="mx-auto mb-4 text-cream-400" />
                    <p className="text-cream-600">No sequences found. Create one to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(sequences || []).map((sequence) => (
                      <div
                        key={sequence._id}
                        className="bg-white border border-cream-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-cream-900 mb-1">{sequence.name}</h3>
                            <p className="text-xs text-cream-600 mb-1">
                              Category: {sequence.category && typeof sequence.category === 'object' ? sequence.category.name : 'N/A'}
                            </p>
                            <p className="text-xs text-cream-600 mb-2">
                              Subcategory: {sequence.subcategory && typeof sequence.subcategory === 'object' ? sequence.subcategory.name : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs font-medium text-cream-700 mb-1">Department Order:</p>
                          <div className="space-y-1">
                            {(sequence.departments || [])
                              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                              .map((deptEntry: any, index: number) => {
                                const dept = typeof deptEntry.department === 'object' 
                                  ? deptEntry.department 
                                  : departments.find((d: any) => d._id === deptEntry.department);
                                return dept ? (
                                  <div key={index} className="text-xs mb-2">
                                    <div className="flex items-center gap-2 text-cream-600 mb-1">
                                      <span className="flex items-center justify-center w-5 h-5 bg-cream-900 text-white rounded-full text-xs font-bold">
                                        {deptEntry.order || index + 1}
                                      </span>
                                      <span className="font-medium">{dept.name}</span>
                                    </div>
                                    {dept.operators && dept.operators.length > 0 ? (
                                      <div className="ml-7">
                                        <p className="text-xs font-medium text-cream-700 mb-0.5">Operators:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {dept.operators.map((op: any) => (
                                            <span key={op && typeof op === 'object' ? op._id : op} className="text-xs text-cream-600 bg-cream-100 px-2 py-0.5 rounded">
                                              {op && typeof op === 'object' ? op.name : 'N/A'}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="ml-7">
                                        <p className="text-xs text-cream-500">No operators assigned</p>
                                      </div>
                                    )}
                                  </div>
                                ) : null;
                              })}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleEditSequence(sequence._id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSequence(sequence._id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Users */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-cream-900 mb-4">
                  Update User Role
                </h2>
                <p className="text-sm text-cream-600 mb-4">
                  Users are created through the signup page. Use this form to update existing users' roles to admin or employee.
                </p>
                <form onSubmit={handleUpdateUserRole} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Username (Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={userRoleForm.username}
                      onChange={(e) =>
                        setUserRoleForm({
                          ...userRoleForm,
                          username: e.target.value,
                        })
                      }
                      placeholder="Enter user's name"
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Role *
                    </label>
                    <ReviewFilterDropdown
                      label="Select Role"
                      value={userRoleForm.role}
                      onChange={(value) =>
                        setUserRoleForm({
                          ...userRoleForm,
                          role: value as string,
                        })
                      }
                      options={[
                        { value: "user", label: "User" },
                        { value: "admin", label: "Admin" },
                        { value: "emp", label: "Employee" },
                      ]}
                      className="w-full"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Settings size={20} />
                        Update Role
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="border-t border-cream-300 pt-6">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-cream-900">
                    All Users ({users.length})
                  </h2>
                  <button
                    onClick={fetchUsers}
                    className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {users.length === 0 ? (
                  <div className="text-center py-12 text-cream-600">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user._id}
                        className="border border-cream-300 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div>
                          <h3 className="font-semibold text-cream-900">
                            {user.name}
                          </h3>
                          <p className="text-sm text-cream-600">{user.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === "admin"
                                  ? "bg-cream-900 text-white"
                                  : "bg-cream-200 text-cream-900"
                              }`}
                            >
                              {user.role}
                            </span>
                            {user.isEmployee && (
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Employee
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-cream-500">
                          {!isClient 
                            ? 'Loading...' 
                            : new Date(user.createdAt).toLocaleDateString()
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-cream-200">
                <div>
                  <h2 className="text-2xl font-bold text-cream-900">
                    Order #{selectedOrder.orderNumber}
                  </h2>
                  <p className="text-sm text-cream-600 mt-1">
                    {!isClient 
                      ? 'Loading...' 
                      : new Date(selectedOrder.createdAt).toLocaleString()
                    }
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                    setOrderStatusUpdate({ status: "", deliveryDate: "", adminNotes: "" });
                  }}
                  className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Complete Order Information */}
              <div className="space-y-6 mb-6">
                {/* Order Status */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-cream-700">Status:</span>
                  <div className={`px-4 py-2 rounded-full border-2 ${
                    selectedOrder.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                    selectedOrder.status === "processing" ? "bg-blue-100 text-blue-800 border-blue-200" :
                    selectedOrder.status === "production_ready" ? "bg-orange-100 text-orange-800 border-orange-200" :
                    selectedOrder.status === "request" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                    selectedOrder.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                    "bg-gray-100 text-gray-800 border-gray-200"
                  }`}>
                    <span className="text-sm font-semibold capitalize">{selectedOrder.status}</span>
                  </div>
                </div>

                {/* User Information */}
                <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                  <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                    <Users size={18} />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-cream-600 mb-1 font-medium">Customer Name</p>
                      <p className="font-semibold text-cream-900 text-base">{selectedOrder.user.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cream-600 mb-1 font-medium">Email Address</p>
                      <p className="font-semibold text-cream-900 text-base">{selectedOrder.user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                  <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Product Information
                  </h3>
                  <div className="flex gap-4 mb-3">
                    <img
                      src={selectedOrder.product.image || PLACEHOLDER_IMAGE}
                      alt={selectedOrder.product.name}
                      className="w-24 h-24 object-cover rounded-lg border border-cream-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-cream-900 text-lg mb-1">{selectedOrder.product.name}</p>
                      <p className="text-sm text-cream-600 mb-2">
                        Category: {selectedOrder.product.category && typeof selectedOrder.product.category === "object" 
                          ? selectedOrder.product.category.name 
                          : selectedOrder.product.category || "N/A"}
                      </p>
                      <p className="text-sm text-cream-600">
                        Base Price: ₹{selectedOrder.product.basePrice?.toFixed(2) || "0.00"} per unit
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Customization Details */}
                <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                  <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                    <Settings size={18} />
                    Customization Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-cream-600 mb-1">Quantity</p>
                      <p className="font-bold text-cream-900">{selectedOrder.quantity} units</p>
                    </div>
                    <div>
                      <p className="text-xs text-cream-600 mb-1">Finish</p>
                      <p className="font-bold text-cream-900">{selectedOrder.finish}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cream-600 mb-1">Shape</p>
                      <p className="font-bold text-cream-900">{selectedOrder.shape}</p>
                    </div>
                    <div>
                      <p className="text-xs text-cream-600 mb-1">Total Price</p>
                      <p className="font-bold text-cream-900">₹{selectedOrder.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {selectedOrder.selectedOptions && selectedOrder.selectedOptions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-cream-200">
                      <p className="text-xs text-cream-600 mb-2 font-semibold">Selected Options</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.selectedOptions.map((option, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-cream-200 text-cream-800 rounded-full text-xs font-medium"
                          >
                            {typeof option === "string" ? option : (option.optionName || option.name || "Option")}
                            {typeof option === "object" && option.priceAdd ? ` (+₹${option.priceAdd.toFixed(2)})` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Dynamic Attributes */}
                  {selectedOrder.selectedDynamicAttributes && selectedOrder.selectedDynamicAttributes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-cream-200">
                      <p className="text-xs text-cream-600 mb-2 font-semibold">Selected Attributes</p>
                      <div className="space-y-2">
                        {selectedOrder.selectedDynamicAttributes.map((attr, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 rounded-lg bg-cream-100 border border-cream-200"
                          >
                            <div className="flex items-center gap-2">
                              {attr.image && attr.image.trim() !== "" && (
                                <img src={attr.image} alt={attr.attributeName} className="w-8 h-8 object-cover rounded" />
                              )}
                              <div>
                                <p className="text-xs font-medium text-cream-900">{attr.attributeName}</p>
                                <p className="text-xs text-cream-600">{attr.label}</p>
                                {attr.description && <p className="text-xs text-cream-500 mt-0.5">{attr.description}</p>}
                              </div>
                            </div>
                            {(attr.priceAdd > 0 || attr.priceMultiplier) && (
                              <div className="text-right">
                                {attr.priceAdd > 0 && (
                                  <span className="block text-xs font-bold text-cream-900">
                                    +₹{attr.priceAdd.toFixed(2)}
                                  </span>
                                )}
                                {attr.priceMultiplier && attr.priceMultiplier !== 1 && (
                                  <span className="block text-xs text-cream-600">
                                    ×{attr.priceMultiplier.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                {(() => {
                  const orderForCalc: OrderForCalculation = {
                    quantity: selectedOrder.quantity,
                    product: {
                      basePrice: selectedOrder.product.basePrice || 0,
                      gstPercentage: selectedOrder.product.gstPercentage || 18,
                      options: selectedOrder.product.options,
                      filters: selectedOrder.product.filters,
                      quantityDiscounts: (selectedOrder.product as any)?.quantityDiscounts || [],
                    },
                    finish: selectedOrder.finish,
                    shape: selectedOrder.shape,
                    selectedOptions: selectedOrder.selectedOptions?.map((opt) => ({
                      name: typeof opt === 'string' ? opt : (opt.optionName || opt.name || 'Option'),
                      optionName: typeof opt === 'string' ? opt : (opt.optionName || opt.name || 'Option'),
                      priceAdd: typeof opt === 'object' ? (opt.priceAdd || 0) : 0,
                    })) || [],
                    selectedDynamicAttributes: selectedOrder.selectedDynamicAttributes?.map((attr) => ({
                      attributeName: attr.attributeName,
                      label: attr.label,
                      priceMultiplier: attr.priceMultiplier,
                      priceAdd: attr.priceAdd,
                    })),
                  };

                  const calculations = calculateOrderBreakdown(orderForCalc);

                  return (
                    <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                      <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                        <CreditCard size={18} />
                        Price Breakdown
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center pb-2 border-b border-cream-200">
                          <div className="text-cream-600">
                            <span>
                              Base Price ({selectedOrder.quantity.toLocaleString()} ×{' '}
                              {formatCurrency(selectedOrder.product.basePrice || 0)})
                            </span>
                          </div>
                          <span className="font-medium text-cream-900">{formatCurrency(calculations.rawBaseTotal)}</span>
                        </div>

                        {calculations.discountPercentage > 0 && (
                          <div className="flex justify-between items-center text-green-700 bg-green-50 p-2 rounded-md">
                            <div>
                              <span className="font-semibold">
                                Bulk Discount ({calculations.discountPercentage}%)
                              </span>
                              <p className="text-xs opacity-80">Applied for {selectedOrder.quantity} units</p>
                            </div>
                            <span className="font-bold">
                              -{formatCurrency(calculations.rawBaseTotal - calculations.discountedBaseTotal)}
                            </span>
                          </div>
                        )}

                        {calculations.optionBreakdowns.map((opt, idx) => (
                          <div key={idx} className="flex justify-between items-center text-cream-600">
                            <span>
                              {opt.name} {opt.isPerUnit ? `(${selectedOrder.quantity} × ${formatCurrency(opt.priceAdd)})` : ''}
                            </span>
                            <span>+{formatCurrency(opt.cost)}</span>
                          </div>
                        ))}

                        {/* Show dynamic attributes if they have price impact */}
                        {selectedOrder.selectedDynamicAttributes && selectedOrder.selectedDynamicAttributes.length > 0 && (
                          <>
                            {selectedOrder.selectedDynamicAttributes
                              .filter(attr => attr.priceAdd > 0 || (attr.priceMultiplier && attr.priceMultiplier !== 1))
                              .map((attr, idx) => {
                                // Calculate price impact for this attribute
                                const basePrice = selectedOrder.product.basePrice || 0;
                                let attributeCost = 0;
                                let pricePerUnit = 0;
                                if (attr.priceAdd > 0) {
                                  pricePerUnit = attr.priceAdd;
                                  attributeCost = attr.priceAdd * selectedOrder.quantity;
                                } else if (attr.priceMultiplier && attr.priceMultiplier !== 1) {
                                  pricePerUnit = basePrice * (attr.priceMultiplier - 1);
                                  attributeCost = pricePerUnit * selectedOrder.quantity;
                                }
                                
                                if (attributeCost === 0) return null;
                                
                                return (
                                  <div key={`attr-${idx}`} className="flex justify-between items-center text-cream-600">
                                    <span>
                                      {attr.attributeName} ({attr.label})
                                    </span>
                                    <span>+{formatCurrency(pricePerUnit)}/unit × {selectedOrder.quantity.toLocaleString()} = {formatCurrency(attributeCost)}</span>
                                  </div>
                                );
                              })}
                          </>
                        )}

                        <div className="flex justify-between items-center pt-2 font-medium text-cream-900 border-t border-cream-200">
                          <span>Subtotal</span>
                          <span>{formatCurrency(calculations.subtotal)}</span>
                        </div>

                        <div className="flex justify-between items-center text-cream-600 text-xs">
                          <span>GST ({selectedOrder.product.gstPercentage || 18}%)</span>
                          <span>+{formatCurrency(calculations.gstAmount)}</span>
                        </div>

                        <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-cream-300">
                          <span className="text-base font-bold text-cream-900">Total Amount</span>
                          <span className="text-lg font-bold text-cream-900">{formatCurrency(selectedOrder.totalPrice)}</span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-cream-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-cream-600 text-xs">Advance Paid</span>
                            <span className="font-medium text-green-700">
                              {formatCurrency(selectedOrder.advancePaid || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-cream-600 text-xs">Balance Due</span>
                            <span
                              className={`font-bold ${
                                selectedOrder.totalPrice - (selectedOrder.advancePaid || 0) > 0
                                  ? 'text-red-600'
                                  : 'text-cream-500'
                              }`}
                            >
                              {formatCurrency(selectedOrder.totalPrice - (selectedOrder.advancePaid || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Delivery Information */}
                <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                  <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                    <Truck size={18} />
                    Delivery Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-cream-600 mb-1">Complete Address</p>
                      <p className="font-semibold text-cream-900 text-sm whitespace-pre-wrap">{selectedOrder.address || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-cream-600 mb-1">Mobile Number</p>
                        <p className="font-semibold text-cream-900">{selectedOrder.mobileNumber || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-cream-600 mb-1">Pincode</p>
                        <p className="font-semibold text-cream-900">{selectedOrder.pincode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-cream-600 mb-1">Delivery Date</p>
                        <p className="font-semibold text-cream-900">
                          {selectedOrder.deliveryDate 
                            ? (!isClient 
                                ? 'Loading...' 
                                : new Date(selectedOrder.deliveryDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  }))
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Department Status */}
                {selectedOrder.currentDepartment && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mb-4">
                    <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <Building2 size={18} />
                      Current Department
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 bg-white rounded-lg border border-indigo-200">
                        <p className="text-xs text-indigo-600 mb-1">Currently Working On</p>
                        <p className="text-lg font-bold text-indigo-900">
                          {typeof selectedOrder.currentDepartment === "object" 
                            ? selectedOrder.currentDepartment.name 
                            : "Department"}
                        </p>
                        {selectedOrder.currentDepartmentIndex !== null && selectedOrder.currentDepartmentIndex !== undefined && (
                          <p className="text-xs text-indigo-500 mt-1">
                            Position in Sequence: #{selectedOrder.currentDepartmentIndex + 1}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Production Progress - Enhanced */}
                {selectedOrder.departmentStatuses && selectedOrder.departmentStatuses.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-blue-900 flex items-center gap-2">
                        <Truck size={18} />
                        Production Progress
                      </h3>
                      {(() => {
                        const totalStages = selectedOrder.departmentStatuses.length;
                        const completedStages = selectedOrder.departmentStatuses.filter(ds => ds.status === "completed").length;
                        const inProgressStages = selectedOrder.departmentStatuses.filter(ds => ds.status === "in_progress").length;
                        
                        return (
                          <div className="text-xs text-blue-700 font-medium">
                            {completedStages}/{totalStages} Stages Completed
                            {inProgressStages > 0 && ` • ${inProgressStages} In Progress`}
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Progress Bar */}
                    {(() => {
                      const totalStages = selectedOrder.departmentStatuses.length;
                      const completedStages = selectedOrder.departmentStatuses.filter(ds => ds.status === "completed").length;
                      const progressPercent = Math.round((completedStages / totalStages) * 100);
                      
                      return (
                        <div className="mb-4">
                          <div className="w-full bg-blue-200 rounded-full h-2.5 mb-1">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <p className="text-xs text-blue-700 text-right">{progressPercent}% Complete</p>
                        </div>
                      );
                    })()}
                    
                    <div className="space-y-2">
                      {selectedOrder.departmentStatuses
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
                          
                          // Calculate duration if started and completed
                          let durationText = "";
                          if (deptStatus.startedAt && deptStatus.completedAt) {
                            const start = new Date(deptStatus.startedAt);
                            const end = new Date(deptStatus.completedAt);
                            const durationMs = end.getTime() - start.getTime();
                            const hours = Math.floor(durationMs / (1000 * 60 * 60));
                            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                            if (hours > 0) {
                              durationText = `${hours}h ${minutes}m`;
                            } else {
                              durationText = `${minutes}m`;
                            }
                          }
                          
                          return (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
                              <div className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ${
                                status === "completed" ? "bg-green-500" :
                                status === "in_progress" ? "bg-blue-500 animate-pulse" :
                                status === "paused" ? "bg-yellow-500" :
                                status === "stopped" ? "bg-red-500" :
                                "bg-gray-300"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold text-blue-900">{deptName}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    status === "completed" ? "bg-green-100 text-green-800" :
                                    status === "in_progress" ? "bg-blue-100 text-blue-800" :
                                    status === "paused" ? "bg-yellow-100 text-yellow-800" :
                                    status === "stopped" ? "bg-red-100 text-red-800" :
                                    "bg-gray-100 text-gray-800"
                                  }`}>
                                    {status.replace("_", " ").toUpperCase()}
                                  </span>
                                </div>
                                
                                {/* Timestamps */}
                                <div className="space-y-1 mt-2">
                                  {deptStatus.whenAssigned && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Clock size={12} className="text-purple-600" />
                                      <span className="text-purple-600">
                                        Assigned: {new Date(deptStatus.whenAssigned).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {deptStatus.startedAt && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Clock size={12} className="text-blue-600" />
                                      <span className="text-blue-600">
                                        Started: {new Date(deptStatus.startedAt).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {deptStatus.completedAt && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <CheckCircle size={12} className="text-green-600" />
                                      <span className="text-green-600">
                                        Completed: {new Date(deptStatus.completedAt).toLocaleString()}
                                        {durationText && ` (Duration: ${durationText})`}
                                      </span>
                                    </div>
                                  )}
                                  {deptStatus.pausedAt && status === "paused" && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Clock size={12} className="text-yellow-600" />
                                      <span className="text-yellow-600">
                                        Paused: {new Date(deptStatus.pausedAt).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {deptStatus.stoppedAt && status === "stopped" && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <X size={12} className="text-red-600" />
                                      <span className="text-red-600">
                                        Stopped: {new Date(deptStatus.stoppedAt).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {deptStatus.operator && (
                                    <div className="flex items-center gap-2 text-xs mt-1">
                                      <Users size={12} className="text-cream-600" />
                                      <span className="text-cream-600">
                                        Operator: {deptStatus.operator.name} ({deptStatus.operator.email})
                                      </span>
                                    </div>
                                  )}
                                  {deptStatus.notes && (
                                    <div className="text-xs text-cream-600 mt-1 italic">
                                      Notes: {deptStatus.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Production Timeline - Activity Log */}
                {selectedOrder.productionTimeline && selectedOrder.productionTimeline.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                    <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <Clock size={18} />
                      Production Activity Timeline
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedOrder.productionTimeline
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((timelineItem, idx) => {
                          const deptName = typeof timelineItem.department === "object" 
                            ? timelineItem.department.name 
                            : "Department";
                          const operatorName = timelineItem.operator 
                            ? (typeof timelineItem.operator === "object" 
                                ? `${timelineItem.operator.name} (${timelineItem.operator.email})`
                                : timelineItem.operator)
                            : "System";
                          
                          const actionColors: { [key: string]: string } = {
                            started: "bg-blue-100 text-blue-800 border-blue-300",
                            paused: "bg-yellow-100 text-yellow-800 border-yellow-300",
                            resumed: "bg-green-100 text-green-800 border-green-300",
                            completed: "bg-green-100 text-green-800 border-green-300",
                            stopped: "bg-red-100 text-red-800 border-red-300",
                          };
                          
                          return (
                            <div 
                              key={idx} 
                              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                timelineItem.action === "completed" ? "bg-green-500" :
                                timelineItem.action === "started" ? "bg-blue-500" :
                                timelineItem.action === "paused" ? "bg-yellow-500" :
                                timelineItem.action === "stopped" ? "bg-red-500" :
                                "bg-gray-400"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                                  <span className="text-sm font-semibold text-purple-900">{deptName}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                                    actionColors[timelineItem.action] || "bg-gray-100 text-gray-800 border-gray-300"
                                  }`}>
                                    {timelineItem.action.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-purple-600 mb-1">
                                  <Clock size={12} />
                                  <span>{new Date(timelineItem.timestamp).toLocaleString()}</span>
                                </div>
                                {operatorName && (
                                  <div className="flex items-center gap-2 text-xs text-purple-600 mb-1">
                                    <Users size={12} />
                                    <span>Operator: {operatorName}</span>
                                  </div>
                                )}
                                {timelineItem.notes && (
                                  <div className="text-xs text-purple-700 mt-1 italic bg-purple-50 p-2 rounded border border-purple-100">
                                    {timelineItem.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                {selectedOrder.notes && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <Info size={18} />
                      Customer Notes
                    </h3>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedOrder.adminNotes && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                      <Settings size={18} />
                      Admin Notes
                    </h3>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{selectedOrder.adminNotes}</p>
                  </div>
                )}

                {/* Uploaded Designs */}
                {(selectedOrder.uploadedDesign?.frontImage || selectedOrder.uploadedDesign?.backImage) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200"
                  >
                    <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                      <ImageIcon size={20} />
                      Uploaded Customer Designs
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {selectedOrder.uploadedDesign?.frontImage && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        >
                          <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            Front Design
                          </p>
                          <div className="relative bg-white rounded-lg border-2 border-blue-200 p-4 shadow-md hover:shadow-lg transition-shadow">
                            <img
                              src={selectedOrder.uploadedDesign.frontImage.data || PLACEHOLDER_IMAGE_LARGE}
                              alt="Front design"
                              className="w-full h-80 object-contain rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = PLACEHOLDER_IMAGE_LARGE;
                              }}
                            />
                            <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-blue-600 font-medium">
                                  File: {selectedOrder.uploadedDesign.frontImage.filename || "front-design.png"}
                                </p>
                                <p className="text-xs text-blue-500 mt-1">
                                  Type: {selectedOrder.uploadedDesign.frontImage.contentType || "image/png"}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = selectedOrder.uploadedDesign.frontImage.data || PLACEHOLDER_IMAGE_LARGE;
                                  link.download = selectedOrder.uploadedDesign.frontImage.filename || "front-design.png";
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                                title="Download image"
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {selectedOrder.uploadedDesign?.backImage && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                          <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            Back Design
                          </p>
                          <div className="relative bg-white rounded-lg border-2 border-blue-200 p-4 shadow-md hover:shadow-lg transition-shadow">
                            <img
                              src={selectedOrder.uploadedDesign.backImage.data || PLACEHOLDER_IMAGE_LARGE}
                              alt="Back design"
                              className="w-full h-80 object-contain rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = PLACEHOLDER_IMAGE_LARGE;
                              }}
                            />
                            <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-blue-600 font-medium">
                                  File: {selectedOrder.uploadedDesign.backImage.filename || "back-design.png"}
                                </p>
                                <p className="text-xs text-blue-500 mt-1">
                                  Type: {selectedOrder.uploadedDesign.backImage.contentType || "image/png"}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = selectedOrder.uploadedDesign.backImage.data || PLACEHOLDER_IMAGE_LARGE;
                                  link.download = selectedOrder.uploadedDesign.backImage.filename || "back-design.png";
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                                title="Download image"
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Order Management Section */}
              {selectedOrder.status !== "cancelled" && (
                <div className="border-t border-cream-200 pt-6">
                  <h3 className="font-bold text-cream-900 mb-4 flex items-center gap-2">
                    <Settings size={18} />
                    Manage Order
                  </h3>
                  <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cream-900 mb-2">
                    Order Status
                  </label>
                  <ReviewFilterDropdown
                    label="Select Status"
                    value={orderStatusUpdate.status}
                    onChange={(value) =>
                      setOrderStatusUpdate({ ...orderStatusUpdate, status: value as string })
                    }
                    options={[
                      { value: "request", label: "Request" },
                      { value: "processing", label: "Processing" },
                      { value: "completed", label: "Completed" },
                      { value: "rejected", label: "Rejected" },
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cream-900 mb-2">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={orderStatusUpdate.deliveryDate}
                    onChange={(e) =>
                      setOrderStatusUpdate({ ...orderStatusUpdate, deliveryDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cream-900 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={orderStatusUpdate.adminNotes}
                    onChange={(e) =>
                      setOrderStatusUpdate({ ...orderStatusUpdate, adminNotes: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                    placeholder="Add notes for this order..."
                  />
                </div>

                    <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrder._id)}
                    disabled={loading}
                    className="flex-1 bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Update Order
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowOrderModal(false);
                      setSelectedOrder(null);
                      setOrderStatusUpdate({ status: "", deliveryDate: "", adminNotes: "" });
                    }}
                    className="px-6 py-3 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    Cancel
                  </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && selectedUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-cream-900">
                    Upload Details
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (selectedUpload && window.confirm("Are you sure you want to delete this uploaded image?")) {
                          handleDeleteUpload(selectedUpload._id);
                          setShowUploadModal(false);
                          setSelectedUpload(null);
                        }
                      }}
                      disabled={loading}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                      title="Delete upload"
                    >
                      <Trash2 size={20} />
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedUpload(null);
                      }}
                      className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-cream-600">User</p>
                    <p className="font-semibold text-cream-900">
                      {selectedUpload.user.name} ({selectedUpload.user.email})
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-cream-600">Dimensions</p>
                    <p className="font-semibold text-cream-900">
                      {selectedUpload.width} × {selectedUpload.height}px
                    </p>
                  </div>

                  {selectedUpload.description && (
                    <div>
                      <p className="text-sm text-cream-600">Description</p>
                      <p className="text-cream-900">{selectedUpload.description}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-cream-600">Front Image</p>
                      {selectedUpload.frontImage && (
                        <button
                          onClick={() =>
                            handleDownloadImage(
                              selectedUpload.frontImage!.data,
                              selectedUpload.frontImage!.filename ||
                                "front-image.jpg"
                            )
                          }
                          className="px-3 py-1 text-xs bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      )}
                    </div>
                    {selectedUpload.frontImage && (
                      <div className="relative">
                        {imageLoading[`modal-front-${selectedUpload._id}`] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-cream-100 rounded-lg">
                            <Loader className="animate-spin text-cream-600" size={32} />
                          </div>
                        )}
                        <img
                          src={getImageUrl(selectedUpload.frontImage.data, selectedUpload.frontImage.contentType) || PLACEHOLDER_IMAGE_LARGE}
                          alt={selectedUpload.frontImage.filename}
                          className={`w-full rounded-lg border border-cream-300 ${imageLoading[`modal-front-${selectedUpload._id}`] ? "opacity-0" : "opacity-100"} transition-opacity`}
                          onLoad={() => setImageLoading(prev => ({ ...prev, [`modal-front-${selectedUpload._id}`]: false }))}
                          onError={() => {
                            setImageLoading(prev => ({ ...prev, [`modal-front-${selectedUpload._id}`]: false }));
                            console.error("Failed to load image:", selectedUpload.frontImage?.filename);
                          }}
                          onLoadStart={() => setImageLoading(prev => ({ ...prev, [`modal-front-${selectedUpload._id}`]: true }))}
                        />
                      </div>
                    )}
                  </div>

                  {selectedUpload.backImage && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-cream-600">Back Image</p>
                        <button
                          onClick={() =>
                            handleDownloadImage(
                              selectedUpload.backImage!.data,
                              selectedUpload.backImage!.filename ||
                                "back-image.jpg"
                            )
                          }
                          className="px-3 py-1 text-xs bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </div>
                      <div className="relative">
                        {imageLoading[`modal-back-${selectedUpload._id}`] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-cream-100 rounded-lg">
                            <Loader className="animate-spin text-cream-600" size={32} />
                          </div>
                        )}
                        <img
                          src={getImageUrl(selectedUpload.backImage.data, selectedUpload.backImage.contentType) || PLACEHOLDER_IMAGE_LARGE}
                          alt={selectedUpload.backImage.filename}
                          className={`w-full rounded-lg border border-cream-300 ${imageLoading[`modal-back-${selectedUpload._id}`] ? "opacity-0" : "opacity-100"} transition-opacity`}
                          onLoad={() => setImageLoading(prev => ({ ...prev, [`modal-back-${selectedUpload._id}`]: false }))}
                          onError={() => {
                            setImageLoading(prev => ({ ...prev, [`modal-back-${selectedUpload._id}`]: false }));
                            console.error("Failed to load image:", selectedUpload.backImage?.filename);
                          }}
                          onLoadStart={() => setImageLoading(prev => ({ ...prev, [`modal-back-${selectedUpload._id}`]: true }))}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-cream-600">Uploaded</p>
                    <p className="text-cream-900">
                      {!isClient 
                        ? 'Loading...' 
                        : new Date(selectedUpload.createdAt).toLocaleString()
                      }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className="text-xl font-bold text-cream-900">
                Delete {deleteConfirmModal.type === 'category' ? 'Category' : 'Subcategory'}
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-cream-700 mb-3">
                Are you sure you want to delete <strong>{deleteConfirmModal.name}</strong>?
              </p>

              {deleteConfirmModal.subcategoryCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-red-600 mt-0.5" size={20} />
                    <div>
                      <p className="text-red-800 font-semibold mb-1">
                        ⚠️ Cannot Delete: This category has {deleteConfirmModal.subcategoryCount} subcategor{deleteConfirmModal.subcategoryCount === 1 ? 'y' : 'ies'}!
                      </p>
                      <p className="text-red-700 text-sm">
                        Please delete or reassign all subcategories before deleting this category.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {deleteConfirmModal.productCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-red-600 mt-0.5" size={20} />
                    <div>
                      <p className="text-red-800 font-semibold mb-1">
                        ⚠️ Warning: This will delete {deleteConfirmModal.productCount} product{deleteConfirmModal.productCount !== 1 ? 's' : ''}!
                      </p>
                      <p className="text-red-700 text-sm">
                        All products under this {deleteConfirmModal.type === 'category' ? 'category and its subcategories' : 'subcategory'} will be permanently deleted. This action cannot be undone.
                      </p>
                      <p className="text-red-700 text-sm mt-2 font-medium">
                        Please be careful before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Type <strong>"delete"</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmModal.deleteText}
                  onChange={(e) => setDeleteConfirmModal({ ...deleteConfirmModal, deleteText: e.target.value })}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  placeholder="Type 'delete' to confirm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false, deleteText: '' })}
                className="flex-1 px-4 py-2 border border-cream-300 text-cream-700 rounded-lg hover:bg-cream-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmModal.type === 'category') {
                    confirmDeleteCategory();
                  } else {
                    confirmDeleteSubCategory();
                  }
                }}
                disabled={deleteConfirmModal.deleteText.toLowerCase() !== 'delete' || loading || deleteConfirmModal.subcategoryCount > 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin inline mr-2" size={16} />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Description Modal */}
      {viewDescriptionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Eye className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-cream-900">
                  {viewDescriptionModal.type === 'category' ? 'Category' : 'Subcategory'} Description
                </h3>
              </div>
              <button
                onClick={() => setViewDescriptionModal({ ...viewDescriptionModal, isOpen: false })}
                className="text-cream-600 hover:text-cream-900 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold text-cream-900 mb-2">
                {viewDescriptionModal.name}
              </h4>
              <div className="bg-cream-50 border border-cream-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-cream-700 whitespace-pre-wrap leading-relaxed">
                  {viewDescriptionModal.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewDescriptionModal({ ...viewDescriptionModal, isOpen: false })}
                className="px-6 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

