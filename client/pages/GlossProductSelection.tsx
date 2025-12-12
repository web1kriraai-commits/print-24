import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Truck, Upload as UploadIcon, FileImage, CreditCard, X, Loader, Info, Lock, AlertCircle, MapPin } from 'lucide-react';
import { Select, SelectOption } from '../components/ui/select';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import BackButton from '../components/BackButton';

interface SubCategory {
  _id: string;
  name: string;
  description: string;
  image?: string;
  slug?: string;
  category?: {
    _id: string;
    name: string;
    description?: string;
  };
}

interface GlossProduct {
  _id: string;
  id: string;
  name: string;
  description?: string;
  descriptionArray?: string[];
  filters: {
    printingOption: string[];
    orderQuantity: {
      min: number;
      max: number;
      multiples: number;
      quantityType?: "SIMPLE" | "STEP_WISE" | "RANGE_WISE";
      stepWiseQuantities?: number[];
      rangeWiseQuantities?: Array<{
        min: number;
        max: number | null;
        priceMultiplier: number;
        label?: string;
      }>;
    };
    deliverySpeed: string[];
    textureType?: string[];
  };
  basePrice: number;
  image?: string;
  subcategory?: SubCategory | string;
  options?: Array<{
    name: string;
    priceAdd: number;
    description?: string;
    image?: string;
  }>;
  dynamicAttributes?: Array<{
    attributeType: string | {
      _id: string;
      attributeName: string;
      inputStyle: string;
      attributeValues: Array<{
        value: string;
        label: string;
        priceMultiplier: number;
        image?: string;
        description?: string;
      }>;
      defaultValue?: string;
    };
    isEnabled: boolean;
    isRequired: boolean;
    displayOrder: number;
    customValues?: Array<{
      value: string;
      label: string;
      priceMultiplier: number;
      image?: string;
      description?: string;
    }>;
  }>;
  quantityDiscounts?: Array<{
    minQuantity: number;
    maxQuantity?: number | null;
    discountPercentage: number;
    priceMultiplier?: number;
  }>;
  // File upload constraints
  maxFileSizeMB?: number;
  minFileWidth?: number;
  maxFileWidth?: number;
  minFileHeight?: number;
  maxFileHeight?: number;
  blockCDRandJPG?: boolean;
  // Additional charges and taxes
  additionalDesignCharge?: number;
  gstPercentage?: number;
  // Price display setting
  showPriceIncludingGst?: boolean; // If true, show prices including GST; if false, show excluding GST
  // Custom instructions for customers
  instructions?: string;
}

const GlossProductSelection: React.FC = () => {
  const { categoryId, subCategoryId, productId } = useParams<{ categoryId: string; subCategoryId?: string; productId?: string }>();
  const [products, setProducts] = useState<GlossProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<GlossProduct | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states for selected product
  const [selectedPrintingOption, setSelectedPrintingOption] = useState<string>("");
  const [selectedDeliverySpeed, setSelectedDeliverySpeed] = useState<string>("");
  const [selectedTextureType, setSelectedTextureType] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1000);

  // Dynamic attributes state - store selected values for each attribute
  const [selectedDynamicAttributes, setSelectedDynamicAttributes] = useState<{ [key: string]: string | number | boolean | File | null }>({});
  // Track which attributes have been explicitly selected by the user (for image updates)
  const [userSelectedAttributes, setUserSelectedAttributes] = useState<Set<string>>(new Set());
  // Selected product options (from options table)
  const [selectedProductOptions, setSelectedProductOptions] = useState<string[]>([]);

  // Order form states
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string | null>(null);
  const [deliveryLocationSource, setDeliveryLocationSource] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  // Delivery information states
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [frontDesignFile, setFrontDesignFile] = useState<File | null>(null);
  const [backDesignFile, setBackDesignFile] = useState<File | null>(null);
  const [frontDesignPreview, setFrontDesignPreview] = useState<string>("");
  const [backDesignPreview, setBackDesignPreview] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [price, setPrice] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [additionalDesignCharge, setAdditionalDesignCharge] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  // Track individual charges for order summary
  const [printingOptionCharge, setPrintingOptionCharge] = useState(0);
  const [deliverySpeedCharge, setDeliverySpeedCharge] = useState(0);
  const [textureTypeCharge, setTextureTypeCharge] = useState(0);
  const [productOptionsCharge, setProductOptionsCharge] = useState(0);
  const [dynamicAttributesCharges, setDynamicAttributesCharges] = useState<Array<{ name: string; label: string; charge: number }>>([]);
  const [baseSubtotalBeforeDiscount, setBaseSubtotalBeforeDiscount] = useState(0);
  const [perUnitPriceExcludingGst, setPerUnitPriceExcludingGst] = useState(0); // Store per unit price excluding GST
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const navigate = useNavigate();

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isImageModalOpen]);

  // Auto-select single options when product changes
  useEffect(() => {
    if (!selectedProduct) return;

    // Auto-select printing option if only one available
    if (selectedProduct.filters?.printingOption && selectedProduct.filters.printingOption.length === 1) {
      if (!selectedPrintingOption || selectedPrintingOption !== selectedProduct.filters.printingOption[0]) {
        setSelectedPrintingOption(selectedProduct.filters.printingOption[0]);
      }
    }

    // Auto-select delivery speed if only one available
    if (selectedProduct.filters?.deliverySpeed && selectedProduct.filters.deliverySpeed.length === 1) {
      if (!selectedDeliverySpeed || selectedDeliverySpeed !== selectedProduct.filters.deliverySpeed[0]) {
        setSelectedDeliverySpeed(selectedProduct.filters.deliverySpeed[0]);
      }
    }

    // Auto-select texture type if only one available
    if (selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length === 1) {
      if (!selectedTextureType || selectedTextureType !== selectedProduct.filters.textureType[0]) {
        setSelectedTextureType(selectedProduct.filters.textureType[0]);
      }
    }

    // Auto-select dynamic attributes with single option
    if (selectedProduct.dynamicAttributes) {
      selectedProduct.dynamicAttributes.forEach((attr) => {
        if (!attr.isEnabled) return;
        const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
        if (!attrType) return;

        const attributeValues = attr.customValues && attr.customValues.length > 0
          ? attr.customValues
          : attrType.attributeValues || [];

        // Auto-select if only one value available
        if (attributeValues.length === 1) {
          const singleValue = attributeValues[0];
          if (!selectedDynamicAttributes[attrType._id] || selectedDynamicAttributes[attrType._id] !== singleValue.value) {
            setSelectedDynamicAttributes({
              ...selectedDynamicAttributes,
              [attrType._id]: singleValue.value
            });
          }
        }
      });
    }
  }, [selectedProduct]);

  // Fetch subcategory and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Reset selected product when category/subcategory changes
        setSelectedProduct(null);
        setProducts([]);

        // Find subcategory by subCategoryId from URL, or by "gloss-finish" slug, or by name containing "gloss"
        // If productId is provided, we need to find the product first to get its subcategory
        let subcategoryId: string | null = null;
        let subcategoryData: SubCategory | null = null;

        // If productId is provided, fetch the product first to get its subcategory
        if (productId) {
          try {
            const productResponse = await fetch(`${API_BASE_URL}/products/${productId}`, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (productResponse.ok) {
              const productText = await productResponse.text();
              if (!productText.startsWith("<!DOCTYPE") && !productText.startsWith("<html")) {
                const productData = JSON.parse(productText);
                // Get subcategory from product
                if (productData.subcategory) {
                  if (typeof productData.subcategory === 'object' && productData.subcategory._id) {
                    subcategoryId = productData.subcategory._id;
                    subcategoryData = productData.subcategory;
                    setSelectedSubCategory(productData.subcategory);
                  } else if (typeof productData.subcategory === 'string') {
                    subcategoryId = productData.subcategory;
                  }
                }

                // Map and set the product directly if fetched by ID
                const mappedProduct: GlossProduct = {
                  _id: productData._id,
                  id: productData._id,
                  name: productData.name || '',
                  description: productData.description || '',
                  descriptionArray: productData.descriptionArray || (productData.description ? [productData.description] : []),
                  filters: {
                    printingOption: productData.filters?.printingOption || [],
                    orderQuantity: productData.filters?.orderQuantity || { min: 1000, max: 72000, multiples: 1000 },
                    deliverySpeed: productData.filters?.deliverySpeed || [],
                    textureType: productData.filters?.textureType || undefined,
                    filterPricesEnabled: productData.filters?.filterPricesEnabled || false,
                    printingOptionPrices: productData.filters?.printingOptionPrices || [],
                    deliverySpeedPrices: productData.filters?.deliverySpeedPrices || [],
                    textureTypePrices: productData.filters?.textureTypePrices || [],
                  },
                  basePrice: productData.basePrice || 0,
                  image: productData.image,
                  subcategory: productData.subcategory,
                  options: productData.options || [],
                  dynamicAttributes: productData.dynamicAttributes || [], // Preserve populated attributeType objects
                  quantityDiscounts: productData.quantityDiscounts || [],
                  maxFileSizeMB: productData.maxFileSizeMB,
                  minFileWidth: productData.minFileWidth,
                  maxFileWidth: productData.maxFileWidth,
                  minFileHeight: productData.minFileHeight,
                  maxFileHeight: productData.maxFileHeight,
                  blockCDRandJPG: productData.blockCDRandJPG || false,
                  additionalDesignCharge: productData.additionalDesignCharge || 0,
                  gstPercentage: productData.gstPercentage || 0,
                  showPriceIncludingGst: productData.showPriceIncludingGst || false,
                  instructions: productData.instructions || "",
                };
                setSelectedProduct(mappedProduct);
              }
            }
          } catch (err) {
            console.error("Error fetching product:", err);
          }
        }

        // If we don't have subcategory yet, try to find it from subcategories list
        if (!subcategoryId) {
          // Fetch subcategories for the category
          const subcategoriesUrl = categoryId
            ? `${API_BASE_URL}/subcategories/category/${categoryId}`
            : `${API_BASE_URL}/subcategories`;

          const subcategoriesResponse = await fetch(subcategoriesUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });

          if (subcategoriesResponse.ok) {
            const subcategoriesText = await subcategoriesResponse.text();
            if (!subcategoriesText.startsWith("<!DOCTYPE") && !subcategoriesText.startsWith("<html")) {
              const subcategoriesData = JSON.parse(subcategoriesText);

              // First try to find by subCategoryId from URL (could be slug, name, or _id)
              if (subCategoryId) {
                subcategoryData = subcategoriesData.find(
                  (sc: SubCategory) =>
                    sc.slug === subCategoryId ||
                    sc._id === subCategoryId ||
                    sc.name?.toLowerCase().replace(/\s+/g, '-') === subCategoryId.toLowerCase().replace(/\s+/g, '-') ||
                    sc.name?.toLowerCase() === subCategoryId.toLowerCase()
                );
              }

              // If not found and route has "gloss-finish", try that
              if (!subcategoryData) {
                subcategoryData = subcategoriesData.find(
                  (sc: SubCategory) =>
                    sc.slug?.toLowerCase() === "gloss-finish" ||
                    sc.name?.toLowerCase().includes('gloss finish') ||
                    sc.name?.toLowerCase().includes('gloss')
                );
              }

              if (subcategoryData) {
                subcategoryId = subcategoryData._id;
                setSelectedSubCategory(subcategoryData);
              }
              // If subcategoryData is null, don't try to fetch - will use category endpoint instead
            }
          }
        }
        // If subcategoryData is null, don't try to fetch - will use category endpoint instead

        // Fetch products based on whether subcategory is found or not
        // FIRST check if subcategoryData is null - if null, use category endpoint directly
        // If subcategory is found, use /products/subcategory/:subcategoryId
        // If subcategory is NOT found (null), use /products/category/:categoryId
        let productsUrl: string;
        let productsResponse: Response;

        // Priority 1: Check if subcategoryData is null - if null, use category endpoint directly
        if (!subcategoryData || subcategoryData === null) {
          // Subcategory is null - use category endpoint directly
          if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
            productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
            productsResponse = await fetch(productsUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });
          } else {
            // No valid category ID
            setProducts([]);
            return;
          }
        } else if (subcategoryId && subcategoryData && /^[0-9a-fA-F]{24}$/.test(subcategoryId)) {
          // Subcategory found - use subcategory endpoint
          productsUrl = `${API_BASE_URL}/products/subcategory/${subcategoryId}`;
          productsResponse = await fetch(productsUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
        } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
          // Fallback: Subcategory not found - use category endpoint
          productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
          productsResponse = await fetch(productsUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
        } else {
          // No valid category or subcategory ID
          setProducts([]);
          return;
        }

        const productsText = await productsResponse.text();
        if (productsText.startsWith("<!DOCTYPE") || productsText.startsWith("<html")) {
          // Ngrok blocked - don't throw error, just log and continue
          console.warn("Ngrok blocked request. Please check your ngrok configuration.");
          setProducts([]);
        } else if (!productsResponse.ok) {
          // Products not found or error - don't throw, just log and continue
          if (productsResponse.status === 404) {
            console.warn(`No products found`);
          } else {
            console.warn(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
          }
          setProducts([]);
        } else {
          try {
            const productsData = JSON.parse(productsText);

            // Ensure productsData is an array
            if (!Array.isArray(productsData)) {
              console.warn("Invalid products data format received from server.");
              setProducts([]);
            } else {
              // Map API products to GlossProduct format
              const mappedProducts: GlossProduct[] = productsData.map((product: any) => ({
                _id: product._id,
                id: product._id,
                name: product.name || '',
                description: product.description || '',
                descriptionArray: product.descriptionArray || (product.description ? [product.description] : []),
                filters: {
                  printingOption: product.filters?.printingOption || [],
                  orderQuantity: product.filters?.orderQuantity || { min: 1000, max: 72000, multiples: 1000 },
                  deliverySpeed: product.filters?.deliverySpeed || [],
                  textureType: product.filters?.textureType || undefined,
                  filterPricesEnabled: product.filters?.filterPricesEnabled || false,
                  printingOptionPrices: product.filters?.printingOptionPrices || [],
                  deliverySpeedPrices: product.filters?.deliverySpeedPrices || [],
                  textureTypePrices: product.filters?.textureTypePrices || [],
                },
                basePrice: product.basePrice || 0,
                image: product.image,
                subcategory: product.subcategory,
                options: product.options || [],
                dynamicAttributes: product.dynamicAttributes || [],
                quantityDiscounts: product.quantityDiscounts || [],
                maxFileSizeMB: product.maxFileSizeMB,
                minFileWidth: product.minFileWidth,
                maxFileWidth: product.maxFileWidth,
                minFileHeight: product.minFileHeight,
                maxFileHeight: product.maxFileHeight,
                blockCDRandJPG: product.blockCDRandJPG || false,
                additionalDesignCharge: product.additionalDesignCharge || 0,
                gstPercentage: product.gstPercentage || 0,
                showPriceIncludingGst: product.showPriceIncludingGst || false,
                instructions: product.instructions || "",
              }));

              setProducts(mappedProducts);

              // AUTO-SKIP: If only one product, navigate directly to its detail page
              if (mappedProducts.length === 1 && !productId) {
                const singleProduct = mappedProducts[0];
                if (categoryId && subCategoryId) {
                  navigate(`/digital-print/${categoryId}/${subCategoryId}/${singleProduct._id}`, { replace: true });
                } else if (categoryId) {
                  navigate(`/digital-print/${categoryId}/${singleProduct._id}`, { replace: true });
                } else if (subCategoryId) {
                  navigate(`/digital-print/${subCategoryId}/${singleProduct._id}`, { replace: true });
                } else {
                  navigate(`/digital-print/${singleProduct._id}`, { replace: true });
                }
                return;
              }

              // If productId is provided, auto-select that product
              if (productId && mappedProducts.length > 0) {
                const productToSelect = mappedProducts.find(p => p._id === productId || p.id === productId);
                if (productToSelect) {
                  setSelectedProduct(productToSelect);
                }
              }
            }
          } catch (parseErr) {
            console.warn("Error parsing products data:", parseErr);
            setProducts([]);
          }
        }
      } catch (err) {
        // Don't set error for subcategory-related issues - just log and continue
        console.warn("Error fetching data:", err);
        setProducts([]);
        // Only set error for critical issues that prevent the page from working
        // Subcategory not found is not a critical error - user can still browse
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, subCategoryId, productId]);

  // Handle product selection
  const handleProductSelect = (product: GlossProduct) => {
    setSelectedProduct(product);
    // Reset filters
    setSelectedPrintingOption("");
    setSelectedDeliverySpeed("");
    setSelectedTextureType("");

    // Auto-select smallest quantity value
    const orderQuantity = product.filters?.orderQuantity;
    let smallestQuantity = 1000; // Default fallback

    if (orderQuantity) {
      if (orderQuantity.quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
        // Use smallest value from step-wise quantities
        smallestQuantity = Math.min(...orderQuantity.stepWiseQuantities);
      } else if (orderQuantity.quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
        // Use smallest min value from ranges
        smallestQuantity = Math.min(...orderQuantity.rangeWiseQuantities.map((r: any) => r.min || 1000));
      } else {
        // Use min from simple quantity config
        smallestQuantity = orderQuantity.min || 1000;
      }
    }

    setQuantity(smallestQuantity);
    setAppliedDiscount(null);

    // Initialize dynamic attributes with default values
    const initialAttributes: { [key: string]: string | number | boolean | File | null | any[] } = {};
    if (product.dynamicAttributes && Array.isArray(product.dynamicAttributes)) {
      product.dynamicAttributes.forEach((attr) => {
        if (attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const attributeValues = attr.customValues && attr.customValues.length > 0
              ? attr.customValues
              : attrType.attributeValues || [];

            // Set default value if available
            if (attrType.defaultValue && attributeValues.find((av: any) => av.value === attrType.defaultValue)) {
              initialAttributes[attrType._id] = attrType.defaultValue;
            } else if (attributeValues.length > 0) {
              // For checkbox, initialize as empty array, for others use first value
              if (attrType.inputStyle === 'CHECKBOX') {
                initialAttributes[attrType._id] = [];
              } else {
                initialAttributes[attrType._id] = attributeValues[0].value;
              }
            }
          }
        }
      });
    }
    setSelectedDynamicAttributes(initialAttributes);
    // Reset user-selected attributes so main product image is shown initially
    setUserSelectedAttributes(new Set());

    // Reset selected product options
    setSelectedProductOptions([]);

    // Initialize with first options if available
    if (product.filters?.printingOption && product.filters.printingOption.length > 0) {
      setSelectedPrintingOption(product.filters.printingOption[0]);
    }
    if (product.filters?.deliverySpeed && product.filters.deliverySpeed.length > 0) {
      setSelectedDeliverySpeed(product.filters.deliverySpeed[0]);
    }
    if (product.filters?.textureType && product.filters.textureType.length > 0) {
      setSelectedTextureType(product.filters.textureType[0]);
    }
  };

  // Auto-select product if productId is provided in URL
  useEffect(() => {
    if (productId && products.length > 0 && !selectedProduct) {
      const productToSelect = products.find(p => p._id === productId || p.id === productId);
      if (productToSelect) {
        handleProductSelect(productToSelect);
      }
    }
  }, [productId, products, selectedProduct]);

  // Generate quantity options based on quantity type
  const generateQuantities = (product: GlossProduct) => {
    const orderQuantity = product.filters.orderQuantity;
    const quantityType = orderQuantity.quantityType || "SIMPLE";

    if (quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
      // Return specific step-wise quantities
      return orderQuantity.stepWiseQuantities.filter(qty => qty > 0).sort((a, b) => a - b);
    } else if (quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
      // For range-wise, generate quantities from ranges
      // Use the min of each range as the selectable quantity, or generate common quantities within ranges
      const quantities: number[] = [];
      orderQuantity.rangeWiseQuantities.forEach(range => {
        if (range.min > 0) {
          // Add the min quantity of each range
          if (!quantities.includes(range.min)) {
            quantities.push(range.min);
          }
          // If there's a max, add some intermediate values
          if (range.max && range.max > range.min) {
            const step = Math.max(1, Math.floor((range.max - range.min) / 5));
            for (let q = range.min + step; q < range.max; q += step) {
              if (!quantities.includes(q)) {
                quantities.push(q);
              }
            }
            // Add max if it's reasonable
            if (range.max <= range.min * 10) {
              if (!quantities.includes(range.max)) {
                quantities.push(range.max);
              }
            }
          }
        }
      });
      return quantities.sort((a, b) => a - b);
    } else {
      // Default: Simple min/max/multiples
      const { min, max, multiples } = orderQuantity;
      const quantities: number[] = [];
      for (let q = min; q <= max && q <= min + (multiples * 20); q += multiples) {
        quantities.push(q);
      }
      return quantities;
    }
  };


  // Calculate price with all factors
  React.useEffect(() => {
    if (selectedProduct) {
      let basePrice = selectedProduct.basePrice;

      // Apply range-wise price multiplier if applicable (applied first, before other multipliers)
      if (selectedProduct.filters?.orderQuantity?.quantityType === "RANGE_WISE" &&
        selectedProduct.filters.orderQuantity.rangeWiseQuantities &&
        selectedProduct.filters.orderQuantity.rangeWiseQuantities.length > 0) {
        const applicableRange = selectedProduct.filters.orderQuantity.rangeWiseQuantities.find((range: any) => {
          return quantity >= range.min && (range.max === null || range.max === undefined || quantity <= range.max);
        });
        if (applicableRange && applicableRange.priceMultiplier !== undefined && applicableRange.priceMultiplier !== 1.0) {
          basePrice = basePrice * applicableRange.priceMultiplier;
        }
      }

      // Track price impacts for breakdown display
      let printingOptionImpact = 0;
      let deliverySpeedImpact = 0;
      let textureTypeImpact = 0;
      const dynamicAttributesChargesList: Array<{ name: string; label: string; charge: number }> = [];

      // Check if filter prices are enabled
      const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;

      if (filterPricesEnabled) {
        // Use filter prices from filters object
        if (selectedPrintingOption && selectedProduct.filters?.printingOptionPrices) {
          const priceData = selectedProduct.filters.printingOptionPrices.find((p: any) => p.name === selectedPrintingOption);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(priceData.priceAdd) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            printingOptionImpact = impactPerUnit * quantity;
          }
        }

        if (selectedDeliverySpeed && selectedProduct.filters?.deliverySpeedPrices) {
          const priceData = selectedProduct.filters.deliverySpeedPrices.find((p: any) => p.name === selectedDeliverySpeed);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(priceData.priceAdd) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            deliverySpeedImpact = impactPerUnit * quantity;
          }
        }

        if (selectedTextureType && selectedProduct.filters?.textureTypePrices) {
          const priceData = selectedProduct.filters.textureTypePrices.find((p: any) => p.name === selectedTextureType);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(priceData.priceAdd) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            textureTypeImpact = impactPerUnit * quantity;
          }
        }
      } else {
        // Apply options-based multipliers (legacy system) - only for filters if they match option names
        if (selectedProduct.options && Array.isArray(selectedProduct.options)) {
          selectedProduct.options.forEach((option: any) => {
            if (option.name === selectedPrintingOption) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
              // priceAdd is per 1000 units, so calculate impact per unit
              if (priceAdd > 0) {
                const impactPerUnit = priceAdd / 1000;
                basePrice += impactPerUnit;
                printingOptionImpact = impactPerUnit * quantity;
              } else if (priceAdd < 0) {
                // Handle negative priceAdd as multiplier
                const multiplier = (1 + Math.abs(priceAdd) / 100);
                const oldPrice = basePrice;
                basePrice *= multiplier;
                printingOptionImpact = (basePrice - oldPrice) * quantity;
              }
            } else if (option.name === selectedDeliverySpeed) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
              if (priceAdd > 0) {
                const impactPerUnit = priceAdd / 1000;
                basePrice += impactPerUnit;
                deliverySpeedImpact = impactPerUnit * quantity;
              } else if (priceAdd < 0) {
                const multiplier = (1 + Math.abs(priceAdd) / 100);
                const oldPrice = basePrice;
                basePrice *= multiplier;
                deliverySpeedImpact = (basePrice - oldPrice) * quantity;
              }
            } else if (option.name === selectedTextureType) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
              if (priceAdd > 0) {
                const impactPerUnit = priceAdd / 1000;
                basePrice += impactPerUnit;
                textureTypeImpact = impactPerUnit * quantity;
              } else if (priceAdd < 0) {
                const multiplier = (1 + Math.abs(priceAdd) / 100);
                const oldPrice = basePrice;
                basePrice *= multiplier;
                textureTypeImpact = (basePrice - oldPrice) * quantity;
              }
            }
          });
        }
      }
      // Apply legacy hardcoded multipliers if options don't have priceAdd and filter prices are not enabled
      if (!filterPricesEnabled && (!selectedProduct.options || selectedProduct.options.length === 0)) {
        if (selectedPrintingOption === 'Both Sides') {
          const oldPrice = basePrice;
          basePrice *= 1.2;
          printingOptionImpact = (basePrice - oldPrice) * quantity;
        }
        if (selectedDeliverySpeed === 'Express') {
          const oldPrice = basePrice;
          basePrice *= 1.3;
          deliverySpeedImpact = (basePrice - oldPrice) * quantity;
        }
        if (selectedTextureType) {
          const oldPrice = basePrice;
          basePrice *= 1.15;
          textureTypeImpact = (basePrice - oldPrice) * quantity;
        }
      }

      // Apply selected product options (checkboxes) - these are separate from filters and apply regardless of filterPricesEnabled
      let productOptionsImpact = 0;
      if (selectedProduct.options && Array.isArray(selectedProduct.options) && selectedProductOptions.length > 0) {
        selectedProductOptions.forEach((optionName: string) => {
          const option = selectedProduct.options.find((opt: any) => opt.name === optionName);
          if (option && option.priceAdd !== undefined) {
            const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
            if (priceAdd !== 0) {
              const impactPerUnit = priceAdd / 1000;
              basePrice += impactPerUnit;
              productOptionsImpact += impactPerUnit * quantity;
            }
          }
        });
      }
      setProductOptionsCharge(productOptionsImpact);

      // Apply dynamic attribute multipliers and track impact
      if (selectedProduct.dynamicAttributes && Array.isArray(selectedProduct.dynamicAttributes)) {
        selectedProduct.dynamicAttributes.forEach((attr) => {
          if (attr.isEnabled) {
            const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
            if (attrType) {
              const selectedValue = selectedDynamicAttributes[attrType._id];
              if (selectedValue !== undefined && selectedValue !== null && selectedValue !== "") {
                const attributeValues = attr.customValues && attr.customValues.length > 0
                  ? attr.customValues
                  : attrType.attributeValues || [];

                // Handle checkbox (multiple values) - apply all multipliers
                if (Array.isArray(selectedValue)) {
                  const selectedLabels: string[] = [];
                  let totalCharge = 0;
                  selectedValue.forEach((val) => {
                    const attrValue = attributeValues.find((av: any) => av.value === val);
                    if (attrValue && attrValue.priceMultiplier && attrValue.priceMultiplier !== 1) {
                      const oldPrice = basePrice;
                      basePrice = basePrice * attrValue.priceMultiplier;
                      const charge = (basePrice - oldPrice) * quantity;
                      totalCharge += charge;
                      if (attrValue.label) selectedLabels.push(attrValue.label);
                    }
                  });
                  if (totalCharge !== 0) {
                    dynamicAttributesChargesList.push({
                      name: attrType.attributeName,
                      label: selectedLabels.join(", ") || "Selected",
                      charge: totalCharge
                    });
                  }
                } else {
                  // Handle single value attributes
                  const attrValue = attributeValues.find((av: any) => av.value === selectedValue);
                  if (attrValue && attrValue.priceMultiplier && attrValue.priceMultiplier !== 1) {
                    const oldPrice = basePrice;
                    basePrice = basePrice * attrValue.priceMultiplier;
                    const charge = (basePrice - oldPrice) * quantity;
                    if (charge !== 0) {
                      dynamicAttributesChargesList.push({
                        name: attrType.attributeName,
                        label: attrValue.label || selectedValue,
                        charge: charge
                      });
                    }
                  }
                }
              }
            }
          }
        });
      }

      // Calculate base subtotal before discount
      const baseSubtotal = basePrice * quantity;

      // Apply quantity-based discounts
      let discountMultiplier = 1.0;
      let currentDiscount = null;
      if (selectedProduct.quantityDiscounts && Array.isArray(selectedProduct.quantityDiscounts)) {
        // Find the applicable discount tier for the selected quantity
        const applicableDiscount = selectedProduct.quantityDiscounts.find((discount: any) => {
          const minQty = discount.minQuantity || 0;
          const maxQty = discount.maxQuantity;
          return quantity >= minQty && (maxQty === null || maxQty === undefined || quantity <= maxQty);
        });

        if (applicableDiscount) {
          // Use priceMultiplier if available, otherwise calculate from discountPercentage
          if (applicableDiscount.priceMultiplier) {
            discountMultiplier = applicableDiscount.priceMultiplier;
          } else if (applicableDiscount.discountPercentage) {
            discountMultiplier = (100 - applicableDiscount.discountPercentage) / 100;
          }
          currentDiscount = applicableDiscount.discountPercentage || 0;
        }
      }

      // Store base subtotal before discount for display
      setBaseSubtotalBeforeDiscount(baseSubtotal);

      // Apply discount multiplier to subtotal
      const calculatedSubtotal = baseSubtotal * discountMultiplier;
      setSubtotal(calculatedSubtotal);
      setAppliedDiscount(currentDiscount);

      // Store individual charges for order summary
      setPrintingOptionCharge(printingOptionImpact);
      setDeliverySpeedCharge(deliverySpeedImpact);
      setTextureTypeCharge(textureTypeImpact);
      setDynamicAttributesCharges(dynamicAttributesChargesList);

      // Add additional design charge if applicable
      const designCharge = selectedProduct.additionalDesignCharge || 0;
      setAdditionalDesignCharge(designCharge);

      // Calculate GST on (subtotal + design charge)
      const gstPercent = selectedProduct.gstPercentage || 0;
      const calculatedGst = (calculatedSubtotal + designCharge) * (gstPercent / 100);
      setGstAmount(calculatedGst);

      // Store price excluding GST (for product page display)
      // GST will only be added at checkout
      const priceExcludingGst = calculatedSubtotal + designCharge;
      setPrice(priceExcludingGst);

      // Calculate and store per unit price excluding GST (base price + all per-unit charges, after discount)
      const perUnitExcludingGst = quantity > 0 ? priceExcludingGst / quantity : basePrice;
      setPerUnitPriceExcludingGst(perUnitExcludingGst);
    }
  }, [selectedProduct, selectedPrintingOption, selectedDeliverySpeed, selectedTextureType, quantity, selectedDynamicAttributes, selectedProductOptions]);


  // Get preview classes based on selected product
  const getPreviewClasses = (excludeSize: boolean = false) => {
    const classes: string[] = ['preview-container'];

    if (!selectedProduct) {
      // Default gloss effect when no product selected
      classes.push('gloss');
      return classes.join(' ');
    }

    const productName = selectedProduct.name?.toLowerCase() || '';
    const hasTextureType = selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length > 0;

    // Determine effect based on product name and filters
    if (hasTextureType || selectedTextureType) {
      // UV Coating + Texture Effect
      classes.push('uv', 'texture');

      // Add specific texture number class if texture is selected
      if (selectedTextureType) {
        const textureMatch = selectedTextureType.match(/No\.(\d+)/);
        if (textureMatch) {
          const textureNum = textureMatch[1];
          classes.push(`texture-${textureNum}`);
        }
      } else if (hasTextureType) {
        // Default to texture-1 if product has texture but none selected
        classes.push('texture-1');
      }
    } else if (productName.includes('lamination')) {
      // Lamination
      classes.push('laminated');
    } else if (productName.includes('uv') && !productName.includes('texture')) {
      // UV Coating only
      classes.push('uv');
    } else if (productName.includes('without') || productName.includes('basic')) {
      // No coating (matte look)
      classes.push('none');
    } else {
      // Default gloss effect
      classes.push('gloss');
    }

    // Add size class for small size products (exclude for modal)
    if (!excludeSize && productName.includes('small')) {
      classes.push('small');
    }

    return classes.join(' ');
  };

  // Parse instructions to extract validation rules
  const parseInstructions = (instructions: string) => {
    const rules: { maxSizeMB?: number; fileWidth?: number; fileHeight?: number; blockCDRandJPG?: boolean; allowedFormats?: string[] } = {};

    if (!instructions) return rules;

    // Extract max file size (e.g., "Maximum file size: 10 MB" or "max file size 10 mb")
    const maxSizeMatch = instructions.match(/max(?:imum)?\s+file\s+size[:\s]+(\d+)\s*mb/i);
    if (maxSizeMatch) {
      rules.maxSizeMB = parseInt(maxSizeMatch[1]);
    }

    // Extract dimensions (e.g., "3000 × 2000 pixels" or "3000x2000")
    const dimensionMatch = instructions.match(/(\d+)\s*[×x]\s*(\d+)\s*pixels?/i);
    if (dimensionMatch) {
      rules.fileWidth = parseInt(dimensionMatch[1]);
      rules.fileHeight = parseInt(dimensionMatch[2]);
    }

    // Check for CDR/JPG blocking
    if (/cdr|jpg|jpeg.*not\s+(?:accepted|allowed|permitted)/i.test(instructions)) {
      rules.blockCDRandJPG = true;
    }

    // Extract allowed formats (e.g., "PNG or PDF format only")
    const formatMatch = instructions.match(/(?:format|file\s+type|extension).*?only[:\s]+([^.]+)/i);
    if (formatMatch) {
      const formats = formatMatch[1].split(/[,\s]+or\s+/i).map(f => f.trim().toLowerCase());
      rules.allowedFormats = formats;
    }

    return rules;
  };

  // Handle design file upload with product-specific validation
  const handleDesignFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      e.target.value = ""; // Clear the input
      return;
    }

    // Parse instructions to get validation rules
    const instructionRules = selectedProduct?.instructions ? parseInstructions(selectedProduct.instructions) : {};

    // Validate file size - prioritize instructions, then product settings, then default
    const maxSizeMB = instructionRules.maxSizeMB || selectedProduct?.maxFileSizeMB || 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File size must be less than ${maxSizeMB} MB as specified in the instructions`);
      e.target.value = ""; // Clear the input
      return;
    }

    // Validate file extension if CDR and JPG are blocked - check instructions first
    const blockCDRandJPG = instructionRules.blockCDRandJPG !== undefined
      ? instructionRules.blockCDRandJPG
      : selectedProduct?.blockCDRandJPG || false;

    if (blockCDRandJPG) {
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
      if (extension === 'cdr' || extension === 'jpg' || extension === 'jpeg') {
        alert("CDR and JPG files are not accepted for this product as per instructions. Please use PNG, PDF, or other formats.");
        e.target.value = ""; // Clear the input
        return;
      }
    }

    // Validate allowed formats from instructions
    if (instructionRules.allowedFormats && instructionRules.allowedFormats.length > 0) {
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
      const isAllowed = instructionRules.allowedFormats.some(format =>
        extension.includes(format.toLowerCase())
      );
      if (!isAllowed) {
        alert(`Only ${instructionRules.allowedFormats.join(', ').toUpperCase()} files are accepted as per instructions.`);
        e.target.value = ""; // Clear the input
        return;
      }
    }

    // Validate image dimensions - check min/max width and height
    const minWidth = selectedProduct?.minFileWidth;
    const maxWidth = selectedProduct?.maxFileWidth;
    const minHeight = selectedProduct?.minFileHeight;
    const maxHeight = selectedProduct?.maxFileHeight;

    // Check if any dimension constraints are set
    if (minWidth || maxWidth || minHeight || maxHeight) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let validationErrors: string[] = [];

        // Validate width
        if (minWidth && img.width < minWidth) {
          validationErrors.push(`Image width must be at least ${minWidth} pixels. Current width: ${img.width} pixels.`);
        }
        if (maxWidth && img.width > maxWidth) {
          validationErrors.push(`Image width must be at most ${maxWidth} pixels. Current width: ${img.width} pixels.`);
        }

        // Validate height
        if (minHeight && img.height < minHeight) {
          validationErrors.push(`Image height must be at least ${minHeight} pixels. Current height: ${img.height} pixels.`);
        }
        if (maxHeight && img.height > maxHeight) {
          validationErrors.push(`Image height must be at most ${maxHeight} pixels. Current height: ${img.height} pixels.`);
        }

        if (validationErrors.length > 0) {
          alert(validationErrors.join("\n"));
          e.target.value = ""; // Clear the input
          return;
        }

        // Dimensions are valid, proceed with file upload
        if (side === "front") {
          setFrontDesignFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setFrontDesignPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setBackDesignFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setBackDesignPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        alert("Failed to load image. Please check the file format.");
        e.target.value = ""; // Clear the input
      };

      img.src = objectUrl;
    } else {
      // No dimension validation needed, proceed directly
      if (side === "front") {
        setFrontDesignFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFrontDesignPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setBackDesignFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setBackDesignPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Get auth token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Helper function to find nearest branch and calculate delivery estimate
  const calculateDeliveryFromNearestBranch = async (userLat: number, userLon: number, locationAddress: string) => {
    // Sample branches - in production, this should come from an API
    // Format: { name, address, latitude, longitude, pincode }
    const branches = [
      { name: 'Main Branch', address: '1-A, One Colony, One Street, One, India', latitude: 28.6139, longitude: 77.2090, pincode: '110001' }, // Delhi
      { name: 'Branch 2', address: '2-B, Two Colony, Two Street, Two, India', latitude: 19.0760, longitude: 72.8777, pincode: '400001' }, // Mumbai
      { name: 'Branch 3', address: '3-C, Three Colony, Three Street, Three, India', latitude: 12.9716, longitude: 77.5946, pincode: '560001' }, // Bangalore
    ];

    // Find nearest branch
    let nearestBranch = branches[0];
    let minDistance = calculateDistance(userLat, userLon, branches[0].latitude, branches[0].longitude);

    for (const branch of branches) {
      const distance = calculateDistance(userLat, userLon, branch.latitude, branch.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBranch = branch;
      }
    }

    // Calculate delivery days based on distance
    // Base: 2 days for processing + 1 day per 500km (minimum 1 day)
    const baseDays = 2;
    const transitDays = Math.max(1, Math.ceil(minDistance / 500));
    const totalDays = baseDays + transitDays;

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + totalDays);

    return {
      deliveryDate: deliveryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      locationSource: locationAddress ? `[Location: ${locationAddress}]` : `[Location: ${userLat.toFixed(4)}, ${userLon.toFixed(4)}]`,
      nearestBranch: nearestBranch.name
    };
  };

  // Helper function to get pincode coordinates (simplified - in production use a geocoding API)
  const getPincodeCoordinates = async (pincode: string): Promise<{ lat: number; lon: number; address: string } | null> => {
    try {
      // Use a geocoding service to get coordinates from pincode
      // For now, using a simplified approach - in production, use a proper geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${pincode}&country=India&limit=1`,
        {
          headers: {
            'User-Agent': 'Print24-Delivery-Estimate'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          return {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            address: result.display_name || `Pincode: ${pincode}`
          };
        }
      }
    } catch (err) {
      console.error('Error geocoding pincode:', err);
    }
    return null;
  };

  // Get user location for delivery estimate
  useEffect(() => {
    const fetchDeliveryEstimate = async () => {
      if (!selectedProduct) return;

      try {
        // Try to get geolocation first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;

              // Try to reverse geocode to get address
              let locationAddress = '';
              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                  {
                    headers: {
                      'User-Agent': 'Print24-Delivery-Estimate'
                    }
                  }
                );
                if (response.ok) {
                  const data = await response.json();
                  if (data.address) {
                    const addr = data.address;
                    // Format address: house number, street, city, state, country
                    const parts = [];
                    if (addr.house_number) parts.push(addr.house_number);
                    if (addr.road) parts.push(addr.road);
                    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
                    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                    if (addr.state) parts.push(addr.state);
                    if (addr.country) parts.push(addr.country);
                    locationAddress = parts.join(', ');
                  }
                }
              } catch (geocodeErr) {
                console.error('Reverse geocoding error:', geocodeErr);
              }

              // Calculate delivery from nearest branch
              const estimate = await calculateDeliveryFromNearestBranch(latitude, longitude, locationAddress);
              setEstimatedDeliveryDate(estimate.deliveryDate);
              setDeliveryLocationSource(estimate.locationSource);
            },
            async () => {
              // If geolocation fails, try to get pincode from localStorage
              const savedPincode = localStorage.getItem('userPincode');
              if (savedPincode && savedPincode.length === 6) {
                const coords = await getPincodeCoordinates(savedPincode);
                if (coords) {
                  const estimate = await calculateDeliveryFromNearestBranch(coords.lat, coords.lon, coords.address);
                  setEstimatedDeliveryDate(estimate.deliveryDate);
                  setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
                } else {
                  // Fallback: use default estimate with pincode
                  const days = 5;
                  const deliveryDate = new Date();
                  deliveryDate.setDate(deliveryDate.getDate() + days);
                  setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }));
                  setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
                }
              } else {
                // Default estimate
                const days = 5;
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + days);
                setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }));
                setDeliveryLocationSource('Default estimate');
              }
            }
          );
        } else {
          // Fallback: try pincode from localStorage
          const savedPincode = localStorage.getItem('userPincode');
          if (savedPincode && savedPincode.length === 6) {
            const coords = await getPincodeCoordinates(savedPincode);
            if (coords) {
              const estimate = await calculateDeliveryFromNearestBranch(coords.lat, coords.lon, coords.address);
              setEstimatedDeliveryDate(estimate.deliveryDate);
              setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
            } else {
              // Fallback: use default estimate with pincode
              const days = 5;
              const deliveryDate = new Date();
              deliveryDate.setDate(deliveryDate.getDate() + days);
              setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }));
              setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
            }
          } else {
            // Default estimate
            const days = 5;
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + days);
            setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
            setDeliveryLocationSource('Default estimate');
          }
        }
      } catch (err) {
        console.error('Error fetching delivery estimate:', err);
      }
    };

    fetchDeliveryEstimate();
  }, [selectedProduct]);

  // Get user location and fill address
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      setPaymentError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    setPaymentError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding API to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Print24-Order-System'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }

        const data = await response.json();
        const addressData = data.address || {};

        // Build address string
        const addressParts = [];
        if (addressData.house_number) addressParts.push(addressData.house_number);
        if (addressData.road) addressParts.push(addressData.road);
        if (addressData.neighbourhood) addressParts.push(addressData.neighbourhood);
        if (addressData.suburb) addressParts.push(addressData.suburb);
        if (addressData.city || addressData.town || addressData.village) {
          addressParts.push(addressData.city || addressData.town || addressData.village);
        }
        if (addressData.state) addressParts.push(addressData.state);
        if (addressData.postcode) {
          setPincode(addressData.postcode);
        }

        const fullAddress = addressParts.join(', ');
        if (fullAddress) {
          setAddress(fullAddress);
          setDeliveryLocationSource("location");
        } else {
          setPaymentError("Could not determine address from location. Please enter manually.");
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        setPaymentError("Could not fetch address from location. Please enter manually.");
      }
    } catch (error: any) {
      console.error('Geolocation error:', error);
      if (error.code === 1) {
        setPaymentError("Location access denied. Please enable location permissions or enter address manually.");
      } else if (error.code === 2) {
        setPaymentError("Location unavailable. Please enter address manually.");
      } else if (error.code === 3) {
        setPaymentError("Location request timeout. Please try again or enter address manually.");
      } else {
        setPaymentError("Failed to get location. Please enter address manually.");
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle place order with payment
  const firstErrorField = useRef<HTMLElement | null>(null);

  const handlePlaceOrder = async () => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      setValidationError("Please login to place an order. Redirecting to login page...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      return;
    }

    // Reset error field reference
    firstErrorField.current = null;

    // Validate product and design fields first
    const validationErrors: string[] = [];
    if (!selectedProduct) {
      validationErrors.push('Please select a product');
      if (!firstErrorField.current) {
        firstErrorField.current = document.querySelector('[data-product-select]') as HTMLElement;
      }
    }
    if (!frontDesignFile) {
      validationErrors.push('Please upload a reference image');
      if (!firstErrorField.current) {
        const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLElement;
        if (fileInput) {
          firstErrorField.current = fileInput;
        } else {
          // Find the upload section
          const uploadSection = document.querySelector('[data-upload-section]') as HTMLElement;
          if (uploadSection) firstErrorField.current = uploadSection;
        }
      }
    }
    if (!selectedPrintingOption) {
      validationErrors.push('Please select a printing option');
      if (!firstErrorField.current) {
        const printingOptionField = document.querySelector('[data-field="printingOption"]') as HTMLElement;
        if (printingOptionField) {
          firstErrorField.current = printingOptionField;
        } else {
          // Find the printing option section
          const section = document.querySelector('[data-section="printingOption"]') as HTMLElement;
          if (section) firstErrorField.current = section;
        }
      }
    }
    if (!selectedDeliverySpeed) {
      validationErrors.push('Please select a delivery speed');
      if (!firstErrorField.current) {
        const deliverySpeedField = document.querySelector('[data-field="deliverySpeed"]') as HTMLElement;
        if (deliverySpeedField) {
          firstErrorField.current = deliverySpeedField;
        } else {
          // Find the delivery speed section
          const section = document.querySelector('[data-section="deliverySpeed"]') as HTMLElement;
          if (section) firstErrorField.current = section;
        }
      }
    }

    // Validate required dynamic attributes
    if (selectedProduct?.dynamicAttributes) {
      selectedProduct.dynamicAttributes.forEach((attr) => {
        if (attr.isRequired && attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const value = selectedDynamicAttributes[attrType._id];
            if (!value || (Array.isArray(value) && value.length === 0)) {
              validationErrors.push(`${attrType.attributeName} is required`);
              if (!firstErrorField.current) {
                // Find the input element within the data-attribute wrapper
                const wrapper = document.querySelector(`[data-attribute="${attrType._id}"]`) as HTMLElement;
                if (wrapper) {
                  const input = wrapper.querySelector('input, select, button') as HTMLElement;
                  firstErrorField.current = input || wrapper;
                } else {
                  // Try to find by attribute name
                  const section = document.querySelector(`[data-attribute-name="${attrType.attributeName}"]`) as HTMLElement;
                  if (section) firstErrorField.current = section;
                }
              }
            }
          }
        }
      });
    }

    if (validationErrors.length > 0) {
      // Set validation error message with clear formatting
      setValidationError(validationErrors.join('\n'));

      // Scroll to first error field with better handling
      setTimeout(() => {
        if (firstErrorField.current) {
          // Scroll to element with smooth behavior
          firstErrorField.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          // Try to focus if it's an input element
          setTimeout(() => {
            if (firstErrorField.current instanceof HTMLInputElement || firstErrorField.current instanceof HTMLSelectElement) {
              firstErrorField.current.focus();
            } else {
              // Try to find and focus input/select within the wrapper
              const input = firstErrorField.current.querySelector('input, select, button') as HTMLElement;
              if (input && (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLButtonElement)) {
                input.focus();
              }
            }
          }, 300);

          // Highlight the field with red border
          const elementToHighlight = firstErrorField.current instanceof HTMLInputElement || firstErrorField.current instanceof HTMLSelectElement
            ? firstErrorField.current
            : firstErrorField.current.querySelector('input, select, button') as HTMLElement || firstErrorField.current;

          if (elementToHighlight) {
            // Add error styling
            elementToHighlight.style.borderColor = '#ef4444';
            elementToHighlight.style.borderWidth = '2px';
            elementToHighlight.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

            // Remove error styling after 3 seconds
            setTimeout(() => {
              elementToHighlight.style.borderColor = '';
              elementToHighlight.style.borderWidth = '';
              elementToHighlight.style.boxShadow = '';
            }, 3000);
          }
        } else {
          // If no specific field found, scroll to validation error message
          setTimeout(() => {
            const errorElement = document.querySelector('[role="alert"]') as HTMLElement;
            if (errorElement) {
              errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      }, 100);

      return;
    }

    // Clear any previous validation errors
    setValidationError(null);

    // All product/design validations passed - show payment modal with customer information form
    setShowPaymentModal(true);
    setPaymentError(null);
  };


  // Process payment and create order
  const handlePaymentAndOrder = async () => {
    // Validate product and design first
    if (!selectedProduct) {
      setPaymentError("Please select a product.");
      return;
    }
    if (!frontDesignFile || !frontDesignPreview) {
      setPaymentError("Please upload a reference image.");
      return;
    }
    if (!selectedPrintingOption) {
      setPaymentError("Please select a printing option.");
      return;
    }
    if (!selectedDeliverySpeed) {
      setPaymentError("Please select a delivery speed.");
      return;
    }
    if (!quantity || quantity <= 0) {
      setPaymentError("Please enter a valid quantity (must be greater than 0).");
      return;
    }
    const finalTotalPrice = price + gstAmount;
    if (!finalTotalPrice || finalTotalPrice <= 0) {
      setPaymentError("Invalid order total. Please refresh and try again.");
      return;
    }

    // Validate required dynamic attributes
    if (selectedProduct?.dynamicAttributes) {
      for (const attr of selectedProduct.dynamicAttributes) {
        if (attr.isRequired && attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const value = selectedDynamicAttributes[attrType._id];
            if (!value || (Array.isArray(value) && value.length === 0)) {
              setPaymentError(`${attrType.attributeName} is required.`);
              return;
            }
          }
        }
      }
    }

    // Validate delivery information
    if (!customerName || customerName.trim().length === 0) {
      setPaymentError("Please enter your full name.");
      return;
    }
    if (!customerEmail || customerEmail.trim().length === 0) {
      setPaymentError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      setPaymentError("Please enter a valid email address.");
      return;
    }
    if (!pincode || pincode.trim().length === 0) {
      setPaymentError("Please enter your pincode.");
      return;
    }
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setPaymentError("Please enter a valid 6-digit pincode.");
      return;
    }
    if (!address || address.trim().length === 0) {
      setPaymentError("Please enter your complete address.");
      return;
    }
    if (!mobileNumber || mobileNumber.trim().length === 0) {
      setPaymentError("Please enter your mobile number.");
      return;
    }
    if (mobileNumber.length < 10 || !/^\d+$/.test(mobileNumber)) {
      setPaymentError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // Payment is not required - skip payment processing
      // Minimal delay for better UX (reduced from 2000ms to 300ms)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 2: Prepare order data
      const uploadedDesign: any = {};

      // Validate and prepare front image (required)
      if (!frontDesignPreview || !frontDesignFile) {
        throw new Error("Front design image is required.");
      }

      try {
        // Handle base64 data - remove data:image/... prefix if present
        let frontImageData = frontDesignPreview;
        if (frontImageData.includes(',')) {
          frontImageData = frontImageData.split(',')[1];
        }

        if (!frontImageData || frontImageData.trim().length === 0) {
          throw new Error("Invalid front image data. Please upload the image again.");
        }

        uploadedDesign.frontImage = {
          data: frontImageData,
          contentType: frontDesignFile.type || "image/png",
          filename: frontDesignFile.name || "front-design.png",
        };
      } catch (err) {
        console.error("Error preparing front image:", err);
        throw new Error(err instanceof Error ? err.message : "Failed to prepare front design image. Please try uploading again.");
      }

      // Prepare back image (optional)
      if (backDesignFile && backDesignPreview) {
        try {
          // Handle base64 data - remove data:image/... prefix if present
          let backImageData = backDesignPreview;
          if (backImageData.includes(',')) {
            backImageData = backImageData.split(',')[1];
          }

          if (backImageData && backImageData.trim().length > 0) {
            uploadedDesign.backImage = {
              data: backImageData,
              contentType: backDesignFile.type || "image/png",
              filename: backDesignFile.name || "back-design.png",
            };
          }
        } catch (err) {
          console.error("Error preparing back image:", err);
          // Back image is optional, so we'll just log the error
        }
      }

      // Prepare selected options with complete information
      // Note: selectedProductOptions contains option names, not IDs
      const selectedOptions = selectedProductOptions.map(optionName => {
        const option = selectedProduct.options.find((opt: any) => opt.name === optionName);
        return {
          optionId: optionName, // Store name as optionId for backward compatibility
          optionName: option?.name || optionName,
          name: option?.name || optionName, // Also include name field
          priceAdd: option?.priceAdd || 0,
          description: option?.description || null,
          image: option?.image || null,
        };
      });

      // Prepare dynamic attributes for order with complete information
      const orderDynamicAttributes: any = {};
      const selectedDynamicAttributesArray: Array<{
        attributeTypeId: string;
        attributeName: string;
        attributeValue: any;
        label: string;
        priceMultiplier?: number;
        priceAdd: number;
        description?: string;
        image?: string;
      }> = [];

      Object.keys(selectedDynamicAttributes).forEach(key => {
        const value = selectedDynamicAttributes[key];
        if (value !== null && value !== undefined && value !== "") {
          // Find the attribute type in product
          const productAttr = selectedProduct.dynamicAttributes?.find(
            (attr: any) => {
              const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
              return attrType?._id === key;
            }
          );

          if (productAttr) {
            const attrType = typeof productAttr.attributeType === 'object' ? productAttr.attributeType : null;
            if (attrType) {
              const customValues = productAttr.customValues || [];
              const defaultValues = attrType.attributeValues || [];
              const allValues = customValues.length > 0 ? customValues : defaultValues;

              // Find selected value details
              let selectedValueDetails: any = null;
              if (Array.isArray(value)) {
                selectedValueDetails = allValues.filter((av: any) => value.includes(av.value));
              } else {
                selectedValueDetails = allValues.find((av: any) => av.value === value || av.value === value.toString());
              }

              if (selectedValueDetails) {
                if (Array.isArray(selectedValueDetails)) {
                  // Multiple values
                  const labels = selectedValueDetails.map((sv: any) => sv.label || sv.value).join(", ");
                  const totalPriceMultiplier = selectedValueDetails.reduce((sum: number, sv: any) => sum + (sv.priceMultiplier || 0), 0);
                  selectedDynamicAttributesArray.push({
                    attributeTypeId: key,
                    attributeName: attrType.attributeName || "Attribute",
                    attributeValue: value,
                    label: labels,
                    priceMultiplier: totalPriceMultiplier || undefined,
                    priceAdd: 0,
                    description: selectedValueDetails.map((sv: any) => sv.description).filter(Boolean).join("; ") || undefined,
                    image: selectedValueDetails[0]?.image || undefined,
                  });
                } else {
                  // Single value
                  selectedDynamicAttributesArray.push({
                    attributeTypeId: key,
                    attributeName: attrType.attributeName || "Attribute",
                    attributeValue: value,
                    label: selectedValueDetails.label || value?.toString() || "",
                    priceMultiplier: selectedValueDetails.priceMultiplier || undefined,
                    priceAdd: 0,
                    description: selectedValueDetails.description || undefined,
                    image: selectedValueDetails.image || undefined,
                  });
                }
              } else {
                // Value not in predefined list (text/number input)
                selectedDynamicAttributesArray.push({
                  attributeTypeId: key,
                  attributeName: attrType.attributeName || "Attribute",
                  attributeValue: value,
                  label: value?.toString() || "",
                  priceAdd: 0,
                });
              }
            }
          }

          // Also keep the simple format for backward compatibility
          if (value instanceof File) {
            orderDynamicAttributes[key] = value.name;
          } else {
            orderDynamicAttributes[key] = value;
          }
        }
      });

      // Step 3: Create order with payment status
      const orderData = {
        productId: selectedProduct._id,
        quantity: quantity,
        finish: selectedPrintingOption,
        shape: selectedDeliverySpeed,
        selectedOptions: selectedOptions,
        selectedDynamicAttributes: selectedDynamicAttributesArray, // Send complete attribute information
        totalPrice: price + gstAmount, // Store total including GST for order
        // Delivery information collected at checkout
        pincode: pincode.trim(),
        address: address.trim(),
        mobileNumber: mobileNumber.trim(),
        uploadedDesign: uploadedDesign,
        notes: orderNotes || "",
        // Payment information - payment not required
        advancePaid: 0, // No advance payment
        paymentStatus: "pending", // Payment pending
        paymentGatewayInvoiceId: null, // No payment gateway invoice
        // Legacy product specifications (kept for backward compatibility)
        paperGSM: orderDynamicAttributes.paperGSM || null,
        paperQuality: orderDynamicAttributes.paperQuality || null,
        laminationType: orderDynamicAttributes.laminationType || null,
        specialEffects: orderDynamicAttributes.specialEffects ? [orderDynamicAttributes.specialEffects] : [],
      };

      console.log("Sending order data:", {
        productId: orderData.productId,
        quantity: orderData.quantity,
        finish: orderData.finish,
        shape: orderData.shape,
        totalPrice: orderData.totalPrice,
        hasUploadedDesign: !!orderData.uploadedDesign,
        paymentStatus: orderData.paymentStatus,
      });

      // Check if user is authenticated
      const token = localStorage.getItem("token");
      let response: Response;

      if (!token) {
        // User is not authenticated - use the create-with-account endpoint
        const orderDataWithAccount = {
          ...orderData,
          name: customerName.trim(),
          email: customerEmail.trim(),
          mobileNumber: mobileNumber.trim(),
        };

        response = await fetch(`${API_BASE_URL}/orders/create-with-account`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderDataWithAccount),
        });
      } else {
        // User is authenticated - use regular endpoint
        response = await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(orderData),
        });
      }

      if (!response.ok) {
        let errorMessage = "Failed to create order. Please try again.";
        let errorDetails: any = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details;
          console.error("Order creation error response:", errorData);

          // Check if it's a "No token provided" error (shouldn't happen with new flow, but handle it)
          if (errorMessage.includes("No token provided") || errorMessage.includes("token")) {
            // This shouldn't happen with the new endpoint, but if it does, try the create-with-account endpoint
            const orderDataWithAccount = {
              ...orderData,
              name: customerName.trim(),
              email: customerEmail.trim(),
              mobileNumber: mobileNumber.trim(),
            };

            const retryResponse = await fetch(`${API_BASE_URL}/orders/create-with-account`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(orderDataWithAccount),
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              // Store token and user info
              if (retryData.token) {
                localStorage.setItem("token", retryData.token);
                if (retryData.user) {
                  localStorage.setItem("user", JSON.stringify(retryData.user));
                }
              }
              // Continue with success flow
              const order = retryData.order;
              setShowPaymentModal(false);
              setIsProcessingPayment(false);

              if (retryData.isNewUser && retryData.tempPassword) {
                // Email service temporarily disabled - show password in alert instead
                alert(`Account created successfully!\n\nYour temporary password: ${retryData.tempPassword}\n\nPlease save this password. You can change it after logging in.\n\nOrder placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
              } else {
                alert(`Order placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
              }

              if (order._id || order.order?._id) {
                navigate(`/order/${order._id || order.order._id}`);
              } else {
                navigate("/profile");
              }
              return;
            }
          }

          if (errorData.details) {
            if (Array.isArray(errorData.details)) {
              const detailsText = errorData.details.map((d: any) => `${d.field}: ${d.message}`).join("\n");
              errorMessage += "\n\n" + detailsText;
              console.error("Validation errors:", errorData.details);
            } else {
              errorMessage += "\n\n" + errorData.details;
            }
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          const responseText = await response.text().catch(() => "");
          console.error("Raw error response:", responseText);
          errorMessage += `\n\nServer returned: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const order = responseData.order || responseData;

      // If account was created, store token and user info
      if (responseData.token) {
        localStorage.setItem("token", responseData.token);
        if (responseData.user) {
          localStorage.setItem("user", JSON.stringify(responseData.user));
        }
      }

      // Step 4: Close payment modal and redirect to order details
      setShowPaymentModal(false);
      setIsProcessingPayment(false);

      // Show success message
      if (responseData.isNewUser && responseData.tempPassword) {
        // Email service temporarily disabled - show password in alert instead
        alert(`Account created successfully!\n\nYour temporary password: ${responseData.tempPassword}\n\nPlease save this password. You can change it after logging in.\n\nOrder placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
      } else {
        alert(`Order placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
      }

      // Redirect to order details page
      if (order._id || order.order?._id) {
        navigate(`/order/${order._id || order.order._id}`);
      } else {
        // Fallback to profile page
        navigate("/profile");
      }
    } catch (err) {
      console.error("Error placing order:", err);
      setPaymentError(err instanceof Error ? err.message : "Failed to process payment and create order. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 py-4 sm:py-8">
      {/* Preview Effect Styles */}
      <style>{`
        .preview-container {
          position: relative;
          width: 100%;
          max-width: 500px;
          height: auto;
          display: inline-block;
          overflow: hidden;
        }
        
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 8px;
          transition: filter 0.4s;
          display: block;
          position: relative;
          z-index: 1;
        }
        
        /* GLOSS EFFECT (SHINY OVERLAY) */
        .preview-container.gloss::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.25),
            rgba(255, 255, 255, 0) 60%
          );
          pointer-events: none;
          border-radius: 8px;
          z-index: 2;
        }
        
        /* UV COATING (DEEP SHINE + BOOST COLOR) */
        .preview-container.uv .card-image {
          filter: saturate(1.15) contrast(1.1) !important;
        }
        
        .preview-container.uv::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.35),
            rgba(255, 255, 255, 0) 70%
          );
          mix-blend-mode: screen;
          pointer-events: none;
          border-radius: 8px;
          z-index: 2;
        }
        
        /* LAMINATION (SOFT GLOSS, LOW SHINE) */
        .preview-container.laminated .card-image {
          filter: brightness(1.05) !important;
        }
        
        .preview-container.laminated::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          pointer-events: none;
          z-index: 2;
        }
        
        /* TEXTURE EFFECTS - Different patterns for each texture number */
        .preview-container.texture::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          border-radius: 8px;
          z-index: 3;
          opacity: 0.35;
          mix-blend-mode: overlay;
        }
        
        /* Texture No.1 - Fine Grid */
        .preview-container.texture-1::before {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          );
        }
        
        /* Texture No.2 - Coarse Grid */
        .preview-container.texture-2::before {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 4px,
            rgba(0, 0, 0, 0.04) 4px,
            rgba(0, 0, 0, 0.04) 8px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 4px,
            rgba(0, 0, 0, 0.04) 4px,
            rgba(0, 0, 0, 0.04) 8px
          );
        }
        
        /* Texture No.3 - Diagonal Lines */
        .preview-container.texture-3::before {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        /* Texture No.4 - Dots Pattern */
        .preview-container.texture-4::before {
          background-image: radial-gradient(circle, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
          background-size: 6px 6px;
        }
        
        /* Texture No.5 - Horizontal Lines */
        .preview-container.texture-5::before {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        /* Texture No.6 - Vertical Lines */
        .preview-container.texture-6::before {
          background-image: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        /* Texture No.7 - Crosshatch */
        .preview-container.texture-7::before {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.02) 2px,
            rgba(0, 0, 0, 0.02) 4px
          ),
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.02) 2px,
            rgba(0, 0, 0, 0.02) 4px
          );
        }
        
        /* Texture No.8 - Fine Dots */
        .preview-container.texture-8::before {
          background-image: radial-gradient(circle, rgba(0, 0, 0, 0.03) 0.5px, transparent 0.5px);
          background-size: 4px 4px;
        }
        
        /* NO COATING (MATTE LOOK) */
        .preview-container.none .card-image {
          filter: saturate(0.9) contrast(0.95) !important;
        }
        
        /* SIZE EFFECTS */
        .preview-container.small {
          transform: scale(0.8);
          transition: transform 0.3s ease, max-width 0.3s ease;
        }
        
        .preview-container.small .card-image {
          transform: scale(1);
        }
        
        /* Modal specific styles */
        .preview-container .card-image {
          max-width: 100%;
          max-height: 90vh;
        }
      `}</style>

      <div className="container mx-auto px-4 sm:px-6">
        {/* Back Link */}
        <div className="mb-4 sm:mb-6">
          <BackButton
            onClick={() => {
              // Navigate back based on current route structure
              if (productId && subCategoryId && categoryId) {
                // From product detail with subcategory → go back to subcategory products list
                navigate(`/digital-print/${categoryId}/${subCategoryId}`);
              } else if (productId && categoryId) {
                // From product detail (direct under category) → go back to category
                navigate(`/digital-print/${categoryId}`);
              } else if (subCategoryId && categoryId) {
                // From subcategory products list → go back to category
                navigate(`/digital-print/${categoryId}`);
              } else if (categoryId) {
                // From category → go back to digital print home
                navigate("/digital-print");
              } else {
                // Fallback to digital print page
                navigate("/digital-print");
              }
              window.scrollTo(0, 0);
            }}
            fallbackPath={
              productId && subCategoryId && categoryId
                ? `/digital-print/${categoryId}/${subCategoryId}`
                : productId && categoryId
                  ? `/digital-print/${categoryId}`
                  : subCategoryId && categoryId
                    ? `/digital-print/${categoryId}`
                    : categoryId
                      ? `/digital-print/${categoryId}`
                      : "/digital-print"
            }
            label={
              productId && subCategoryId
                ? "Back to Subcategory"
                : productId && categoryId
                  ? "Back to Category"
                  : subCategoryId
                    ? "Back to Category"
                    : categoryId
                      ? "Back to Categories"
                      : "Back to Categories"
            }
            className="text-sm sm:text-base text-cream-600 hover:text-cream-900"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-cream-900" size={48} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Validation Error Notification - Fixed at top for visibility */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-4 mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3 text-red-700 shadow-lg z-50"
              role="alert"
            >
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p className="font-semibold mb-1 text-red-900">Please complete the required fields:</p>
                <ul className="text-sm whitespace-pre-wrap font-sans list-disc list-inside space-y-1">
                  {validationError.split('\n').filter(line => line.trim()).map((error, idx) => (
                    <li key={idx} className="text-red-800">{error.replace(/^Please fill in all required fields:\n?/, '')}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
                aria-label="Close error message"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content - Only show if not loading and no error */}
        {!loading && !error && (
          <>
            {/* Main Layout: 50/50 Split - Left Image, Right Products */}
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
              {/* Left Side: Subcategory Image (Fixed, Large) - Updates based on selected attribute */}
              <div className="lg:w-1/2">
                <div className="lg:sticky lg:top-24">
                  <motion.div
                    className="bg-white p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-cream-100 flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-cream-100/50"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {(() => {
                        // Get the image to display based on selected attributes
                        // Start with main product image, only update if user has explicitly selected an attribute
                        let displayImage = selectedSubCategory?.image || selectedProduct?.image || "/Glossy.png";
                        let displayAlt = selectedSubCategory?.name || selectedProduct?.name || "Product Preview";

                        // Only check for attribute images if user has explicitly selected at least one attribute
                        // This ensures the main product image is shown initially
                        if (selectedProduct && selectedProduct.dynamicAttributes && userSelectedAttributes.size > 0) {
                          const sortedAttributes = [...selectedProduct.dynamicAttributes]
                            .filter(attr => attr.isEnabled)
                            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                          for (const attr of sortedAttributes) {
                            const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                            if (!attrType) continue;

                            // Only use attribute image if user has explicitly selected this attribute
                            if (!userSelectedAttributes.has(attrType._id)) continue;

                            const selectedValue = selectedDynamicAttributes[attrType._id];
                            if (!selectedValue) continue;

                            // Handle both single values and arrays (for checkbox inputs)
                            const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

                            const attributeValues = attr.customValues && attr.customValues.length > 0
                              ? attr.customValues
                              : attrType.attributeValues || [];

                            // Find the first selected value that has an image
                            let foundImage = false;
                            for (const val of selectedValues) {
                              const selectedAttrValue = attributeValues.find((av: any) =>
                                av.value === val || av.value === String(val)
                              );

                              if (selectedAttrValue && selectedAttrValue.image && selectedAttrValue.image.trim() !== "") {
                                displayImage = selectedAttrValue.image;
                                displayAlt = `${attrType.attributeName} - ${selectedAttrValue.label}`;
                                foundImage = true;
                                // Use the first matching image and break
                                break;
                              }
                            }

                            // If we found an image, use it (prioritize by displayOrder) and stop searching
                            if (foundImage) {
                              break;
                            }
                          }
                        }

                        return (
                          <img
                            src={displayImage}
                            alt={displayAlt}
                            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                            onClick={() => setIsImageModalOpen(true)}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                            }}
                          />
                        );
                      })()}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Right Side: Product List or Product Details */}
              <div className="lg:w-1/2">
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-cream-100 min-h-[600px] lg:min-h-[700px] flex flex-col">
                  {!selectedProduct ? (
                    /* Product Selection List */
                    <div>
                      <div className="mb-6 sm:mb-8 border-b border-cream-100 pb-4 sm:pb-6">
                        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-cream-900 mb-2">
                          {selectedSubCategory?.name || "Products"}
                        </h1>
                        <p className="text-sm sm:text-base text-cream-600">
                          Select a product to customize and place your order.
                        </p>
                      </div>

                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {products.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-cream-600">No products available</p>
                          </div>
                        ) : (
                          products.map((product) => {
                            // Get description points (2-3 lines)
                            const descriptionList = product.descriptionArray && product.descriptionArray.length > 0
                              ? product.descriptionArray
                              : (product.description
                                ? product.description.split('\n').filter(line => line.trim())
                                : []);

                            // Get first 2-3 meaningful description points
                            const descriptionPoints: string[] = [];
                            for (const item of descriptionList) {
                              const cleanItem = item.replace(/<[^>]*>/g, '').trim();
                              // Skip headers (containing colon) and empty items
                              if (cleanItem && !cleanItem.includes(':') && cleanItem.length > 10) {
                                descriptionPoints.push(cleanItem);
                                if (descriptionPoints.length >= 3) break; // Get max 3 lines
                              }
                            }

                            // If no points found, use first items
                            if (descriptionPoints.length === 0 && descriptionList.length > 0) {
                              for (let i = 0; i < Math.min(3, descriptionList.length); i++) {
                                const cleanItem = descriptionList[i].replace(/<[^>]*>/g, '').trim();
                                if (cleanItem) {
                                  descriptionPoints.push(cleanItem);
                                }
                              }
                            }

                            // Join first 2-3 lines
                            const shortDescription = descriptionPoints.slice(0, 3).join(' • ') || '';

                            // Calculate price display
                            const basePrice = product.basePrice || 0;
                            const displayPrice = basePrice < 1
                              ? (basePrice * 1000).toFixed(2)
                              : basePrice.toFixed(2);
                            const priceLabel = basePrice < 1 ? "per 1000 units" : "";

                            return (
                              <button
                                key={product._id || product.id}
                                data-product-select
                                onClick={() => handleProductSelect(product)}
                                className="w-full p-3 sm:p-4 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 group"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                    {product.name}
                                  </h3>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-lg sm:text-xl font-bold text-cream-900">
                                      ₹{displayPrice}
                                    </div>
                                    {priceLabel && (
                                      <div className="text-xs text-cream-500 mt-0.5">
                                        {priceLabel}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {shortDescription && (
                                  <div className="text-cream-600 text-xs sm:text-sm mb-2 leading-relaxed">
                                    <p className="line-clamp-3">{shortDescription}</p>
                                  </div>
                                )}

                                <div className="mt-2 flex items-center text-cream-500 text-xs sm:text-sm font-medium">
                                  <span>View Details & Customize</span>
                                  <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Product Filters and Order Form */
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedProduct._id || selectedProduct.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col h-full"
                      >
                        <div className="flex-1 overflow-y-auto pr-2">
                          {/* Product Header */}
                          <div className="mb-6 sm:mb-8 border-b border-cream-100 pb-4 sm:pb-6 relative">
                            <div className="flex items-start justify-between mb-2">
                              <BackButton
                                onClick={() => {
                                  // Navigate back based on current route structure
                                  if (productId && subCategoryId && categoryId) {
                                    // From product detail with subcategory → go back to subcategory products list
                                    navigate(`/digital-print/${categoryId}/${subCategoryId}`);
                                  } else if (productId && categoryId) {
                                    // From product detail (direct under category) → go back to category
                                    navigate(`/digital-print/${categoryId}`);
                                  } else if (subCategoryId && categoryId) {
                                    // From subcategory products list → go back to category
                                    navigate(`/digital-print/${categoryId}`);
                                  } else if (categoryId) {
                                    // From category → go back to digital print home
                                    navigate("/digital-print");
                                  } else {
                                    // Fallback to digital print page
                                    navigate("/digital-print");
                                  }
                                  window.scrollTo(0, 0);
                                }}
                                fallbackPath={
                                  productId && subCategoryId && categoryId
                                    ? `/digital-print/${categoryId}/${subCategoryId}`
                                    : productId && categoryId
                                      ? `/digital-print/${categoryId}`
                                      : subCategoryId && categoryId
                                        ? `/digital-print/${categoryId}`
                                        : categoryId
                                          ? `/digital-print/${categoryId}`
                                          : "/digital-print"
                                }
                                label={
                                  productId && subCategoryId
                                    ? "Back to Subcategory"
                                    : productId && categoryId
                                      ? "Back to Category"
                                      : subCategoryId
                                        ? "Back to Category"
                                        : categoryId
                                          ? "Back to Categories"
                                          : "Back to Categories"
                                }
                                className="text-sm text-cream-600 hover:text-cream-900 mb-2"
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="flex-1">
                                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-cream-900 mb-2">
                                  {selectedProduct.name}
                                </h1>

                                {/* Instructions Button */}
                                <button
                                  onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                                  className="mt-2 mb-4 px-4 py-2 bg-cream-100 hover:bg-cream-200 text-cream-900 rounded-lg border border-cream-300 text-sm font-medium transition-all flex items-center gap-2"
                                >
                                  <Info size={16} />
                                  Instructions
                                </button>

                                {/* Instructions Modal/Expanded Section with Smooth Transition */}
                                <AnimatePresence>
                                  {isInstructionsOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-4 mb-6 p-4 sm:p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h4 className="text-sm font-bold text-yellow-900 mb-3 flex items-center gap-2">
                                          <Info size={16} />
                                          Important Instructions - Please Read Carefully
                                        </h4>

                                        {/* Custom Instructions from Admin */}
                                        {selectedProduct.instructions && (
                                          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                                            <p className="text-xs font-bold text-red-900 mb-2 flex items-center gap-2">
                                              <X size={14} className="text-red-600" />
                                              CRITICAL: Company Not Responsible If Instructions Not Followed
                                            </p>
                                            <div className="text-xs sm:text-sm text-red-800 whitespace-pre-line">
                                              {selectedProduct.instructions}
                                            </div>
                                          </div>
                                        )}

                                        <div className="space-y-3 text-xs sm:text-sm text-yellow-800">
                                          {/* File Upload Constraints */}
                                          {(selectedProduct.maxFileSizeMB || selectedProduct.minFileWidth || selectedProduct.maxFileWidth || selectedProduct.minFileHeight || selectedProduct.maxFileHeight || selectedProduct.blockCDRandJPG) && (
                                            <div>
                                              <p className="font-semibold text-yellow-900 mb-2">File Upload Requirements:</p>
                                              <div className="space-y-1 ml-4">
                                                {selectedProduct.maxFileSizeMB && (
                                                  <p>• Maximum file size: <strong>{selectedProduct.maxFileSizeMB} MB</strong></p>
                                                )}
                                                {(selectedProduct.minFileWidth || selectedProduct.maxFileWidth || selectedProduct.minFileHeight || selectedProduct.maxFileHeight) && (
                                                  <div>
                                                    <p>• File dimensions:</p>
                                                    <div className="ml-4 space-y-1">
                                                      {(selectedProduct.minFileWidth || selectedProduct.maxFileWidth) && (
                                                        <p>
                                                          - Width: <strong>
                                                            {selectedProduct.minFileWidth && selectedProduct.maxFileWidth
                                                              ? `${selectedProduct.minFileWidth} - ${selectedProduct.maxFileWidth} pixels`
                                                              : selectedProduct.minFileWidth
                                                                ? `Minimum ${selectedProduct.minFileWidth} pixels`
                                                                : selectedProduct.maxFileWidth
                                                                  ? `Maximum ${selectedProduct.maxFileWidth} pixels`
                                                                  : "Any"}
                                                          </strong>
                                                        </p>
                                                      )}
                                                      {(selectedProduct.minFileHeight || selectedProduct.maxFileHeight) && (
                                                        <p>
                                                          - Height: <strong>
                                                            {selectedProduct.minFileHeight && selectedProduct.maxFileHeight
                                                              ? `${selectedProduct.minFileHeight} - ${selectedProduct.maxFileHeight} pixels`
                                                              : selectedProduct.minFileHeight
                                                                ? `Minimum ${selectedProduct.minFileHeight} pixels`
                                                                : selectedProduct.maxFileHeight
                                                                  ? `Maximum ${selectedProduct.maxFileHeight} pixels`
                                                                  : "Any"}
                                                          </strong>
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                                {selectedProduct.blockCDRandJPG && (
                                                  <p>• <strong>CDR and JPG files are not accepted</strong> for this product</p>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Additional Settings */}
                                          {(selectedProduct.additionalDesignCharge || selectedProduct.gstPercentage) && (
                                            <div>
                                              <p className="font-semibold text-yellow-900 mb-2">Additional Charges:</p>
                                              <div className="space-y-1 ml-4">
                                                {selectedProduct.additionalDesignCharge && selectedProduct.additionalDesignCharge > 0 && (
                                                  <p>• Additional Design Charge: <strong>₹{selectedProduct.additionalDesignCharge.toFixed(2)}</strong> (applied if design help is needed)</p>
                                                )}
                                                {selectedProduct.gstPercentage && selectedProduct.gstPercentage > 0 && (
                                                  <p>• GST: <strong>{selectedProduct.gstPercentage}%</strong> (applied on subtotal + design charge)</p>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {!selectedProduct.instructions && !selectedProduct.maxFileSizeMB && !selectedProduct.minFileWidth && !selectedProduct.maxFileWidth && !selectedProduct.minFileHeight && !selectedProduct.maxFileHeight && !selectedProduct.blockCDRandJPG && !selectedProduct.additionalDesignCharge && !selectedProduct.gstPercentage && (
                                            <p className="text-yellow-700 italic">No special instructions for this product.</p>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div className="text-sm sm:text-base text-cream-600 space-y-2">
                                  {(() => {
                                    // First check if description contains HTML (prioritize description field)
                                    if (selectedProduct.description) {
                                      const hasHTML = /<[a-z][\s\S]*>/i.test(selectedProduct.description);
                                      if (hasHTML) {
                                        // Render HTML description exactly as provided by admin
                                        return (
                                          <>
                                            <style>{`
                                        .product-description-html {
                                          color: #92400e;
                                          line-height: 1.6;
                                          white-space: normal;
                                        }
                                        .product-description-html b,
                                        .product-description-html strong {
                                          font-weight: 600;
                                          color: #7c2d12;
                                          display: inline;
                                        }
                                        .product-description-html > b:first-child,
                                        .product-description-html > strong:first-child {
                                          display: block;
                                          font-size: 1.1em;
                                          margin-bottom: 0.75rem;
                                          color: #7c2d12;
                                        }
                                        .product-description-html p,
                                        .product-description-html div {
                                          margin-bottom: 0.5rem;
                                          line-height: 1.6;
                                          color: #92400e;
                                          white-space: normal;
                                          word-wrap: break-word;
                                          overflow-wrap: break-word;
                                        }
                                        .product-description-html div:not(:first-child) {
                                          padding-left: 0;
                                        }
                                        .product-description-html ul,
                                        .product-description-html ol {
                                          margin-left: 1.5rem;
                                          margin-bottom: 0.5rem;
                                        }
                                        .product-description-html li {
                                          margin-bottom: 0.25rem;
                                        }
                                      `}</style>
                                            <div
                                              className="product-description-html text-cream-600"
                                              dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                                            />
                                          </>
                                        );
                                      }
                                    }

                                    // Use descriptionArray if available, otherwise use description
                                    if (selectedProduct.descriptionArray && Array.isArray(selectedProduct.descriptionArray) && selectedProduct.descriptionArray.length > 0) {
                                      // Render descriptionArray with formatting
                                      const renderTextWithBold = (text: string) => {
                                        const parts = text.split(/(\*\*.*?\*\*)/g);
                                        return parts.map((part, idx) => {
                                          if (part.startsWith('**') && part.endsWith('**')) {
                                            const boldText = part.slice(2, -2);
                                            return <strong key={idx} className="font-bold text-cream-800">{boldText}</strong>;
                                          }
                                          return <span key={idx}>{part}</span>;
                                        });
                                      };

                                      // Ensure descriptionArray is displayed left to right (correct order)
                                      // Reverse the array if it's stored in reverse order
                                      const descriptionLines = [...selectedProduct.descriptionArray].reverse();
                                      return descriptionLines.map((desc, i) => {
                                        if (desc.includes(':')) {
                                          return (
                                            <div key={i} className="mt-3 first:mt-0">
                                              <p className="font-semibold text-cream-700 mb-1.5">
                                                {renderTextWithBold(desc)}
                                              </p>
                                            </div>
                                          );
                                        } else if (desc.startsWith('→') || desc.startsWith('->') || desc.startsWith('•')) {
                                          const cleanDesc = desc.replace(/^[→•\-]+\s*/, '').trim();
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(cleanDesc)}</span>
                                            </p>
                                          );
                                        } else {
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(desc)}</span>
                                            </p>
                                          );
                                        }
                                      });
                                    } else if (selectedProduct.description) {
                                      // Render plain text description with formatting (HTML already handled above)
                                      const descriptionLines = selectedProduct.description.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                                      const renderTextWithBold = (text: string) => {
                                        const parts = text.split(/(\*\*.*?\*\*)/g);
                                        return parts.map((part, idx) => {
                                          if (part.startsWith('**') && part.endsWith('**')) {
                                            const boldText = part.slice(2, -2);
                                            return <strong key={idx} className="font-bold text-cream-800">{boldText}</strong>;
                                          }
                                          return <span key={idx}>{part}</span>;
                                        });
                                      };
                                      return descriptionLines.map((desc, i) => {
                                        if (desc.includes(':')) {
                                          return (
                                            <div key={i} className="mt-3 first:mt-0">
                                              <p className="font-semibold text-cream-700 mb-1.5">
                                                {renderTextWithBold(desc)}
                                              </p>
                                            </div>
                                          );
                                        } else if (desc.startsWith('→') || desc.startsWith('->') || desc.startsWith('•')) {
                                          const cleanDesc = desc.replace(/^[→•\-]+\s*/, '').trim();
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(cleanDesc)}</span>
                                            </p>
                                          );
                                        } else {
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(desc)}</span>
                                            </p>
                                          );
                                        }
                                      });
                                    } else {
                                      return <p className="text-cream-500 italic">No description available</p>;
                                    }
                                  })()}
                                </div>
                              </div>

                              {/* Per Unit Price Display - Top Right */}
                              <div className="mt-4 sm:mt-0 sm:absolute sm:top-0 sm:right-0 bg-cream-50 p-4 rounded-lg border border-cream-200 min-w-[200px] shadow-sm">
                                <p className="text-xs sm:text-sm text-cream-600 mb-1">Price Per Unit</p>
                                <div className="text-2xl sm:text-3xl font-bold text-cream-900">
                                  {(() => {
                                    // Use stored per unit price excluding GST
                                    const showIncludingGst = selectedProduct?.showPriceIncludingGst || false;
                                    if (showIncludingGst && quantity > 0) {
                                      const gstPerUnit = gstAmount / quantity;
                                      return `₹${(perUnitPriceExcludingGst + gstPerUnit).toFixed(2)}`;
                                    }
                                    return `₹${perUnitPriceExcludingGst.toFixed(2)}`;
                                  })()}
                                </div>
                                <p className="text-xs text-cream-500 mt-1">
                                  {selectedProduct?.showPriceIncludingGst ? 'including GST' : 'excluding GST'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {(() => {
                            // Calculate section numbers dynamically based on visible sections
                            let sectionNum = 1;
                            const hasOptions = selectedProduct.options && selectedProduct.options.length > 0;
                            const hasPrintingOption = selectedProduct.filters?.printingOption && selectedProduct.filters.printingOption.length > 0;
                            const hasTextureType = selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length > 0;
                            const hasDeliverySpeed = selectedProduct.filters?.deliverySpeed && selectedProduct.filters.deliverySpeed.length > 0;

                            return (
                              <>
                                {/* Product Options (from options table) */}
                                {hasOptions && (
                                  <div className="mb-6 sm:mb-8">
                                    <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Product Options
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                      {selectedProduct.options.map((option: any, idx: number) => {
                                        const isSelected = selectedProductOptions.includes(option.name);
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                              if (isSelected) {
                                                setSelectedProductOptions(selectedProductOptions.filter(name => name !== option.name));
                                              } else {
                                                setSelectedProductOptions([...selectedProductOptions, option.name]);
                                              }
                                            }}
                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${isSelected
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                              }`}
                                          >
                                            {isSelected && (
                                              <div className="absolute top-2 right-2">
                                                <Check size={18} className="text-cream-900" />
                                              </div>
                                            )}
                                            <div className="font-bold text-sm mb-1">{option.name}</div>
                                            {option.description && (
                                              <p className="text-xs text-cream-600 mt-1">
                                                {option.description}
                                              </p>
                                            )}
                                            {option.priceAdd !== undefined && option.priceAdd !== 0 && (
                                              <p className="text-xs text-cream-700 mt-1 font-medium">
                                                {option.priceAdd > 0 ? '+' : ''}₹{typeof option.priceAdd === 'number' ? option.priceAdd.toFixed(2) : parseFloat(option.priceAdd).toFixed(2)} per 1000 units
                                              </p>
                                            )}
                                            {option.image && (
                                              <img
                                                src={option.image}
                                                alt={option.name}
                                                className="w-full h-24 object-cover rounded-lg mt-2"
                                              />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Printing Option - Auto-skip if only one option */}
                                {hasPrintingOption && selectedProduct.filters.printingOption.length > 1 && (
                                  <div className="mb-6 sm:mb-8" data-section="printingOption">
                                    <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Printing Option
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                      {selectedProduct.filters.printingOption.map((option) => {
                                        // Check if filter prices are enabled and get price
                                        const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                        let priceInfo = null;
                                        if (filterPricesEnabled && selectedProduct.filters?.printingOptionPrices) {
                                          const priceData = selectedProduct.filters.printingOptionPrices.find((p: any) => p.name === option);
                                          if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                            priceInfo = priceData.priceAdd;
                                          }
                                        }

                                        return (
                                          <button
                                            key={option}
                                            data-field="printingOption"
                                            onClick={() => setSelectedPrintingOption(option)}
                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${selectedPrintingOption === option
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                              }`}
                                          >
                                            {selectedPrintingOption === option && (
                                              <div className="absolute top-2 right-2">
                                                <Check size={18} className="text-cream-900" />
                                              </div>
                                            )}
                                            <div className="font-bold text-sm">{option}</div>
                                            {priceInfo !== null && (
                                              <div className="text-xs text-cream-600 mt-1">
                                                {priceInfo > 0 ? '+' : ''}₹{Math.abs(priceInfo).toFixed(2)} per 1000 units
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Texture Type (if applicable) - Auto-skip if only one option */}
                                {hasTextureType && selectedProduct.filters.textureType.length > 1 && (
                                  <div className="mb-6 sm:mb-8">
                                    <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Texture Type
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                      {selectedProduct.filters.textureType.map((texture) => {
                                        // Check if filter prices are enabled and get price
                                        const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                        let priceInfo = null;
                                        if (filterPricesEnabled && selectedProduct.filters?.textureTypePrices) {
                                          const priceData = selectedProduct.filters.textureTypePrices.find((p: any) => p.name === texture);
                                          if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                            priceInfo = priceData.priceAdd;
                                          }
                                        }

                                        return (
                                          <button
                                            key={texture}
                                            onClick={() => setSelectedTextureType(texture)}
                                            className={`p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 relative ${selectedTextureType === texture
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                              }`}
                                          >
                                            {selectedTextureType === texture && (
                                              <div className="absolute top-1 right-1">
                                                <Check size={16} className="text-cream-900" />
                                              </div>
                                            )}
                                            <div>{texture}</div>
                                            {priceInfo !== null && (
                                              <div className="text-xs text-cream-600 mt-1">
                                                {priceInfo > 0 ? '+' : ''}₹{Math.abs(priceInfo).toFixed(2)}/1k
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Delivery Speed - Auto-skip if only one option */}
                                {hasDeliverySpeed && selectedProduct.filters.deliverySpeed.length > 1 && (
                                  <div className="mb-6 sm:mb-8" data-section="deliverySpeed">
                                    <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Delivery Speed
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                      {selectedProduct.filters.deliverySpeed.map((speed) => {
                                        // Check if filter prices are enabled and get price
                                        const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                        let priceInfo = null;
                                        if (filterPricesEnabled && selectedProduct.filters?.deliverySpeedPrices) {
                                          const priceData = selectedProduct.filters.deliverySpeedPrices.find((p: any) => p.name === speed);
                                          if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                            priceInfo = priceData.priceAdd;
                                          }
                                        }

                                        return (
                                          <button
                                            key={speed}
                                            data-field="deliverySpeed"
                                            onClick={() => setSelectedDeliverySpeed(speed)}
                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${selectedDeliverySpeed === speed
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                              }`}
                                          >
                                            {selectedDeliverySpeed === speed && (
                                              <div className="absolute top-2 right-2">
                                                <Check size={18} className="text-cream-900" />
                                              </div>
                                            )}
                                            <div className="font-bold text-sm">{speed}</div>
                                            {priceInfo !== null && (
                                              <div className="text-xs text-cream-600 mt-1">
                                                {priceInfo > 0 ? '+' : ''}₹{Math.abs(priceInfo).toFixed(2)} per 1000 units
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Quantity Selection */}
                                <div className="mb-6 sm:mb-8">
                                  <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                    {sectionNum++}. Select Quantity
                                  </label>

                                  <div className="mb-3">
                                    <Select
                                      options={generateQuantities(selectedProduct).map((q) => ({
                                        value: q,
                                        label: q.toLocaleString()
                                      }))}
                                      value={quantity}
                                      onValueChange={(value) => setQuantity(Number(value))}
                                      placeholder="Select quantity"
                                      className="w-full"
                                    />
                                  </div>

                                  {(() => {
                                    const orderQuantity = selectedProduct.filters.orderQuantity;
                                    const quantityType = orderQuantity.quantityType || "SIMPLE";

                                    if (quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
                                      return (
                                        <div className="text-xs sm:text-sm text-cream-600 mb-2">
                                          Available quantities: {orderQuantity.stepWiseQuantities.sort((a, b) => a - b).map(q => q.toLocaleString()).join(", ")}
                                        </div>
                                      );
                                    } else if (quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
                                      return (
                                        <div className="text-xs sm:text-sm text-cream-600 mb-2 space-y-1">
                                          {orderQuantity.rangeWiseQuantities.map((range, idx) => (
                                            <div key={idx}>
                                              {range.label || `${range.min.toLocaleString()}${range.max ? ` - ${range.max.toLocaleString()}` : "+"} units`}
                                              {range.priceMultiplier !== 1.0 && (
                                                <span className="ml-2 text-green-600">
                                                  ({range.priceMultiplier > 1 ? "+" : ""}{((range.priceMultiplier - 1) * 100).toFixed(0)}% price)
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="text-xs sm:text-sm text-cream-600 mb-2">
                                          Min: {orderQuantity.min.toLocaleString()}, Max: {orderQuantity.max.toLocaleString()}, Multiples of: {orderQuantity.multiples.toLocaleString()}
                                        </div>
                                      );
                                    }
                                  })()}
                                  {appliedDiscount !== null && appliedDiscount > 0 && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                      <p className="text-xs sm:text-sm text-green-800 font-medium">
                                        🎉 You're saving {appliedDiscount}% on this order! (Bulk discount applied)
                                      </p>
                                    </div>
                                  )}
                                  {selectedProduct.quantityDiscounts && selectedProduct.quantityDiscounts.length > 0 && (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <p className="text-xs font-medium text-blue-900 mb-2">Available Quantity Discounts:</p>
                                      <div className="space-y-1">
                                        {selectedProduct.quantityDiscounts.map((discount: any, idx: number) => {
                                          const minQty = discount.minQuantity || 0;
                                          const maxQty = discount.maxQuantity;
                                          const discountPct = discount.discountPercentage || 0;
                                          const range = maxQty
                                            ? `${minQty.toLocaleString()} - ${maxQty.toLocaleString()} units`
                                            : `${minQty.toLocaleString()}+ units`;
                                          return (
                                            <p key={idx} className="text-xs text-blue-800">
                                              • {range}: <strong>{discountPct}% off</strong>
                                            </p>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Dynamic Attributes */}
                                {selectedProduct.dynamicAttributes && selectedProduct.dynamicAttributes.length > 0 && (
                                  <>
                                    {selectedProduct.dynamicAttributes
                                      .filter((attr) => attr.isEnabled)
                                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                                      .map((attr) => {
                                        // Handle both populated (object) and unpopulated (string ID) attributeType
                                        let attrType = null;
                                        if (typeof attr.attributeType === 'object' && attr.attributeType !== null) {
                                          attrType = attr.attributeType;
                                        } else if (typeof attr.attributeType === 'string' && attr.attributeType.trim() !== '') {
                                          // If attributeType is just an ID string, we can't display it without fetching
                                          // This shouldn't happen if backend populate is working, but handle gracefully
                                          console.warn(`Attribute type not populated for attribute: ${attr.attributeType}`);
                                          return null;
                                        }

                                        if (!attrType || !attrType._id) {
                                          console.warn('Invalid attributeType:', attr.attributeType);
                                          return null;
                                        }

                                        const attributeValues = attr.customValues && attr.customValues.length > 0
                                          ? attr.customValues
                                          : attrType.attributeValues || [];

                                        // For DROPDOWN, RADIO, and POPUP input styles, we need at least 2 options to display
                                        // For TEXT, NUMBER, FILE_UPLOAD, and other input styles, we can display even with 0 or 1 values
                                        const requiresMultipleOptions = ['DROPDOWN', 'RADIO', 'POPUP'].includes(attrType.inputStyle);

                                        if (requiresMultipleOptions) {
                                          // For dropdown/radio/popup, need at least 2 options
                                          if (attributeValues.length < 2) {
                                            console.warn(`Attribute "${attrType.attributeName}" (${attrType.inputStyle}) requires at least 2 options but only has ${attributeValues.length}`);
                                            return (
                                              <div key={attrType._id} className="mb-6 sm:mb-8 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                                  {sectionNum++}. {attrType.attributeName}
                                                  {attr.isRequired && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                <p className="text-sm text-yellow-800">
                                                  This attribute is not available because it requires at least 2 options. Please contact support.
                                                </p>
                                              </div>
                                            );
                                          }
                                        } else {
                                          // For other input types (TEXT, NUMBER, FILE_UPLOAD), can display even with 0 values
                                          // They don't need pre-defined options
                                        }

                                        return (
                                          <div key={attrType._id} className="mb-6 sm:mb-8">
                                            <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                              {sectionNum++}. {attrType.attributeName}
                                              {attr.isRequired && <span className="text-red-500 ml-1">*</span>}
                                            </label>

                                            {(attrType.inputStyle === 'DROPDOWN' || attrType.inputStyle === 'POPUP') && (
                                              <div data-attribute={attrType._id} data-attribute-name={attrType.attributeName}>
                                                {attributeValues.length === 0 ? (
                                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <p className="text-sm text-yellow-800">
                                                      No options available for this attribute. Please contact support.
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <Select
                                                    options={attributeValues
                                                      .filter((av: any) => av && av.value && av.label) // Filter out invalid options
                                                      .map((av: any) => ({
                                                        value: av.value,
                                                        label: `${av.label}${av.priceMultiplier && av.priceMultiplier !== 1 && selectedProduct ? ` (+₹${((selectedProduct.basePrice || 0) * (av.priceMultiplier - 1)).toFixed(2)}/unit)` : ''}`
                                                      }))}
                                                    value={selectedDynamicAttributes[attrType._id] as string || ""}
                                                    onValueChange={(value) => {
                                                      setSelectedDynamicAttributes({
                                                        ...selectedDynamicAttributes,
                                                        [attrType._id]: value
                                                      });
                                                      // Mark this attribute as user-selected for image updates
                                                      setUserSelectedAttributes(prev => new Set(prev).add(attrType._id));
                                                    }}
                                                    placeholder={`Select ${attrType.attributeName}`}
                                                    className="w-full"
                                                  />
                                                )}
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'RADIO' && (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" data-attribute={attrType._id}>
                                                {attributeValues.length === 0 ? (
                                                  <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <p className="text-sm text-yellow-800">
                                                      No options available for this attribute. Please contact support.
                                                    </p>
                                                  </div>
                                                ) : (
                                                  attributeValues
                                                    .filter((av: any) => av && av.value && av.label) // Filter out invalid options
                                                    .map((av: any) => {
                                                      // Format price display as per unit price
                                                      const getPriceDisplay = () => {
                                                        if (!av.priceMultiplier || av.priceMultiplier === 1 || !selectedProduct) return null;
                                                        const basePrice = selectedProduct.basePrice || 0;
                                                        const pricePerUnit = basePrice * (av.priceMultiplier - 1);
                                                        if (Math.abs(pricePerUnit) < 0.01) return null;
                                                        return `+₹${pricePerUnit.toFixed(2)}/unit`;
                                                      };

                                                      const isSelected = selectedDynamicAttributes[attrType._id] === av.value;

                                                      return (
                                                        <button
                                                          key={av.value}
                                                          onClick={() => {
                                                            setSelectedDynamicAttributes({
                                                              ...selectedDynamicAttributes,
                                                              [attrType._id]: av.value
                                                            });
                                                            // Mark this attribute as user-selected for image updates
                                                            setUserSelectedAttributes(prev => new Set(prev).add(attrType._id));
                                                          }}
                                                          className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${isSelected
                                                              ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                              : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                                            }`}
                                                        >
                                                          {isSelected && (
                                                            <div className="absolute top-2 right-2">
                                                              <Check size={18} className="text-cream-900" />
                                                            </div>
                                                          )}
                                                          {av.image && (
                                                            <div className="mb-2">
                                                              <img
                                                                src={av.image}
                                                                alt={av.label}
                                                                className="w-full h-32 object-cover rounded-lg border border-cream-200"
                                                              />
                                                            </div>
                                                          )}
                                                          <div className="font-bold text-sm">{av.label}</div>
                                                          {getPriceDisplay() && (
                                                            <div className="text-xs text-cream-600 mt-1">
                                                              {getPriceDisplay()}
                                                            </div>
                                                          )}
                                                        </button>
                                                      );
                                                    })
                                                )}
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'CHECKBOX' && (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" data-attribute={attrType._id}>
                                                {attributeValues.length === 0 ? (
                                                  <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <p className="text-sm text-yellow-800">
                                                      No options available for this attribute. Please contact support.
                                                    </p>
                                                  </div>
                                                ) : (
                                                  attributeValues
                                                    .filter((av: any) => av && av.value && av.label) // Filter out invalid options
                                                    .map((av: any) => {
                                                      // Format price display as per unit price
                                                      const getPriceDisplay = () => {
                                                        if (!av.priceMultiplier || av.priceMultiplier === 1 || !selectedProduct) return null;
                                                        const basePrice = selectedProduct.basePrice || 0;
                                                        const pricePerUnit = basePrice * (av.priceMultiplier - 1);
                                                        if (Math.abs(pricePerUnit) < 0.01) return null;
                                                        return `+₹${pricePerUnit.toFixed(2)}/unit`;
                                                      };

                                                      const isSelected = Array.isArray(selectedDynamicAttributes[attrType._id]) && (selectedDynamicAttributes[attrType._id] as any).includes(av.value);

                                                      return (
                                                        <button
                                                          key={av.value}
                                                          type="button"
                                                          onClick={() => {
                                                            const current = Array.isArray(selectedDynamicAttributes[attrType._id]) ? (selectedDynamicAttributes[attrType._id] as any) : [];
                                                            const newValue = isSelected
                                                              ? current.filter((v: any) => v !== av.value)
                                                              : [...current, av.value];
                                                            setSelectedDynamicAttributes({
                                                              ...selectedDynamicAttributes,
                                                              [attrType._id]: newValue
                                                            });
                                                            // Mark this attribute as user-selected for image updates
                                                            setUserSelectedAttributes(prev => new Set(prev).add(attrType._id));
                                                          }}
                                                          className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${isSelected
                                                              ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                              : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                                            }`}
                                                        >
                                                          {isSelected && (
                                                            <div className="absolute top-2 right-2">
                                                              <Check size={18} className="text-cream-900" />
                                                            </div>
                                                          )}
                                                          {av.image && (
                                                            <div className="mb-2">
                                                              <img
                                                                src={av.image}
                                                                alt={av.label}
                                                                className="w-full h-32 object-cover rounded-lg border border-cream-200"
                                                              />
                                                            </div>
                                                          )}
                                                          <div className="font-bold text-sm">{av.label}</div>
                                                          {getPriceDisplay() && (
                                                            <div className="text-xs text-cream-600 mt-1">
                                                              {getPriceDisplay()}
                                                            </div>
                                                          )}
                                                        </button>
                                                      );
                                                    })
                                                )}
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'TEXT_FIELD' && (
                                              <div data-attribute={attrType._id}>
                                                <input
                                                  type="text"
                                                  value={(selectedDynamicAttributes[attrType._id] as string) || ""}
                                                  onChange={(e) => {
                                                    setSelectedDynamicAttributes({
                                                      ...selectedDynamicAttributes,
                                                      [attrType._id]: e.target.value
                                                    });
                                                    // Mark this attribute as user-selected for image updates
                                                    setUserSelectedAttributes(prev => new Set(prev).add(attrType._id));
                                                  }}
                                                  placeholder={`Enter ${attrType.attributeName}`}
                                                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                                                />
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'NUMBER' && (
                                              <div data-attribute={attrType._id}>
                                                <input
                                                  type="number"
                                                  value={(selectedDynamicAttributes[attrType._id] as number) || ""}
                                                  onChange={(e) => {
                                                    setSelectedDynamicAttributes({
                                                      ...selectedDynamicAttributes,
                                                      [attrType._id]: parseFloat(e.target.value) || 0
                                                    });
                                                    // Mark this attribute as user-selected for image updates
                                                    setUserSelectedAttributes(prev => new Set(prev).add(attrType._id));
                                                  }}
                                                  placeholder={`Enter ${attrType.attributeName}`}
                                                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                                                />
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'FILE_UPLOAD' && (
                                              <div data-attribute={attrType._id}>
                                                <input
                                                  type="file"
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    setSelectedDynamicAttributes({
                                                      ...selectedDynamicAttributes,
                                                      [attrType._id]: file
                                                    });
                                                    // Mark this attribute as user-selected for image updates
                                                    if (file) {
                                                      setUserSelectedAttributes(prev => new Set(prev).add(attrType._id));
                                                    }
                                                  }}
                                                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                                                  accept="*/*"
                                                />
                                                {attrType.fileRequirements && (
                                                  <p className="text-xs text-cream-600 mt-1">{attrType.fileRequirements}</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </>
                                )}

                              </>
                            );
                          })()}

                          {/* Delivery information removed - will be shown at checkout only */}

                          {/* Upload Design Section */}
                          <div className="mb-6 sm:mb-8 bg-cream-50 p-4 sm:p-6 rounded-xl border border-cream-200" data-upload-section>
                            <h3 className="font-bold text-sm sm:text-base text-cream-900 mb-3 sm:mb-4 flex items-center gap-2">
                              <UploadIcon size={16} className="sm:w-[18px] sm:h-[18px]" /> Upload Your Design
                            </h3>

                            <div className="mb-4">
                              <label className="block text-sm text-cream-700 mb-2">Upload Reference Image *</label>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleDesignFileChange(e, "front")}
                                  className="hidden"
                                  data-required-field
                                />
                                <div className="border-2 border-dashed border-cream-300 rounded-lg p-4 text-center hover:border-cream-900 transition-colors">
                                  {frontDesignPreview ? (
                                    <div className="relative">
                                      <img
                                        src={frontDesignPreview}
                                        alt="Reference image preview"
                                        className="max-h-32 mx-auto rounded"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setFrontDesignFile(null);
                                          setFrontDesignPreview("");
                                        }}
                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <FileImage size={24} className="text-cream-600" />
                                      <span className="text-sm text-cream-600">Click to upload reference image</span>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm text-cream-700 mb-2">Back Design (Optional)</label>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleDesignFileChange(e, "back")}
                                  className="hidden"
                                />
                                <div className="border-2 border-dashed border-cream-300 rounded-lg p-4 text-center hover:border-cream-900 transition-colors">
                                  {backDesignPreview ? (
                                    <div className="relative">
                                      <img
                                        src={backDesignPreview}
                                        alt="Back design preview"
                                        className="max-h-32 mx-auto rounded"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setBackDesignFile(null);
                                          setBackDesignPreview("");
                                        }}
                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <FileImage size={24} className="text-cream-600" />
                                      <span className="text-sm text-cream-600">Click to upload back design</span>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm text-cream-700 mb-2">Additional Notes (Optional)</label>
                              <textarea
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                                placeholder="Any special instructions or notes..."
                                className="w-full p-3 rounded-lg border border-cream-300 focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none text-sm resize-none"
                                rows={3}
                              />
                            </div>
                          </div>

                        </div>

                        {/* Detailed Price Breakdown - Before Place Order */}
                        <div className="mt-6 p-4 sm:p-6 bg-cream-50 rounded-xl border border-cream-200">
                          <h3 className="text-lg font-bold text-cream-900 mb-4 flex items-center gap-2">
                            <CreditCard size={20} />
                            Order Summary
                          </h3>
                          <div className="space-y-3">
                            {/* Base Price */}
                            <div className="flex justify-between text-sm">
                              <span className="text-cream-600">Base Price ({quantity.toLocaleString()} units):</span>
                              <span className="text-cream-900 font-medium">₹{(selectedProduct.basePrice * quantity).toFixed(2)}</span>
                            </div>

                            {/* Product Options Charges */}
                            {productOptionsCharge !== 0 && selectedProductOptions.length > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-cream-600">Product Options ({selectedProductOptions.join(", ")}):</span>
                                <span className="text-cream-900 font-medium">
                                  {productOptionsCharge > 0 ? `+₹${productOptionsCharge.toFixed(2)}` : `₹${productOptionsCharge.toFixed(2)}`}
                                </span>
                              </div>
                            )}

                            {/* Printing Option Charge */}
                            {printingOptionCharge !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-cream-600">Printing Option ({selectedPrintingOption}):</span>
                                <span className="text-cream-900 font-medium">
                                  {printingOptionCharge > 0 ? `+₹${printingOptionCharge.toFixed(2)}` : printingOptionCharge < 0 ? `₹${printingOptionCharge.toFixed(2)}` : "Included"}
                                </span>
                              </div>
                            )}

                            {/* Delivery Speed Charge */}
                            {deliverySpeedCharge !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-cream-600">Delivery Speed ({selectedDeliverySpeed}):</span>
                                <span className="text-cream-900 font-medium">
                                  {deliverySpeedCharge > 0 ? `+₹${deliverySpeedCharge.toFixed(2)}` : deliverySpeedCharge < 0 ? `₹${deliverySpeedCharge.toFixed(2)}` : "Included"}
                                </span>
                              </div>
                            )}

                            {/* Texture Type Charge */}
                            {textureTypeCharge !== 0 && selectedTextureType && (
                              <div className="flex justify-between text-sm">
                                <span className="text-cream-600">Texture Type ({selectedTextureType}):</span>
                                <span className="text-cream-900 font-medium">
                                  {textureTypeCharge > 0 ? `+₹${textureTypeCharge.toFixed(2)}` : textureTypeCharge < 0 ? `₹${textureTypeCharge.toFixed(2)}` : "Included"}
                                </span>
                              </div>
                            )}

                            {/* Dynamic Attributes Charges */}
                            {dynamicAttributesCharges.map((attrCharge, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-cream-600">{attrCharge.name} ({attrCharge.label}):</span>
                                <span className="text-cream-900 font-medium">
                                  {attrCharge.charge > 0 ? `+₹${attrCharge.charge.toFixed(2)}` : `₹${attrCharge.charge.toFixed(2)}`}
                                </span>
                              </div>
                            ))}

                            {/* Subtotal Before Discount */}
                            {baseSubtotalBeforeDiscount !== subtotal && (
                              <div className="flex justify-between text-sm text-cream-600 pt-2 border-t border-cream-200">
                                <span>Subtotal (before discount):</span>
                                <span>₹{baseSubtotalBeforeDiscount.toFixed(2)}</span>
                              </div>
                            )}

                            {/* Quantity Discount */}
                            {appliedDiscount !== null && appliedDiscount > 0 && (
                              <div className="flex justify-between text-sm text-green-700">
                                <span>Quantity Discount ({appliedDiscount}%):</span>
                                <span className="font-medium">-₹{Math.abs(baseSubtotalBeforeDiscount - subtotal).toFixed(2)}</span>
                              </div>
                            )}

                            {/* Subtotal */}
                            <div className="flex justify-between pt-2 border-t border-cream-300">
                              <span className="text-cream-700 font-medium">Subtotal:</span>
                              <span className="text-cream-900 font-bold">₹{subtotal.toFixed(2)}</span>
                            </div>

                            {/* Additional Design Charge */}
                            {additionalDesignCharge !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-cream-600">Additional Design Charge:</span>
                                <span className="text-cream-900 font-medium">₹{additionalDesignCharge.toFixed(2)}</span>
                              </div>
                            )}

                            {/* Total */}
                            <div className="flex justify-between pt-3 border-t-2 border-cream-400 mt-2">
                              <span className="text-lg font-bold text-cream-900">
                                Total {selectedProduct?.showPriceIncludingGst ? '(Including GST)' : '(Excluding GST)'}:
                              </span>
                              <span className="text-2xl font-bold text-cream-900">
                                {(() => {
                                  const showIncludingGst = selectedProduct?.showPriceIncludingGst || false;
                                  if (showIncludingGst) {
                                    return `₹${(price + gstAmount).toFixed(2)}`;
                                  }
                                  return `₹${price.toFixed(2)}`;
                                })()}
                              </span>
                            </div>
                            {!selectedProduct?.showPriceIncludingGst && (
                              <p className="text-xs text-cream-500 mt-1 text-right">
                                GST will be added at checkout
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Place Order Button - Fixed at bottom */}
                        <div className="mt-4 pt-4 border-t border-cream-100">
                          <button
                            onClick={handlePlaceOrder}
                            disabled={isProcessingPayment}
                            className={`w-full py-4 sm:py-5 md:py-6 rounded-xl font-bold text-lg sm:text-xl md:text-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 min-h-[60px] sm:min-h-[70px] ${isProcessingPayment
                                ? 'bg-cream-400 text-cream-700 cursor-not-allowed opacity-60'
                                : 'bg-cream-900 text-cream-50 hover:bg-cream-800 active:bg-cream-700 cursor-pointer opacity-100'
                              }`}
                          >
                            {isProcessingPayment ? (
                              <>
                                <Loader className="animate-spin" size={24} />
                                <span>Processing Payment...</span>
                              </>
                            ) : (
                              <>
                                <Check size={24} />
                                <span>Place Order</span>
                              </>
                            )}
                          </button>

                          <div className="mt-4 text-center text-xs text-cream-500 flex items-center justify-center gap-2">
                            <CreditCard size={14} /> Secure Payment & Data Protection
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
              data-payment-modal
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-cream-900 flex items-center gap-2">
                  <CreditCard size={20} className="sm:w-6 sm:h-6" />
                  <span className="text-base sm:text-xl">Payment Confirmation</span>
                </h3>
                {!isProcessingPayment && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-cream-600 hover:text-cream-900"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>

              <div className="mb-6">
                <div className="bg-cream-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-cream-700 font-medium">Subtotal (Excluding GST):</span>
                      <span className="text-lg font-bold text-cream-900">₹{price.toFixed(2)}</span>
                    </div>
                    {gstAmount > 0 && (
                      <>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-cream-600">GST ({selectedProduct?.gstPercentage || 18}%):</span>
                          <span className="text-cream-700">+₹{gstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-cream-300">
                          <span className="text-cream-700 font-medium">Total Amount (Including GST):</span>
                          <span className="text-2xl font-bold text-cream-900">₹{(price + gstAmount).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-cream-600 mt-2">
                    Your order will be placed and you can pay later.
                  </p>
                </div>

                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{paymentError}</p>
                  </div>
                )}

                {/* Delivery Information Form */}
                <div className="mb-6 space-y-4">
                  <h4 className="font-semibold text-cream-900 text-sm mb-3 flex items-center gap-2">
                    <Truck size={18} />
                    Delivery Information
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      id="customerName"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter your full name"
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      id="customerEmail"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter your email address"
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      id="pincode"
                      value={pincode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPincode(value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter 6-digit pincode"
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none text-sm"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                      Complete Address <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        name="address"
                        id="address"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (paymentError) setPaymentError(null);
                        }}
                        placeholder="Enter your complete delivery address"
                        rows={3}
                        className="flex-1 px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none text-sm resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="px-3 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Get location automatically"
                      >
                        {isGettingLocation ? (
                          <Loader className="animate-spin" size={18} />
                        ) : (
                          <MapPin size={18} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-cream-500 mt-1">You can enter address manually or use location button</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="mobileNumber"
                      id="mobileNumber"
                      value={mobileNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMobileNumber(value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none text-sm"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm text-cream-700">
                  <p className="font-semibold mb-2">Order Summary:</p>
                  <div className="space-y-1 ml-4">
                    <p>• Product: <strong>{selectedProduct?.name}</strong></p>
                    <p>• Quantity: <strong>{quantity.toLocaleString()}</strong></p>
                    <p>• Printing Option: <strong>{selectedPrintingOption}</strong></p>
                    <p>• Delivery Speed: <strong>{selectedDeliverySpeed}</strong></p>
                    {selectedTextureType && (
                      <p>• Texture Type: <strong>{selectedTextureType}</strong></p>
                    )}
                  </div>
                </div>

                {/* Estimated Delivery Information - Show at checkout */}
                {estimatedDeliveryDate && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-bold text-sm text-cream-900 mb-2 flex items-center gap-2">
                      <Truck size={16} /> Estimated Delivery
                    </h3>
                    <div className="text-green-700 text-sm">
                      <div className="font-semibold mb-1">Estimated Delivery by <strong>{estimatedDeliveryDate}</strong></div>
                      {deliveryLocationSource && (
                        <div className="text-xs text-green-600 mt-1">
                          {deliveryLocationSource}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {!isProcessingPayment && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 border border-cream-300 text-cream-700 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handlePaymentAndOrder}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-3 bg-cream-900 text-cream-50 rounded-lg font-semibold hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Confirm Order ₹{(price + gstAmount).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Size Image Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  width: 'auto',
                  height: 'auto',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={selectedSubCategory?.image || "/Glossy.png"}
                  alt={selectedSubCategory?.name || "Product Preview"}
                  className="w-full h-full object-contain"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    width: 'auto',
                    height: 'auto',
                  }}
                />
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-sm transition-colors z-50"
                aria-label="Close image"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlossProductSelection;

