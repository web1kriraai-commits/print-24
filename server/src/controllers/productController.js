import Product from "../models/productModal.js";
import Category from "../models/categoryModal.js";
import SubCategory from "../models/subcategoryModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      basePrice, 
      category,
      subcategory, 
      description, 
      descriptionArray, 
      productType, 
      options, 
      filters, 
      dynamicAttributes, 
      quantityDiscounts,
      maxFileSizeMB,
      minFileWidth,
      maxFileWidth,
      minFileHeight,
      maxFileHeight,
      blockCDRandJPG,
      additionalDesignCharge,
      gstPercentage,
      showPriceIncludingGst,
      instructions,
      productionSequence
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Product name is required." });
    }

    // Category is now required (subcategory is for backward compatibility)
    const categoryId = category || subcategory;
    if (!categoryId) {
      return res.status(400).json({ error: "Category is required." });
    }

    // Validate category ID format (MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID format. Expected MongoDB ObjectId." });
    }

    // Validate that the category exists in the database
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({ error: "Category not found. Please select a valid category." });
    }

    // If subcategory is provided, validate it exists and belongs to the category
    const subcategoryStr = subcategory ? String(subcategory).trim() : '';
    if (subcategoryStr && subcategoryStr !== '' && subcategoryStr !== 'null') {
      // Validate subcategory ID format
      if (!/^[0-9a-fA-F]{24}$/.test(subcategoryStr)) {
        return res.status(400).json({ error: "Invalid subcategory ID format. Expected MongoDB ObjectId." });
      }
      
      // Check if subcategory exists in SubCategory collection
      const subcategoryExists = await SubCategory.findById(subcategoryStr).populate('category');
      if (!subcategoryExists) {
        return res.status(400).json({ error: "Subcategory not found. Please select a valid subcategory." });
      }
      
      // Validate that subcategory belongs to the selected category
      const subcategoryCategoryId = subcategoryExists.category 
        ? (typeof subcategoryExists.category === 'object' 
          ? subcategoryExists.category._id.toString() 
          : subcategoryExists.category.toString())
        : null;
      
      if (subcategoryCategoryId !== categoryId) {
        return res.status(400).json({ 
          error: "Selected subcategory does not belong to the selected category. Please select a valid subcategory." 
        });
      }
    }

    // Parse options JSON
    let parsedOptions = [];
    if (options) {
      try {
        parsedOptions = JSON.parse(options);
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in options" });
      }
    }

    // Parse filters JSON
    let parsedFilters = null;
    if (filters) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
        
        // Ensure filter prices are properly structured
        if (parsedFilters) {
          // Ensure filterPricesEnabled is a boolean
          if (parsedFilters.filterPricesEnabled !== undefined) {
            parsedFilters.filterPricesEnabled = parsedFilters.filterPricesEnabled === true || parsedFilters.filterPricesEnabled === 'true';
          } else {
            parsedFilters.filterPricesEnabled = false;
          }
          
          // Ensure price arrays are properly formatted
          if (parsedFilters.printingOptionPrices && Array.isArray(parsedFilters.printingOptionPrices)) {
            parsedFilters.printingOptionPrices = parsedFilters.printingOptionPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.printingOptionPrices = [];
          }
          
          if (parsedFilters.deliverySpeedPrices && Array.isArray(parsedFilters.deliverySpeedPrices)) {
            parsedFilters.deliverySpeedPrices = parsedFilters.deliverySpeedPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.deliverySpeedPrices = [];
          }
          
          if (parsedFilters.textureTypePrices && Array.isArray(parsedFilters.textureTypePrices)) {
            parsedFilters.textureTypePrices = parsedFilters.textureTypePrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.textureTypePrices = [];
          }
          
          console.log("Parsed filters with prices (create):", JSON.stringify(parsedFilters, null, 2));
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in filters" });
      }
    }

    // Parse descriptionArray JSON
    let parsedDescriptionArray = [];
    if (descriptionArray) {
      try {
        parsedDescriptionArray = typeof descriptionArray === 'string' ? JSON.parse(descriptionArray) : descriptionArray;
      } catch (err) {
        // If not JSON, treat as single string and convert to array
        parsedDescriptionArray = descriptionArray.split('\n').filter(line => line.trim());
      }
    }

    let imageUrl = null;

    if (req.file) {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadStream();
      imageUrl = result.secure_url;
    }

    // Validate basePrice is a number
    const price = basePrice ? parseFloat(basePrice) : 0;
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: "Base price must be a valid positive number" });
    }

    // Parse dynamicAttributes JSON
    let parsedDynamicAttributes = [];
    if (dynamicAttributes) {
      try {
        parsedDynamicAttributes = typeof dynamicAttributes === 'string' 
          ? JSON.parse(dynamicAttributes) 
          : dynamicAttributes;
        
        // Validate and filter dynamicAttributes
        if (Array.isArray(parsedDynamicAttributes)) {
          parsedDynamicAttributes = parsedDynamicAttributes
            .filter((da) => da && da.attributeType) // Filter out null/undefined entries
            .map((da) => ({
              attributeType: da.attributeType,
              isEnabled: da.isEnabled !== undefined ? da.isEnabled : true,
              isRequired: da.isRequired !== undefined ? da.isRequired : false,
              displayOrder: da.displayOrder !== undefined ? da.displayOrder : 0,
              customValues: Array.isArray(da.customValues) ? da.customValues : [],
            }));
        } else {
          parsedDynamicAttributes = [];
        }
      } catch (err) {
        console.error("Error parsing dynamicAttributes:", err);
        return res.status(400).json({ error: "Invalid JSON in dynamicAttributes" });
      }
    }
    
    console.log("Parsed dynamicAttributes for product creation:", JSON.stringify(parsedDynamicAttributes, null, 2));

    // Parse quantityDiscounts JSON
    let parsedQuantityDiscounts = [];
    if (quantityDiscounts) {
      try {
        parsedQuantityDiscounts = typeof quantityDiscounts === 'string'
          ? JSON.parse(quantityDiscounts)
          : quantityDiscounts;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in quantityDiscounts" });
      }
    }

    // Parse file upload constraints
    const parsedMaxFileSizeMB = maxFileSizeMB ? parseFloat(maxFileSizeMB) : undefined;
    const parsedMinFileWidth = minFileWidth ? parseInt(minFileWidth) : undefined;
    const parsedMaxFileWidth = maxFileWidth ? parseInt(maxFileWidth) : undefined;
    const parsedMinFileHeight = minFileHeight ? parseInt(minFileHeight) : undefined;
    const parsedMaxFileHeight = maxFileHeight ? parseInt(maxFileHeight) : undefined;
    const parsedBlockCDRandJPG = blockCDRandJPG === "true" || blockCDRandJPG === true;

    // Parse additional charges and taxes
    const parsedAdditionalDesignCharge = additionalDesignCharge ? parseFloat(additionalDesignCharge) : 0;
    const parsedGstPercentage = gstPercentage ? parseFloat(gstPercentage) : 0;
    const parsedShowPriceIncludingGst = showPriceIncludingGst === true || showPriceIncludingGst === 'true';

    // Parse productionSequence JSON
    let parsedProductionSequence = [];
    if (productionSequence) {
      try {
        parsedProductionSequence = typeof productionSequence === 'string' 
          ? JSON.parse(productionSequence) 
          : productionSequence;
        // Ensure it's an array of valid ObjectIds
        if (Array.isArray(parsedProductionSequence)) {
          parsedProductionSequence = parsedProductionSequence.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        } else {
          parsedProductionSequence = [];
        }
      } catch (err) {
        console.log("Error parsing productionSequence:", err);
        parsedProductionSequence = [];
      }
    }

    // Ensure subcategory is properly set (not empty string)
    // If subcategory is provided, use it; otherwise use categoryId
    const subcategoryValue = subcategoryStr && subcategoryStr !== '' && subcategoryStr !== 'null' ? subcategoryStr : null;
    // If subcategory is provided, category should be the parent category; otherwise use categoryId
    const finalCategoryId = subcategoryValue ? categoryId : categoryId;
    
    const data = await Product.create({
      name,
      basePrice: price,
      category: finalCategoryId, // Store parent category ID
      subcategory: subcategoryValue, // Store subcategory ID from SubCategory collection
      description,
      descriptionArray: parsedDescriptionArray,
      productType: productType || "",
      image: imageUrl,
      options: parsedOptions,
      filters: parsedFilters,
      dynamicAttributes: parsedDynamicAttributes,
      quantityDiscounts: parsedQuantityDiscounts,
      maxFileSizeMB: parsedMaxFileSizeMB,
      minFileWidth: parsedMinFileWidth,
      maxFileWidth: parsedMaxFileWidth,
      minFileHeight: parsedMinFileHeight,
      maxFileHeight: parsedMaxFileHeight,
      blockCDRandJPG: parsedBlockCDRandJPG,
      additionalDesignCharge: parsedAdditionalDesignCharge,
      gstPercentage: parsedGstPercentage,
      showPriceIncludingGst: parsedShowPriceIncludingGst,
      instructions: instructions || "",
      productionSequence: parsedProductionSequence,
    });

    // Populate category (and subcategory for backward compatibility) before returning
    const populatedProduct = await Product.findById(data._id)
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true } // Populate parent hierarchy
        }
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType",
        select: "_id attributeName inputStyle primaryEffectType isPricingAttribute attributeValues defaultValue isRequired isFilterable displayOrder"
      });

    console.log("Product created with subcategory ID:", subcategory);
    console.log("Populated product subcategory:", populatedProduct?.subcategory);
    console.log("Product created with dynamicAttributes count:", populatedProduct?.dynamicAttributes?.length || 0);
    if (populatedProduct?.dynamicAttributes && populatedProduct.dynamicAttributes.length > 0) {
      console.log("Dynamic attributes details:", populatedProduct.dynamicAttributes.map((da) => ({
        attributeTypeId: typeof da.attributeType === 'object' ? da.attributeType?._id : da.attributeType,
        attributeName: typeof da.attributeType === 'object' ? da.attributeType?.attributeName : 'N/A',
        isEnabled: da.isEnabled,
        isRequired: da.isRequired
      })));
    }

    return res.json({
      success: true,
      message: "Product created successfully",
      data: populatedProduct || data,
    });
  } catch (err) {
    console.log("PRODUCT ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// GET all products
export const getAllProducts = async (req, res) => {
  try {
    const list = await Product.find()
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });
    
    console.log(`Fetched ${list.length} product(s) total`);
    res.json(list);
  } catch (err) {
    console.error("Error fetching all products:", err);
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
};

// GET product by ID
export const getSingleProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
      return res.status(400).json({ 
        error: "Invalid product ID format. Expected MongoDB ObjectId (24 hex characters).",
        received: productId
      });
    }

    console.log("Fetching product with ID:", productId);

    const item = await Product.findById(productId)
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .populate({
        path: "productionSequence",
        model: "Department",
        select: "_id name description sequence isEnabled"
      });

    if (!item) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("Product found:", item.name);
    res.json(item);
  } catch (err) {
    console.error("Error fetching product:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    res.status(500).json({ error: err.message || "Failed to fetch product" });
  }
};

// GET products by category (works with any level in hierarchy)
export const getProductsByCategory = async (req, res) => {
  try {
    const categoryIdentifier = req.params.categoryId;
    
    if (!categoryIdentifier) {
      return res.status(400).json({ error: "Category ID or slug is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryIdentifier);
    
    let categoryId = categoryIdentifier;
    
    // If not an ObjectId, try to find category by slug
    if (!isObjectId) {
      const Category = (await import("../models/categoryModal.js")).default;
      const category = await Category.findOne({ slug: categoryIdentifier });
      if (!category) {
        // Also check if it's a subcategory slug
        const SubCategory = (await import("../models/subcategoryModal.js")).default;
        const subcategory = await SubCategory.findOne({ slug: categoryIdentifier });
        if (subcategory) {
          categoryId = subcategory._id.toString();
        } else {
          return res.status(404).json({ error: "Category or subcategory not found" });
        }
      } else {
        categoryId = category._id.toString();
      }
    }

    // Check if categoryId is a category or subcategory
    // First check if it's a subcategory in SubCategory collection
    const SubCategory = (await import("../models/subcategoryModal.js")).default;
    const Category = (await import("../models/categoryModal.js")).default;
    
    const isSubcategory = await SubCategory.findById(categoryId);
    
    // If it's not a subcategory, verify it's a valid category
    if (!isSubcategory) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ error: "Category not found" });
      }
    }
    
    // Find products by category or subcategory
    // If categoryId is a subcategory, find products where subcategory = categoryId
    // If categoryId is a category, find products where:
    //   - category = categoryId (direct category products)
    //   - subcategory.category = categoryId (products in subcategories of this category)
    let query;
    
    if (isSubcategory) {
      // It's a subcategory - find products with this subcategory
      query = { subcategory: categoryId };
    } else {
      // It's a category - find products directly under this category OR in its subcategories
      const subcategories = await SubCategory.find({ category: categoryId }).select('_id');
      const subcategoryIds = subcategories.map(sc => sc._id);
      
      query = {
        $or: [
          { 
            category: categoryId,
            $or: [
              { subcategory: null },
              { subcategory: { $exists: false } }
            ]
          }, // Direct category products (without subcategory)
          { subcategory: { $in: subcategoryIds } } // Products in subcategories of this category
        ]
      };
    }
    
    const list = await Product.find(query)
    .populate({
      path: "category",
      select: "_id name description image type parent slug",
      populate: {
        path: "parent",
        select: "_id name type",
        options: { recursive: true }
      }
    })
    .populate({
      path: "subcategory",
      select: "_id name description image slug category",
      populate: {
        path: "category",
        model: "Category",
        select: "_id name description type image"
      }
    })
    .populate({
      path: "dynamicAttributes.attributeType",
      model: "AttributeType"
    })
    .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    console.error("Error in getProductsByCategory:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
    // If it's a validation error or other known error, return 400
    if (err.name === 'ValidationError' || err.message.includes('Cast to ObjectId')) {
      return res.status(400).json({ error: err.message || "Invalid category ID" });
    }
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// GET products by subcategory (explicit endpoint)
// Priority: First find products with subcategory, if none found, fall back to category products
export const getProductsBySubcategory = async (req, res) => {
  try {
    const subcategoryIdentifier = req.params.subcategoryId;
    
    if (!subcategoryIdentifier) {
      return res.status(400).json({ error: "Subcategory ID or slug is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subcategoryIdentifier);
    
    let subcategoryId = subcategoryIdentifier;
    
    // If not an ObjectId, try to find subcategory by slug
    if (!isObjectId) {
      const SubCategory = (await import("../models/subcategoryModal.js")).default;
      const subcategory = await SubCategory.findOne({ slug: subcategoryIdentifier });
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      subcategoryId = subcategory._id.toString();
    }

    console.log("Fetching products for subcategory ID:", subcategoryId);

    // First priority: Find products where subcategory matches the provided ID
    let list = await Product.find({
      subcategory: subcategoryId,
    })
    .populate({
      path: "category",
      select: "_id name description image type parent slug",
      populate: {
        path: "parent",
        select: "_id name type",
        options: { recursive: true }
      }
    })
    .populate({
      path: "subcategory",
      select: "_id name description image slug category",
      populate: {
        path: "category",
        model: "Category",
        select: "_id name description type image"
      }
    })
    .populate({
      path: "dynamicAttributes.attributeType",
      model: "AttributeType"
    })
    .sort({ createdAt: -1 });

    console.log(`Found ${list.length} product(s) with subcategory ${subcategoryId}`);

    // If no products found with subcategory, fall back to category products
    if (list.length === 0) {
      // Get the parent category ID from the subcategory
      const SubCategory = (await import("../models/subcategoryModal.js")).default;
      const subcategory = await SubCategory.findById(subcategoryId).populate('category');
      
      if (subcategory && subcategory.category) {
        const categoryId = typeof subcategory.category === 'object' 
          ? subcategory.category._id 
          : subcategory.category;
        
        console.log(`No products found with subcategory, falling back to category ${categoryId}`);
        
        // Find products directly under the parent category
        list = await Product.find({
          category: categoryId,
          $or: [
            { subcategory: null },
            { subcategory: { $exists: false } }
          ]
        })
        .populate({
          path: "category",
          select: "_id name description image type parent slug",
          populate: {
            path: "parent",
            select: "_id name type",
            options: { recursive: true }
          }
        })
        .populate({
          path: "subcategory",
          select: "_id name description image slug category",
          populate: {
            path: "category",
            model: "Category",
            select: "_id name description type image"
          }
        })
        .populate({
          path: "dynamicAttributes.attributeType",
          model: "AttributeType"
        })
        .sort({ createdAt: -1 });
        
        console.log(`Found ${list.length} product(s) in parent category ${categoryId}`);
      }
    }

    // Return the list of products
    res.json(list);
  } catch (err) {
    console.error("Error fetching products by subcategory:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }
    res.status(500).json({ error: err.message || "Failed to fetch products by subcategory" });
  }
};

// UPDATE product
export const updateProduct = async (req, res) => {
  try {
    const { 
      name, 
      basePrice, 
      category,
      subcategory, 
      description, 
      descriptionArray, 
      productType, 
      options, 
      filters, 
      dynamicAttributes,
      quantityDiscounts,
      maxFileSizeMB,
      minFileWidth,
      maxFileWidth,
      minFileHeight,
      maxFileHeight,
      blockCDRandJPG,
      additionalDesignCharge,
      gstPercentage,
      showPriceIncludingGst,
      instructions,
      productionSequence
    } = req.body;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Parse options JSON
    let parsedOptions = product.options || [];
    if (options) {
      try {
        parsedOptions = JSON.parse(options);
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in options" });
      }
    }

    // Parse filters JSON
    let parsedFilters = product.filters || null;
    if (filters !== undefined) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
        
        // Ensure filter prices are properly structured
        if (parsedFilters) {
          // Ensure filterPricesEnabled is a boolean
          if (parsedFilters.filterPricesEnabled !== undefined) {
            parsedFilters.filterPricesEnabled = parsedFilters.filterPricesEnabled === true || parsedFilters.filterPricesEnabled === 'true';
          } else {
            parsedFilters.filterPricesEnabled = false;
          }
          
          // Ensure price arrays are properly formatted
          if (parsedFilters.printingOptionPrices && Array.isArray(parsedFilters.printingOptionPrices)) {
            parsedFilters.printingOptionPrices = parsedFilters.printingOptionPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.printingOptionPrices = [];
          }
          
          if (parsedFilters.deliverySpeedPrices && Array.isArray(parsedFilters.deliverySpeedPrices)) {
            parsedFilters.deliverySpeedPrices = parsedFilters.deliverySpeedPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.deliverySpeedPrices = [];
          }
          
          if (parsedFilters.textureTypePrices && Array.isArray(parsedFilters.textureTypePrices)) {
            parsedFilters.textureTypePrices = parsedFilters.textureTypePrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.textureTypePrices = [];
          }
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in filters" });
      }
    }

    // Parse descriptionArray JSON
    let parsedDescriptionArray = product.descriptionArray || [];
    if (descriptionArray !== undefined) {
      try {
        parsedDescriptionArray = typeof descriptionArray === 'string' ? JSON.parse(descriptionArray) : descriptionArray;
      } catch (err) {
        // If not JSON, treat as single string and convert to array
        parsedDescriptionArray = descriptionArray ? descriptionArray.split('\n').filter(line => line.trim()) : [];
      }
    }

    let imageUrl = product.image; // Keep existing image if no new one uploaded

    if (req.file) {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadStream();
      imageUrl = result.secure_url;
    }

    // Validate subcategory if provided
    if (subcategory && !/^[0-9a-fA-F]{24}$/.test(subcategory)) {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }

    // Validate basePrice if provided
    let validatedBasePrice = product.basePrice;
    if (basePrice !== undefined) {
      const price = parseFloat(basePrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: "Base price must be a valid positive number" });
      }
      validatedBasePrice = price;
    }

    // Parse dynamicAttributes JSON
    let parsedDynamicAttributes = product.dynamicAttributes || [];
    if (dynamicAttributes !== undefined) {
      try {
        parsedDynamicAttributes = typeof dynamicAttributes === 'string'
          ? JSON.parse(dynamicAttributes)
          : dynamicAttributes;
        
        // Validate and filter dynamicAttributes
        if (Array.isArray(parsedDynamicAttributes)) {
          parsedDynamicAttributes = parsedDynamicAttributes
            .filter((da) => da && da.attributeType) // Filter out null/undefined entries
            .map((da) => ({
              attributeType: da.attributeType,
              isEnabled: da.isEnabled !== undefined ? da.isEnabled : true,
              isRequired: da.isRequired !== undefined ? da.isRequired : false,
              displayOrder: da.displayOrder !== undefined ? da.displayOrder : 0,
              customValues: Array.isArray(da.customValues) ? da.customValues : [],
            }));
        } else {
          parsedDynamicAttributes = [];
        }
      } catch (err) {
        console.error("Error parsing dynamicAttributes:", err);
        return res.status(400).json({ error: "Invalid JSON in dynamicAttributes" });
      }
    }
    
    console.log("Parsed dynamicAttributes for product update:", JSON.stringify(parsedDynamicAttributes, null, 2));

    // Parse quantityDiscounts JSON
    let parsedQuantityDiscounts = product.quantityDiscounts || [];
    if (quantityDiscounts !== undefined) {
      try {
        parsedQuantityDiscounts = typeof quantityDiscounts === 'string'
          ? JSON.parse(quantityDiscounts)
          : quantityDiscounts;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in quantityDiscounts" });
      }
    }

    // Parse file upload constraints
    const parsedMaxFileSizeMB = maxFileSizeMB !== undefined ? (maxFileSizeMB ? parseFloat(maxFileSizeMB) : undefined) : product.maxFileSizeMB;
    const parsedMinFileWidth = minFileWidth !== undefined ? (minFileWidth ? parseInt(minFileWidth) : undefined) : product.minFileWidth;
    const parsedMaxFileWidth = maxFileWidth !== undefined ? (maxFileWidth ? parseInt(maxFileWidth) : undefined) : product.maxFileWidth;
    const parsedMinFileHeight = minFileHeight !== undefined ? (minFileHeight ? parseInt(minFileHeight) : undefined) : product.minFileHeight;
    const parsedMaxFileHeight = maxFileHeight !== undefined ? (maxFileHeight ? parseInt(maxFileHeight) : undefined) : product.maxFileHeight;
    const parsedBlockCDRandJPG = blockCDRandJPG !== undefined ? (blockCDRandJPG === "true" || blockCDRandJPG === true) : product.blockCDRandJPG;

    // Parse additional charges and taxes
    const parsedAdditionalDesignCharge = additionalDesignCharge !== undefined ? (additionalDesignCharge ? parseFloat(additionalDesignCharge) : 0) : product.additionalDesignCharge;
    const parsedGstPercentage = gstPercentage !== undefined ? (gstPercentage ? parseFloat(gstPercentage) : 0) : product.gstPercentage;
    const parsedShowPriceIncludingGst = showPriceIncludingGst !== undefined ? (showPriceIncludingGst === true || showPriceIncludingGst === 'true') : (product.showPriceIncludingGst || false);

    // Parse productionSequence JSON
    let parsedProductionSequence = product.productionSequence || [];
    if (productionSequence !== undefined) {
      try {
        parsedProductionSequence = typeof productionSequence === 'string' 
          ? JSON.parse(productionSequence) 
          : productionSequence;
        // Ensure it's an array of valid ObjectIds
        if (Array.isArray(parsedProductionSequence)) {
          parsedProductionSequence = parsedProductionSequence.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        } else {
          parsedProductionSequence = [];
        }
      } catch (err) {
        console.log("Error parsing productionSequence:", err);
        parsedProductionSequence = product.productionSequence || [];
      }
    }

    // Handle category and subcategory updates
    let categoryUpdate = product.category;
    let subcategoryUpdate = product.subcategory;
    
    // Validate category if provided
    if (category) {
      // Validate category ID format
      if (!/^[0-9a-fA-F]{24}$/.test(category)) {
        return res.status(400).json({ error: "Invalid category ID format. Expected MongoDB ObjectId." });
      }
      
      // Validate that the category exists
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: "Category not found. Please select a valid category." });
      }
      
      categoryUpdate = category;
    }
    
    // Always update subcategory if provided (even if empty string, set to null)
    if (subcategory !== undefined) {
      const subcategoryStr = subcategory ? String(subcategory).trim() : '';
      if (subcategoryStr && subcategoryStr !== '' && subcategoryStr !== 'null') {
        // Validate subcategory ID format
        if (!/^[0-9a-fA-F]{24}$/.test(subcategoryStr)) {
          return res.status(400).json({ error: "Invalid subcategory ID format. Expected MongoDB ObjectId." });
        }
        
        // Validate that subcategory exists in SubCategory collection
        const SubCategory = (await import("../models/subcategoryModal.js")).default;
        const subcategoryExists = await SubCategory.findById(subcategoryStr).populate('category');
        if (!subcategoryExists) {
          return res.status(400).json({ error: "Subcategory not found. Please select a valid subcategory." });
        }
        
        // Validate that subcategory belongs to the category (if category is also being updated or already set)
        const finalCategoryId = categoryUpdate || product.category;
        if (finalCategoryId) {
          // Get the parent category from the subcategory
          const subcategoryCategoryId = subcategoryExists.category 
            ? (typeof subcategoryExists.category === 'object' ? subcategoryExists.category._id : subcategoryExists.category)
            : null;
          
          if (!subcategoryCategoryId || subcategoryCategoryId.toString() !== finalCategoryId.toString()) {
            return res.status(400).json({ 
              error: "Selected subcategory does not belong to the selected category. Please select a valid subcategory." 
            });
          }
        }
        
        subcategoryUpdate = subcategoryStr;
      } else {
        // Empty subcategory - product will be directly under category
        subcategoryUpdate = null;
      }
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: name !== undefined ? name : product.name,
        basePrice: validatedBasePrice,
        category: categoryUpdate,
        subcategory: subcategoryUpdate,
        description: description !== undefined ? description : product.description,
        descriptionArray: parsedDescriptionArray,
        // productType is deprecated - keep existing value for backward compatibility but don't update it
        productType: product.productType,
        image: imageUrl,
        options: parsedOptions,
        filters: parsedFilters,
        dynamicAttributes: parsedDynamicAttributes,
        quantityDiscounts: parsedQuantityDiscounts,
        maxFileSizeMB: parsedMaxFileSizeMB,
        minFileWidth: parsedMinFileWidth,
        maxFileWidth: parsedMaxFileWidth,
        minFileHeight: parsedMinFileHeight,
        maxFileHeight: parsedMaxFileHeight,
        blockCDRandJPG: parsedBlockCDRandJPG,
        additionalDesignCharge: parsedAdditionalDesignCharge,
        gstPercentage: parsedGstPercentage,
        showPriceIncludingGst: parsedShowPriceIncludingGst,
        instructions: instructions !== undefined ? instructions : product.instructions,
        productionSequence: parsedProductionSequence,
      },
      { new: true }
    )
    .populate({
      path: "category",
      select: "_id name description image type parent slug",
      populate: {
        path: "parent",
        select: "_id name type",
        options: { recursive: true }
      }
    })
    .populate({
      path: "subcategory",
      select: "_id name description image slug category",
      populate: {
        path: "category",
        model: "Category",
        select: "_id name description type image"
      }
    })
    .populate({
      path: "dynamicAttributes.attributeType",
      model: "AttributeType",
      select: "_id attributeName inputStyle primaryEffectType isPricingAttribute attributeValues"
    });

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    console.log("PRODUCT UPDATE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};