import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader, Search, X } from 'lucide-react';
import GlossProductSelection from './GlossProductSelection';
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import BackButton from '../components/BackButton';

interface SubCategory {
  _id: string;
  name: string;
  description: string;
  image?: string;
  slug?: string;
  sortOrder?: number;
  category?: {
    _id: string;
    name: string;
    description?: string;
  };
}

interface Product {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  image?: string;
  subcategory?: SubCategory | string;
}

const VisitingCards: React.FC = () => {
  const { categoryId, subCategoryId } = useParams<{ categoryId?: string; subCategoryId?: string }>();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGlossFinish, setIsGlossFinish] = useState(false);
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState<string>("");
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string | null>(null);

  // Helper function to handle ngrok responses (same as AdminDashboard)
  // Fixed: Clone response before reading to prevent "body stream already read" error
  const handleNgrokResponse = async (response: Response) => {
    // Clone the response to avoid "body stream already read" error
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();
    
    // Check if response is HTML (could be error page or ngrok warning)
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      // Check if it's specifically an ngrok warning
      if (text.includes("ngrok") || text.includes("Ngrok")) {
        throw new Error("Ngrok blocked request. Please try again or check your Ngrok configuration.");
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

  // Fetch subcategories or products based on URL params
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // If categoryId is provided but no subCategoryId, check if category has child categories
        if (categoryId && !subCategoryId) {
          // Reset states first
          setSubCategories([]);
          setProducts([]);
          
          // Validate categoryId format
          if (!/^[0-9a-fA-F]{24}$/.test(categoryId)) {
            setError("Invalid category ID format");
            setLoading(false);
            return;
          }
          
          // Variable to track subcategories for later use
          let subcategoriesArray: SubCategory[] = [];
          
          // First check if this category has subcategories
          const subcategoriesUrl = `${API_BASE_URL}/subcategories/category/${categoryId}`;
          
          try {
            const subcategoriesResponse = await fetch(subcategoriesUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (!subcategoriesResponse.ok) {
              // If 404 or not found, subcategories don't exist - continue to check for products
              if (subcategoriesResponse.status === 404) {
                console.log("No subcategories found for this category, checking for direct products...");
                // Don't throw error, just continue to check for products below
                // Skip reading response body for 404 to avoid "body stream already read" error
              } else {
                // Try fallback to old endpoint for backward compatibility
                const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });
                
                if (fallbackResponse.ok) {
                  const fallbackData = await handleNgrokResponse(fallbackResponse);
                  if (fallbackData && Array.isArray(fallbackData) && fallbackData.length > 0) {
                    // Process fallback data
                    subcategoriesArray = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);
                    if (subcategoriesArray.length > 0) {
                      // Sort by sortOrder
                      subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));
                      // Auto-skip: If only one subcategory, directly navigate to its products page
                      if (subcategoriesArray.length === 1) {
                        const singleSubcategory = subcategoriesArray[0];
                        const subCategoryIdForLink = singleSubcategory.slug || singleSubcategory._id;
                        navigate(categoryId 
                          ? `/digital-print/${categoryId}/${subCategoryIdForLink}` 
                          : `/digital-print/${subCategoryIdForLink}`, 
                          { replace: true }
                        );
                        setLoading(false);
                        return;
                      }
                      setSubCategories(subcategoriesArray);
                      setLoading(false);
                      return;
                    }
                  }
                }
                // If fallback also fails, continue to check for products (don't throw error)
                console.log("No subcategories found, will check for direct products...");
              }
            } else {
              // Only read response body if response is OK
              const subcategoriesData = await handleNgrokResponse(subcategoriesResponse);
              
              // Ensure subcategoriesData is an array
              subcategoriesArray = Array.isArray(subcategoriesData) 
                ? subcategoriesData 
                : (subcategoriesData?.data || []);
              
              // If category has subcategories, check if auto-skip is needed
              if (subcategoriesArray && subcategoriesArray.length > 0) {
                // Sort by sortOrder to maintain the order set in admin dashboard
                subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));
                
                // Auto-skip: If only one subcategory, directly navigate to its products page
                if (subcategoriesArray.length === 1) {
                  const singleSubcategory = subcategoriesArray[0];
                  const subCategoryIdForLink = singleSubcategory.slug || singleSubcategory._id;
                  
                  // Navigate directly to the products page for this single subcategory
                  navigate(categoryId 
                    ? `/digital-print/${categoryId}/${subCategoryIdForLink}` 
                    : `/digital-print/${subCategoryIdForLink}`, 
                    { replace: true }
                  );
                  setLoading(false);
                  return;
                }
                
                // Multiple subcategories - show them normally
                setSubCategories(subcategoriesArray);
                
                // Get category info
                try {
                  const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });
                  
                  if (!categoryResponse.ok) {
                    throw new Error(`Failed to fetch category: ${categoryResponse.status} ${categoryResponse.statusText}`);
                  }

                  const categoryData = await handleNgrokResponse(categoryResponse);
                  setCategoryName(categoryData.name || '');
                  setCategoryDescription(categoryData.description || '');
                } catch (categoryErr) {
                  console.error("Error fetching category info:", categoryErr);
                  // Don't fail the whole operation if category info fetch fails
                }
                
                // Note: Even if subcategories exist, we'll check for direct products below
                // But for now, prioritize showing subcategories
                // setLoading(false);
                // return; // Don't return here - continue to check for direct products
              }
            }
          } catch (fetchErr) {
            console.error("Error fetching subcategories:", fetchErr);
            // Don't set error here, just log it - continue to check for products
            // The error might be that there are no subcategories, which is fine
          }

          // Check for products directly under this category (without subcategory)
          // This handles both cases:
          // 1. Category has subcategories → show subcategories (already set above)
          // 2. Category has no subcategories but has direct products → show products
          try {
            // Validate categoryId before making request
            if (!categoryId || !/^[0-9a-fA-F]{24}$/.test(categoryId)) {
              console.warn("Invalid categoryId format, skipping product fetch:", categoryId);
              // Don't throw error, just skip product fetch and show empty state
              setLoading(false);
              return;
            }
            
            const productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
            const productsResponse = await fetch(productsUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (!productsResponse.ok) {
              // Handle 400 Bad Request and 404 Not Found - both mean no products available
              if (productsResponse.status === 400 || productsResponse.status === 404) {
                // Try to get error message without reading body twice
                let errorMessage = productsResponse.status === 404 
                  ? "Category not found" 
                  : "Invalid category ID or category not found";
                try {
                  // Clone response to read error message
                  const clonedResponse = productsResponse.clone();
                  const errorText = await clonedResponse.text();
                  if (errorText && !errorText.trim().startsWith("<!DOCTYPE") && !errorText.trim().startsWith("<html")) {
                    try {
                      const errorData = JSON.parse(errorText);
                      errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (e) {
                      // If not JSON, use the text if it's meaningful
                      if (errorText.trim().length > 0 && errorText.trim().length < 200) {
                        errorMessage = errorText.trim();
                      }
                    }
                  }
                } catch (e) {
                  // If we can't read the error, use default message
                  console.error("Error reading response:", e);
                }
                // For 400/404 errors, don't throw - just log and continue (category might not exist or have products)
                console.warn("Failed to fetch products for category:", categoryId, errorMessage);
                setProducts([]);
                setLoading(false);
                return;
              }
              
              // For other errors (500, etc.), log and continue gracefully
              console.error("Error fetching products:", productsResponse.status, productsResponse.statusText);
              setProducts([]);
              setLoading(false);
              return;
            }

            const productsData = await handleNgrokResponse(productsResponse);
            
            // Filter to only include products directly added to category (without subcategory)
            const directProducts = Array.isArray(productsData) 
              ? productsData.filter((product: Product) => {
                  // A direct product should have category matching categoryId and no valid subcategory
                  // First check if product's category matches (convert both to strings for comparison)
                  const productCategoryId = typeof product.category === 'object' 
                    ? (product.category?._id ? String(product.category._id) : null)
                    : (product.category ? String(product.category) : null);
                  
                  const categoryIdStr = String(categoryId);
                  
                  // Only include products that belong to this category
                  if (!productCategoryId || productCategoryId !== categoryIdStr) {
                    return false;
                  }
                  
                  // Now check if it has a valid subcategory
                  // Product should not have a subcategory
                  if (!product.subcategory) return true;
                  if (product.subcategory === null) return true;
                  if (product.subcategory === undefined) return true;
                  if (typeof product.subcategory === 'string') {
                    const subcatStr = product.subcategory.trim();
                    if (subcatStr === '' || subcatStr === 'null' || subcatStr === 'undefined') return true;
                    return false; // Has a non-empty string subcategory
                  }
                  
                  // If it's an object, check if it's actually empty or has no valid ID
                  if (typeof product.subcategory === 'object') {
                    // If it's an empty object, treat as no subcategory
                    const keys = Object.keys(product.subcategory);
                    if (keys.length === 0) return true;
                    
                    // Check if _id exists and is valid
                    const subcategoryId = product.subcategory._id;
                    if (!subcategoryId) return true; // No _id means no valid subcategory
                    if (subcategoryId === null || subcategoryId === '' || subcategoryId === 'null' || subcategoryId === undefined) return true;
                    
                    // Check if it's a valid MongoDB ObjectId (24 hex characters)
                    if (typeof subcategoryId === 'string' && !/^[0-9a-fA-F]{24}$/.test(subcategoryId)) return true;
                    
                    // Has a valid subcategory with valid _id, exclude it
                    return false;
                  }
                  
                  // Any other case, exclude (has subcategory)
                  return false;
                })
              : [];
            
            // Debug logging
            console.log("Category ID:", categoryId);
            console.log("Total products fetched:", Array.isArray(productsData) ? productsData.length : 0);
            console.log("Direct products after filtering:", directProducts.length);
            if (directProducts.length === 0 && Array.isArray(productsData) && productsData.length > 0) {
              console.log("Sample product category:", productsData[0]?.category);
              console.log("Sample product subcategory:", productsData[0]?.subcategory);
              console.log("Sample product category ID (string):", typeof productsData[0]?.category === 'object' 
                ? String(productsData[0]?.category?._id) 
                : String(productsData[0]?.category));
            }
            
            // Determine if category has subcategories
            const hasSubcategories = subcategoriesArray && subcategoriesArray.length > 0;
            
            // AUTO-SKIP: If only one subcategory, navigate directly to its products
            if (hasSubcategories && subcategoriesArray.length === 1) {
              const singleSubcategory = subcategoriesArray[0];
              const subcategoryIdForLink = singleSubcategory.slug || singleSubcategory._id;
              
              // Navigate directly to subcategory products page
              if (categoryId) {
                navigate(`/digital-print/${categoryId}/${subcategoryIdForLink}`, { replace: true });
              } else {
                navigate(`/digital-print/${subcategoryIdForLink}`, { replace: true });
              }
              setLoading(false);
              return;
            }
            
            // Set subcategories if they exist (multiple subcategories)
            if (hasSubcategories) {
              // Sort by sortOrder to maintain the order set in admin dashboard
              subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));
              setSubCategories(subcategoriesArray);
            } else {
              setSubCategories([]);
            }
            
            // Set direct products if they exist (only when no subcategories)
            if (directProducts && directProducts.length > 0 && !hasSubcategories) {
              // Auto-skip: If only one product and no subcategories, directly navigate to its detail page
              if (directProducts.length === 1) {
                const singleProduct = directProducts[0];
                
                // Navigate directly to the product detail page
                if (categoryId) {
                  navigate(`/digital-print/${categoryId}/${singleProduct._id}`, { replace: true });
                } else {
                  navigate(`/digital-print/${singleProduct._id}`, { replace: true });
                }
                setLoading(false);
                return;
              }
              
              // Multiple products - show them normally
              setProducts(directProducts);
              
              // Get category info
              try {
                const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });
                
                if (!categoryResponse.ok) {
                  throw new Error(`Failed to fetch category: ${categoryResponse.status} ${categoryResponse.statusText}`);
                }

                const categoryData = await handleNgrokResponse(categoryResponse);
                setCategoryName(categoryData.name || '');
                setCategoryDescription(categoryData.description || '');
              } catch (categoryErr) {
                console.error("Error fetching category info:", categoryErr);
                // Don't fail the whole operation if category info fetch fails
              }
              
              setLoading(false);
              return;
            }
          } catch (productsErr) {
            console.error("Error fetching products:", productsErr);
            
            // Don't set error for 400 Bad Request - it might just mean category has no products or invalid ID
            const errorMessage = productsErr instanceof Error ? productsErr.message : "Failed to fetch products";
            if (!errorMessage.includes("Invalid category") && !errorMessage.includes("400") && !errorMessage.includes("Bad Request")) {
              // Only set error for non-400 errors
              setError(errorMessage);
            } else {
              // For 400 errors, just log and continue - category might not have products
              console.warn("Category may not have products or category ID is invalid:", categoryId);
            }
            
            // Set empty products array and continue
            setProducts([]);
          }
          
          // If no subcategories and no products, show empty state
          // Still get category info for display
          try {
            if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
              const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });
              
              if (categoryResponse.ok) {
                const categoryData = await handleNgrokResponse(categoryResponse);
                setCategoryName(categoryData.name || '');
                setCategoryDescription(categoryData.description || '');
              }
            }
          } catch (categoryErr) {
            console.error("Error fetching category info:", categoryErr);
          }
          
          setLoading(false);
          return;
        }

        // If subCategoryId is provided, fetch products for that subcategory
        if (subCategoryId) {
          // Reset states
          setProducts([]);
          setSubCategories([]);
          
          try {
            // First, get subcategory info to get the _id (in case subCategoryId is a slug)
            let subcategoryData: SubCategory | null = null;
            let subcategoryIdForProducts = subCategoryId;
            
            // Check if subCategoryId is a valid MongoDB ObjectId (24 hex characters)
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(subCategoryId);
            
            if (!isObjectId) {
              // If it's not an ObjectId, it's likely a slug - fetch subcategory by slug
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
                const subcategoriesData = await handleNgrokResponse(subcategoriesResponse);
                // Find subcategory by slug or _id
                subcategoryData = subcategoriesData.find(
                  (sc: SubCategory) => sc.slug === subCategoryId || sc._id === subCategoryId
                );
                
                if (subcategoryData && subcategoryData._id) {
                  subcategoryIdForProducts = subcategoryData._id;
                  console.log("Found subcategory by slug, using _id:", subcategoryIdForProducts);
                } else {
                  throw new Error(`Subcategory not found with slug/id: ${subCategoryId}`);
                }
              } else {
                throw new Error(`Failed to fetch subcategories: ${subcategoriesResponse.status}`);
              }
            } else {
              // If it's already an ObjectId, first check category's subcategories list
              // This avoids unnecessary 404 errors when subcategory doesn't exist
              let subcategoriesArray: SubCategory[] = [];
              
              if (categoryId) {
                try {
                  // First, try fetching from subcategories list for the category
                  const subcategoriesUrl = `${API_BASE_URL}/subcategories/category/${categoryId}`;
                  const subcategoriesResponse = await fetch(subcategoriesUrl, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });
                  
                  if (subcategoriesResponse.ok) {
                    const subcategoriesData = await handleNgrokResponse(subcategoriesResponse);
                    subcategoriesArray = Array.isArray(subcategoriesData) ? subcategoriesData : (subcategoriesData?.data || []);
                    subcategoryData = subcategoriesArray.find(
                      (sc: SubCategory) => sc._id === subCategoryId || sc.slug === subCategoryId
                    ) || null;
                  }
                } catch (listErr) {
                  // Silently continue - will try direct fetch or treat as category
                }
              }
              
              // Only try direct fetch if:
              // 1. Not found in category's subcategories list
              // 2. subCategoryId is a valid ObjectId
              // This prevents unnecessary 404 errors
              if (!subcategoryData && subCategoryId && /^[0-9a-fA-F]{24}$/.test(subCategoryId)) {
                // Check if subCategoryId exists in any of the fetched subcategories first
                const foundInList = subcategoriesArray.find(
                  (sc: SubCategory) => sc._id === subCategoryId
                );
                
                if (!foundInList) {
                  // Only fetch if not found in the list
                  try {
                    const subcategoryResponse = await fetch(`${API_BASE_URL}/subcategories/${subCategoryId}`, {
                      method: "GET",
                      headers: {
                        Accept: "application/json",
                      },
                    });
                    
                    if (subcategoryResponse.ok) {
                      try {
                        subcategoryData = await handleNgrokResponse(subcategoryResponse);
                      } catch (parseErr) {
                        // Error parsing response - silently continue
                      }
                    } else if (subcategoryResponse.status === 404) {
                      // Subcategory not found - silently continue, will use category endpoint
                    } else {
                      // Other error status - silently continue
                    }
                  } catch (err) {
                    // Network error or other exception - silently handle
                    // Subcategory doesn't exist, will treat as category
                  }
                } else {
                  // Found in list, use it
                  subcategoryData = foundInList;
                }
              }
            }
            
            // Check if this is "Gloss Finish" subcategory - render GlossProductSelection instead
            if (subcategoryData) {
              const subcategoryName = subcategoryData.name?.toLowerCase() || '';
              const subcategorySlug = subcategoryData.slug?.toLowerCase() || '';
              
              if (subcategoryName.includes('gloss') || subcategorySlug.includes('gloss') || subCategoryId?.toLowerCase().includes('gloss')) {
                setIsGlossFinish(true);
                setSelectedSubCategory(subcategoryData);
                setLoading(false);
                return;
              }
              
              // Set subcategory data - will be set again after products are fetched, but set it here too for early display
              setSelectedSubCategory(subcategoryData);
            }
            
            // Now fetch products using the correct endpoint based on what we have
            // FIRST check if subcategoryData is null - if null, use category endpoint directly
            // If subcategory is found, use /products/subcategory/:subcategoryId
            // If subcategory is NOT found (null), use /products/category/:categoryId
            const baseUrl = API_BASE_URL.replace(/\/+$/, ''); // Remove trailing slashes
            
            let productsUrl: string;
            let productsResponse: Response;
            
            // Priority 1: Check if subcategoryData is null - if null, use category endpoint directly
            if (!subcategoryData || subcategoryData === null) {
              // Subcategory is null - use category endpoint directly
              if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
                productsUrl = `${baseUrl}/products/category/${categoryId}`;
                productsResponse = await fetch(productsUrl, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });
              } else {
                throw new Error("Valid Category ID is required to fetch products when subcategory is null");
              }
            } else if (subcategoryIdForProducts && /^[0-9a-fA-F]{24}$/.test(subcategoryIdForProducts)) {
              // Subcategory exists - use subcategory endpoint
              productsUrl = `${baseUrl}/products/subcategory/${subcategoryIdForProducts}`;
              productsResponse = await fetch(productsUrl, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });
            } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
              // Fallback: No valid subcategoryId but we have a valid categoryId - use category endpoint
              productsUrl = `${baseUrl}/products/category/${categoryId}`;
              productsResponse = await fetch(productsUrl, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });
            } else {
              throw new Error("Valid Subcategory ID or Category ID is required to fetch products");
            }
            
            // Handle 400 Bad Request errors
            if (!productsResponse.ok && productsResponse.status === 400) {
              const errorText = await productsResponse.text();
              let errorMessage = "Invalid subcategory or category ID";
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.message || errorMessage;
              } catch (e) {
                // If not JSON, use default message
              }
              throw new Error(errorMessage);
            }

            let productsData;
            if (!productsResponse.ok) {
              // For 404, don't try to read the response body
              if (productsResponse.status === 404) {
                productsData = [];
              } else {
                // For other errors, try to get error message
                try {
                  const errorData = await handleNgrokResponse(productsResponse);
                  throw new Error(errorData.error || errorData.message || `Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
                } catch (err) {
                  if (err instanceof Error && err.message.includes("body stream")) {
                    // If body already read, just throw a generic error
                    throw new Error(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
                  }
                  throw err;
                }
              }
            } else {
              productsData = await handleNgrokResponse(productsResponse);
            }
            
            // If we used subcategory endpoint but got 0 products, and we have a categoryId,
            // the fallback to category endpoint is already handled above
            // So we don't need additional fallback logic here
            
            // Ensure productsData is always an array
            if (!Array.isArray(productsData)) {
              productsData = [];
            }
            
            // Get category info for display
            if (subcategoryData) {
              setSelectedSubCategory(subcategoryData);
              setCategoryName(subcategoryData.category?.name || subcategoryData.name || '');
              setCategoryDescription(subcategoryData.category?.description || subcategoryData.description || '');
            } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
              // If subcategory data not found, try to get category info (only if categoryId is valid)
              // This handles cases where subcategory doesn't exist but we want to show category products
              try {
                const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });
                if (categoryResponse.ok) {
                  const categoryData = await handleNgrokResponse(categoryResponse);
                  setCategoryName(categoryData.name || '');
                  setCategoryDescription(categoryData.description || '');
                  // If subcategory doesn't exist but we have products, create a mock subcategory for display
                  // This ensures products can be displayed even when subcategory is missing
                  if (Array.isArray(productsData) && productsData.length > 0) {
                    setSelectedSubCategory({
                      _id: subCategoryId || categoryId,
                      name: categoryData.name || 'Products',
                      description: categoryData.description || '',
                      image: categoryData.image || '/Glossy.png',
                      category: categoryData,
                      slug: subCategoryId || categoryId
                    } as SubCategory);
                  }
                }
              } catch (catErr) {
                console.error("Error fetching category info:", catErr);
                // Even if category fetch fails, set a minimal subcategory for display if we have products
                if (Array.isArray(productsData) && productsData.length > 0) {
                  setSelectedSubCategory({
                    _id: subCategoryId || categoryId || '',
                    name: 'Products',
                    description: '',
                    image: '/Glossy.png',
                    slug: subCategoryId || categoryId || ''
                  } as SubCategory);
                }
              }
            }
            
            // Auto-skip: If only one product, directly navigate to its detail page
            if (Array.isArray(productsData) && productsData.length === 1) {
              const singleProduct = productsData[0];
              const productSubcategory = typeof singleProduct.subcategory === "object" 
                ? singleProduct.subcategory 
                : null;
              // Use product's subcategory if valid, otherwise use selected subcategory or category
              const productSubcategoryId = productSubcategory?.slug || productSubcategory?._id || 
                (selectedSubCategory?.slug || selectedSubCategory?._id) || 
                subCategoryId || 
                categoryId;
              
              // Navigate directly to the product detail page
              if (categoryId && productSubcategoryId && productSubcategoryId !== categoryId) {
                navigate(`/digital-print/${categoryId}/${productSubcategoryId}/${singleProduct._id}`, { replace: true });
              } else if (categoryId) {
                navigate(`/digital-print/${categoryId}/${singleProduct._id}`, { replace: true });
              } else {
                navigate(`/digital-print/${singleProduct._id}`, { replace: true });
              }
              setLoading(false);
              return;
            }
            
            // Set products data - ensure it's set even if subcategory doesn't exist
            console.log("Final products data to set:", productsData);
            console.log("Products array length:", Array.isArray(productsData) ? productsData.length : 0);
            setProducts(Array.isArray(productsData) ? productsData : []);
            
            // If we have products but no subcategory data, ensure we have category info for display
            if (Array.isArray(productsData) && productsData.length > 0 && !subcategoryData && categoryId) {
              // Products exist but subcategory doesn't - this is valid, show the products
              console.log("Products found but subcategory data missing - will display products anyway");
            }
            
            setLoading(false);
            return;
          } catch (productsErr) {
            console.error("Error fetching products:", productsErr);
            setError(productsErr instanceof Error ? productsErr.message : "Failed to fetch products");
            setLoading(false);
            return;
          }
        } else {
          // Fetch subcategories for the category
          let url = `${API_BASE_URL}/subcategories`;
          
          if (categoryId) {
            url = `${API_BASE_URL}/subcategories/category/${categoryId}`;
          }

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch subcategories: ${response.status} ${response.statusText}`);
          }

          const data = await handleNgrokResponse(response);
          // Ensure data is an array
          const subcategoriesArray = Array.isArray(data) ? data : (data?.data || []);
          
          if (subcategoriesArray.length > 0) {
            // Sort by sortOrder to maintain the order set in admin dashboard
            subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setSubCategories(subcategoriesArray);
            setProducts([]); // Clear products when showing subcategories

            // Set category name and description from first subcategory if available
            if (subcategoriesArray[0].category) {
              const categoryInfo = typeof subcategoriesArray[0].category === 'object' 
                ? subcategoriesArray[0].category 
                : null;
              if (categoryInfo) {
                setCategoryName(categoryInfo.name || '');
                setCategoryDescription(categoryInfo.description || '');
              }
            }
          } else {
            // No subcategories found, clear state
            setSubCategories([]);
            setProducts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, subCategoryId]);

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
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  // If this is Gloss Finish subcategory, render GlossProductSelection instead
  if (isGlossFinish && categoryId) {
    return <GlossProductSelection />;
  }

  return (
    <div className="min-h-screen bg-cream-50 py-4 sm:py-8">
      
      {/* Header with Breadcrumb - Only show when viewing subcategories, not products */}
      {!subCategoryId && (
        <div className="bg-white border-b border-cream-200 pb-6 sm:pb-10 pt-6 sm:pt-8 mb-6 sm:mb-8 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col gap-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm font-medium text-cream-500 uppercase tracking-widest">
                <Link to="/digital-print" className="hover:text-cream-900 transition-colors">Services</Link>
                <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5" />
                <span className="text-cream-900">{categoryName}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-cream-900">
                {categoryName}
              </h1>
              {categoryDescription && (
                <p className="text-sm sm:text-base text-cream-600 mt-2 max-w-xl mx-auto md:mx-0">
                  Choose the perfect paper type and finish for your brand identity.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-cream-900" size={48} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        ) : (subCategories.length > 0 && !subCategoryId) || (products.length > 0 && subCategories.length === 0 && !subCategoryId) ? (
          <>
            {/* Subcategory Filters */}
            <div className="mb-6 bg-white rounded-xl shadow-md border border-cream-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                {/* Subcategory Search Bar */}
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search subcategories..."
                    value={subCategorySearchQuery}
                    onChange={(e) => setSubCategorySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 text-sm sm:text-base bg-white shadow-sm transition-all"
                  />
                  {subCategorySearchQuery && (
                    <button
                      onClick={() => setSubCategorySearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cream-500 hover:text-cream-700 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Subcategory Dropdown */}
                <div className="flex-1 sm:flex-initial sm:w-64">
                  <label className="block text-sm font-semibold text-cream-900 mb-2">
                    Filter Subcategory
                  </label>
                  <ReviewFilterDropdown
                    label="All Subcategories"
                    value={selectedSubCategoryFilter}
                    onChange={(value) => setSelectedSubCategoryFilter(value as string | null)}
                    options={[
                      { value: null, label: "All Subcategories" },
                      ...subCategories
                        .filter(subCat => {
                          if (subCategorySearchQuery && !subCat.name.toLowerCase().includes(subCategorySearchQuery.toLowerCase())) {
                            return false;
                          }
                          return true;
                        })
                        .map(subCat => ({
                          value: subCat._id,
                          label: subCat.name
                        })),
                    ]}
                    className="w-full"
                  />
                </div>

                {/* Clear Filters Button */}
                {(subCategorySearchQuery || selectedSubCategoryFilter) && (
                  <button
                    onClick={() => {
                      setSubCategorySearchQuery("");
                      setSelectedSubCategoryFilter(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-cream-700 hover:text-cream-900 bg-cream-100 hover:bg-cream-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <X size={16} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Subcategories Grid - Show when category has child categories - Same UI as provided */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {subCategories
                .filter(subCategory => {
                  // Filter by search query
                  if (subCategorySearchQuery && !subCategory.name.toLowerCase().includes(subCategorySearchQuery.toLowerCase())) {
                    return false;
                  }
                  // Filter by selected subcategory
                  if (selectedSubCategoryFilter && subCategory._id !== selectedSubCategoryFilter) {
                    return false;
                  }
                  return true;
                })
                .map((subCategory, idx) => {
              const subCategoryIdForLink = subCategory.slug || subCategory._id;
              const imageUrl = subCategory.image || '/Glossy.png'; // Fallback image
              
              return (
                <motion.div
                  key={subCategory._id}
                  variants={itemVariants}
                >
                  <Link 
                    to={categoryId 
                      ? `/digital-print/${categoryId}/${subCategoryIdForLink}` 
                      : `/digital-print/${subCategoryIdForLink}`
                    } 
                    className="group block h-full"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-cream-100 h-full flex flex-col hover:-translate-y-2">
                      
                      {/* Rounded Square Image Container */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-cream-100 flex items-center justify-center rounded-2xl sm:rounded-3xl m-3 sm:m-4 mx-2 sm:mx-3">
                        <img 
                          src={imageUrl} 
                          alt={subCategory.name}
                          className="object-contain h-full w-full transition-transform duration-700 group-hover:scale-110 rounded-2xl sm:rounded-3xl"
                        />
                        
                        {/* Quick View Overlay */}
                        <div className="absolute inset-0 bg-cream-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                          <span className="bg-white text-cream-900 px-6 py-3 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                            Customize Now
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="px-3 sm:px-4 py-4 sm:py-5 flex flex-col flex-grow">
                        <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-cream-900 mb-2 group-hover:text-cream-600 transition-colors">
                          {subCategory.name}
                        </h3>
                        <p className="text-cream-600 text-sm sm:text-base mb-4 flex-grow leading-relaxed">
                          {subCategory.description || ''}
                        </p>
                        
                        <div className="pt-3 border-t border-cream-100 flex items-center justify-between mt-auto">
                          <span className="text-xs sm:text-sm text-cream-500">View Details</span>
                          <ArrowRight 
                            size={18} 
                            className="text-cream-900 group-hover:text-cream-600 group-hover:translate-x-1 transition-all duration-300" 
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

            {/* Direct Products Section - Show direct products if they exist (even when subcategories exist) */}
            {products.length > 0 && (
              <div className="mt-12">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900 mb-6">
                  Direct Products
                </h2>
                <motion.div
                  className="space-y-3 sm:space-y-4 w-full"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {products.map((product) => {
                    const productSubcategory = typeof product.subcategory === "object" 
                      ? product.subcategory 
                      : null;
                    const productSubcategoryId = productSubcategory?.slug || productSubcategory?._id || 
                      categoryId;
                    
                    const basePrice = product.basePrice || 0;
                    const displayPrice = basePrice < 1 
                      ? (basePrice * 1000).toFixed(2)
                      : basePrice.toFixed(2);
                    const priceLabel = basePrice < 1 ? "per 1000 units" : "";
                    
                    const descriptionText = product.description 
                      ? product.description.replace(/<[^>]*>/g, '').trim()
                      : "";
                    const lines = descriptionText.split('\n').filter(line => line.trim());
                    const firstFewLines = lines.slice(0, 3).join(' ').trim();
                    const shortDescription = firstFewLines.length > 200 
                      ? firstFewLines.substring(0, 200) + '...' 
                      : firstFewLines || "";
                    
                    return (
                      <motion.div
                        key={product._id}
                        variants={itemVariants}
                      >
                        <Link 
                          to={categoryId && productSubcategoryId
                            ? `/digital-print/${categoryId}/${productSubcategoryId}/${product._id}`
                            : categoryId
                            ? `/digital-print/${categoryId}/${product._id}`
                            : `/digital-print/${product._id}`
                          } 
                          className="group block w-full"
                        >
                          <div className="w-full p-4 sm:p-6 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 min-h-[140px] sm:min-h-[160px] flex flex-col">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                {product.name}
                              </h3>
                              <div className="text-right flex-shrink-0 flex items-center gap-2">
                                <div>
                                  <div className="text-lg sm:text-xl font-bold text-cream-900">
                                    ₹{displayPrice}
                                  </div>
                                  {priceLabel && (
                                    <div className="text-xs text-cream-500 mt-0.5">
                                      {priceLabel}
                                    </div>
                                  )}
                                </div>
                                <span className="text-cream-900 group-hover:text-cream-600 text-xl font-bold transition-colors">→</span>
                              </div>
                            </div>
                            
                            {shortDescription && (
                              <div className="text-cream-600 text-xs sm:text-sm mb-2 leading-relaxed flex-grow">
                                <p className="line-clamp-3">{shortDescription}</p>
                              </div>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}
          </>
        ) : subCategoryId ? (
          /* Products Display - From subcategory - Old UI: Left Image, Right Products */
          products.length > 0 ? (
          <div>
            {/* Back Button - Only show if viewing subcategory */}
            {subCategoryId && (
              <div className="mb-4">
                <BackButton
                  onClick={() => {
                    if (categoryId) {
                      navigate(`/digital-print/${categoryId}`);
                    } else {
                      navigate('/digital-print');
                    }
                  }}
                  fallbackPath="/digital-print"
                  label={`Back to ${categoryName || 'Categories'}`}
                  className="inline-flex items-center gap-2 text-sm text-cream-600 hover:text-cream-900"
                />
              </div>
            )}

            {/* Select Product Heading */}
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900 mb-6">
              Select Product
            </h2>

            {/* Main Layout: 50/50 Split - Left Image, Right Products */}
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
              {/* Left Side: Subcategory Image (Fixed, Large) */}
              <div className="lg:w-1/2">
                <div className="lg:sticky lg:top-24">
                  <motion.div
                    className="bg-white p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-cream-100 flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-cream-100/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={selectedSubCategory?.image || "/Glossy.png"}
                        alt={selectedSubCategory?.name || categoryName || "Product Preview"}
                        className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '100%',
                        }}
                      />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Right Side: Product List - Old UI Style */}
              <div className="lg:w-1/2">
                <motion.div
                  className="space-y-3 sm:space-y-4 w-full"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {products.map((product) => {
                    const productSubcategory = typeof product.subcategory === "object" 
                      ? product.subcategory 
                      : null;
                    // Use product's subcategory if available, otherwise use the selected subcategory or category
                    // This prevents navigation errors when product has invalid subcategory ID
                    const productSubcategoryId = productSubcategory?.slug || productSubcategory?._id || 
                      (selectedSubCategory?.slug || selectedSubCategory?._id) || 
                      subCategoryId || 
                      categoryId;
                    
                    // Calculate price per 1000 units if basePrice is less than 1
                    const basePrice = product.basePrice || 0;
                    const displayPrice = basePrice < 1 
                      ? (basePrice * 1000).toFixed(2)
                      : basePrice.toFixed(2);
                    const priceLabel = basePrice < 1 ? "per 1000 units" : "";
                    
                    // Get description preview (strip HTML and get first few lines)
                    const descriptionText = product.description 
                      ? product.description.replace(/<[^>]*>/g, '').trim()
                      : "";
                    // Get first 3 lines or up to 200 characters
                    const lines = descriptionText.split('\n').filter(line => line.trim());
                    const firstFewLines = lines.slice(0, 3).join(' ').trim();
                    const shortDescription = firstFewLines.length > 200 
                      ? firstFewLines.substring(0, 200) + '...' 
                      : firstFewLines || "";
                    
                    return (
                      <motion.div
                        key={product._id}
                        variants={itemVariants}
                      >
                        <Link 
                          to={categoryId && productSubcategoryId
                            ? `/digital-print/${categoryId}/${productSubcategoryId}/${product._id}`
                            : categoryId
                            ? `/digital-print/${categoryId}/${product._id}`
                            : `/digital-print/${product._id}`
                          } 
                          className="group block w-full"
                        >
                          <div className="w-full p-4 sm:p-6 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 min-h-[140px] sm:min-h-[160px] flex flex-col">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                {product.name}
                              </h3>
                              <div className="text-right flex-shrink-0 flex items-center gap-2">
                                <div>
                                  <div className="text-lg sm:text-xl font-bold text-cream-900">
                                    ₹{displayPrice}
                                  </div>
                                  {priceLabel && (
                                    <div className="text-xs text-cream-500 mt-0.5">
                                      {priceLabel}
                                    </div>
                                  )}
                                </div>
                                <span className="text-cream-900 group-hover:text-cream-600 text-xl font-bold transition-colors">→</span>
                              </div>
                            </div>
                            
                            {shortDescription && (
                              <div className="text-cream-600 text-xs sm:text-sm mb-2 leading-relaxed flex-grow">
                                <p className="line-clamp-3">{shortDescription}</p>
                              </div>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </div>
          ) : (
          <div className="bg-cream-50 border border-cream-200 rounded-lg p-6 text-center">
            <p className="text-cream-700">No products found for this subcategory.</p>
            {categoryId && (
              <BackButton
                onClick={() => {
                  if (categoryId) {
                    navigate(`/digital-print/${categoryId}`);
                  } else {
                    navigate('/digital-print');
                  }
                }}
                fallbackPath="/digital-print"
                label="Back to subcategories"
                className="text-cream-900 hover:text-cream-600 underline mt-2 inline-block"
              />
            )}
          </div>
          )
        ) : categoryId && products.length > 0 ? (
          /* Products Display - Direct from category (with or without subcategories) - Old UI Style */
          <div>
            {/* Select Product Heading */}
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900 mb-6">
              Select Product
            </h2>
            
            {/* Products List - Old UI Style */}
            <div className="w-full">
              <motion.div
                className="space-y-3 sm:space-y-4 w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {products.map((product) => {
                  const productSubcategory = typeof product.subcategory === "object" 
                    ? product.subcategory 
                    : null;
                  // Use product's subcategory if available, otherwise use category
                  // This prevents navigation errors when product has invalid subcategory ID
                  const productSubcategoryId = productSubcategory?.slug || productSubcategory?._id || 
                    categoryId;
                  
                  // Calculate price per 1000 units if basePrice is less than 1
                  const basePrice = product.basePrice || 0;
                  const displayPrice = basePrice < 1 
                    ? (basePrice * 1000).toFixed(2)
                    : basePrice.toFixed(2);
                  const priceLabel = basePrice < 1 ? "per 1000 units" : "";
                  
                  // Get description preview (strip HTML and get first few lines)
                  const descriptionText = product.description 
                    ? product.description.replace(/<[^>]*>/g, '').trim()
                    : "";
                  // Get first 3 lines or up to 200 characters
                  const lines = descriptionText.split('\n').filter(line => line.trim());
                  const firstFewLines = lines.slice(0, 3).join(' ').trim();
                  const shortDescription = firstFewLines.length > 200 
                    ? firstFewLines.substring(0, 200) + '...' 
                    : firstFewLines || "";
                  
                  return (
                    <motion.div
                      key={product._id}
                      variants={itemVariants}
                    >
                      <Link 
                        to={categoryId && productSubcategoryId
                          ? `/digital-print/${categoryId}/${productSubcategoryId}/${product._id}`
                          : categoryId
                          ? `/digital-print/${categoryId}/${product._id}`
                          : `/digital-print/${product._id}`
                        } 
                        className="group block w-full"
                      >
                        <div className="w-full p-3 sm:p-4 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50">
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
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        ) : (categoryId && subCategories.length === 0) && products.length === 0 ? (
          <div className="bg-cream-50 border border-cream-200 rounded-lg p-6 text-center">
            <p className="text-cream-700">
              {subCategoryId ? "No products found for this subcategory." : "No products found for this category."}
            </p>
            {categoryId && subCategoryId && (
              <BackButton
                onClick={() => {
                  if (categoryId) {
                    navigate(`/digital-print/${categoryId}`);
                  } else {
                    navigate('/digital-print');
                  }
                }}
                fallbackPath="/digital-print"
                label="Back to subcategories"
                className="text-cream-900 hover:text-cream-600 underline mt-2 inline-block"
              />
            )}
          </div>
        ) : subCategories.length === 0 && !categoryId ? (
          <div className="bg-cream-50 border border-cream-200 rounded-lg p-6 text-center">
            <p className="text-cream-700">No categories found.</p>
          </div>
        ) : null
        }

        {/* Category Details Footer - Only show when viewing subcategories, not products */}
        {!subCategoryId && categoryName && (
          <motion.div
            className="mt-12 sm:mt-20 bg-white p-8 sm:p-10 rounded-3xl border border-cream-200 shadow-sm"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="flex-1">
                <h3 className="font-serif text-2xl font-bold text-cream-900 mb-4">
                  Why Choose Our {categoryName}?
                </h3>
                {categoryDescription && (
                  <p className="text-cream-700 leading-relaxed mb-6">
                    {categoryDescription}
                  </p>
                )}
                <div className="flex gap-4">
                  <div className="text-center p-4 bg-cream-50 rounded-xl border border-cream-100">
                    <div className="font-bold text-2xl text-cream-900 mb-1">24h</div>
                    <div className="text-xs text-cream-500 uppercase tracking-wider">Production</div>
                  </div>
                  <div className="text-center p-4 bg-cream-50 rounded-xl border border-cream-100">
                    <div className="font-bold text-2xl text-cream-900 mb-1">300+</div>
                    <div className="text-xs text-cream-500 uppercase tracking-wider">GSM Paper</div>
                  </div>
                  <div className="text-center p-4 bg-cream-50 rounded-xl border border-cream-100">
                    <div className="font-bold text-2xl text-cream-900 mb-1">100%</div>
                    <div className="text-xs text-cream-500 uppercase tracking-wider">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VisitingCards;
