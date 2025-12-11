import Category from "../models/categoryModal.js";
import SubCategory from "../models/subcategoryModal.js";
import Product from "../models/productModal.js";
import Sequence from "../models/sequenceModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// Helper function to generate a unique slug by appending increment numbers
const generateUniqueSlug = async (baseSlug, excludeId = null) => {
  let uniqueSlug = baseSlug;
  let counter = 1;
  
  // Check if slug exists (excluding current category if updating)
  let existingCategory = await Category.findOne({ slug: uniqueSlug });
  if (excludeId && existingCategory && existingCategory._id.toString() === excludeId) {
    // If it's the same category being updated, the slug is already unique
    return uniqueSlug;
  }
  
  // Keep incrementing until we find a unique slug
  while (existingCategory) {
    uniqueSlug = `${baseSlug}-${counter}`;
    existingCategory = await Category.findOne({ slug: uniqueSlug });
    if (excludeId && existingCategory && existingCategory._id.toString() === excludeId) {
      // If it's the same category being updated, the slug is already unique
      break;
    }
    counter++;
  }
  
  return uniqueSlug;
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, type, parent, slug, sortOrder } = req.body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name is required." });
    }

    if (type && !["Digital", "Bulk"].includes(type)) {
      return res.status(400).json({ 
        error: "Type must be either 'Digital' or 'Bulk'." 
      });
    }

    // Validate parent category if provided
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ error: "Parent category not found." });
      }
      // Prevent circular reference - check if parent is a descendant
      let currentParent = parentCategory.parent;
      while (currentParent) {
        if (currentParent.toString() === parent) {
          return res.status(400).json({ error: "Circular reference detected. Cannot set parent." });
        }
        const parentDoc = await Category.findById(currentParent);
        if (!parentDoc) break;
        currentParent = parentDoc.parent;
      }
    }

    // Image is required for category creation
    if (!req.file) {
      return res.status(400).json({ 
        error: "Category image is required. Please upload an image." 
      });
    }

    // Validate image file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: "Invalid image format. Please upload JPG, PNG, or WebP image." 
      });
    }

    let imageUrl = null;

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "categories" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload();
    imageUrl = result.secure_url;

    // Generate slug from name if not provided
    let categorySlug;
    if (slug) {
      // Slug was manually provided - use it as-is (will show error if duplicate)
      categorySlug = slug;
    } else {
      // Slug was auto-generated - make it unique by appending numbers if needed
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      categorySlug = await generateUniqueSlug(baseSlug);
    }

    // Parse sortOrder (default to 0 if not provided or invalid)
    const parsedSortOrder = sortOrder !== undefined && sortOrder !== null && sortOrder !== '' 
      ? parseInt(sortOrder, 10) 
      : 0;
    
    if (isNaN(parsedSortOrder)) {
      return res.status(400).json({ error: "Sort order must be a valid number." });
    }

    const data = await Category.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      image: imageUrl,
      type: type || "Digital",
      parent: parent || null,
      sortOrder: parsedSortOrder,
      slug: categorySlug,
    });

    // Populate parent if exists
    const populatedData = await Category.findById(data._id).populate('parent', 'name type');

    return res.json({
      success: true,
      message: "Category created successfully",
      data: populatedData,
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Category with this slug already exists." });
    }
    return res.status(500).json({ error: err.message });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    // Get only top-level categories (no parent) - subcategories are in SubCategory collection
    const list = await Category.find({ parent: null })
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get categories in tree structure (hierarchical)
// Categories are from Category collection, subcategories are from SubCategory collection
export const getCategoriesTree = async (req, res) => {
  try {
    const SubCategory = (await import("../models/subcategoryModal.js")).default;
    
    // Get all top-level categories
    const allCategories = await Category.find({ parent: null })
      .sort({ sortOrder: 1, createdAt: -1 });
    
    // Build tree structure with subcategories from SubCategory collection
    const buildTree = async (parentId = null) => {
          if (parentId === null) {
        // Top level - return categories
        return Promise.all(allCategories.map(async (cat) => {
          // Get subcategories for this category from SubCategory collection
          const subcategories = await SubCategory.find({ category: cat._id })
            .populate('category', 'name type')
            .sort({ sortOrder: 1, createdAt: -1 });
          
          return {
          ...cat.toObject(),
            children: subcategories.map(sub => ({
              _id: sub._id,
              name: sub.name,
              description: sub.description,
              image: sub.image,
              slug: sub.slug,
              category: sub.category,
              parent: cat._id, // For compatibility
              createdAt: sub.createdAt,
              updatedAt: sub.updatedAt
            }))
          };
        }));
      }
      
      // For subcategories, they don't have children (flat structure)
      return [];
    };
    
    const tree = await buildTree();
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all categories that can be used as parents (excludes the current category)
// Only returns top-level categories (no parent) since only they can be parents
export const getAvailableParents = async (req, res) => {
  try {
    const excludeId = req.query.excludeId; // Category ID to exclude (for editing)
    let query = { parent: null }; // Only top-level categories can be parents
    
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const categories = await Category.find(query)
      .select('name type sortOrder createdAt')
      .sort({ sortOrder: 1, createdAt: -1 });
    
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get top-level categories only (no parent)
export const getTopLevelCategories = async (req, res) => {
  try {
    const list = await Category.find({ parent: null })
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get categories by parent - returns subcategories from SubCategory collection
export const getCategoriesByParent = async (req, res) => {
  try {
    const parentId = req.params.parentId;
    
    // Validate that the parent category exists
    const parentCategory = await Category.findById(parentId);
    if (!parentCategory) {
      return res.status(404).json({ error: "Parent category not found" });
    }
    
    // Get subcategories from SubCategory collection for this parent category
    const SubCategory = (await import("../models/subcategoryModal.js")).default;
    const list = await SubCategory.find({ category: parentId })
      .populate('category', 'name type')
      .sort({ sortOrder: 1, createdAt: -1 });
    
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const identifier = req.params.id;
    
    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    
    let data;
    if (isObjectId) {
      // Try to find by ID first
      data = await Category.findById(identifier);
    }
    
    // If not found by ID or not an ObjectId, try to find by slug
    if (!data) {
      data = await Category.findOne({ slug: identifier });
    }
    
    if (!data) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDigitalCategories = async (req, res) => {
  try {
    // Return only top-level Digital categories (no parent) - subcategories are in SubCategory collection
    // Sort by sortOrder to maintain the order set in admin dashboard
    const categories = await Category.find({ type: "Digital", parent: null })
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getBulkCategories = async (req, res) => {
  try {
    // Return only top-level Bulk categories (no parent) - subcategories are in SubCategory collection
    // Sort by sortOrder to maintain the order set in admin dashboard
    const categories = await Category.find({ type: "Bulk", parent: null })
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE category
export const updateCategory = async (req, res) => {
  try {
    const { name, description, type, parent, slug, sortOrder } = req.body;
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Validate name if provided
    if (name !== undefined && (!name || name.trim() === "")) {
      return res.status(400).json({ error: "Category name cannot be empty." });
    }

    if (type && !["Digital", "Bulk"].includes(type)) {
      return res.status(400).json({ 
        error: "Type must be either 'Digital' or 'Bulk'." 
      });
    }

    // Validate parent category if provided
    if (parent !== undefined) {
      if (parent === null || parent === "") {
        // Setting to top-level is allowed
      } else {
        // Prevent setting self as parent
        if (parent === categoryId) {
          return res.status(400).json({ error: "Category cannot be its own parent." });
        }
        
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          return res.status(400).json({ error: "Parent category not found." });
        }
        
        // Prevent circular reference - check if parent is a descendant
        let currentParent = parentCategory.parent;
        while (currentParent) {
          if (currentParent.toString() === categoryId) {
            return res.status(400).json({ error: "Circular reference detected. Cannot set parent." });
          }
          const parentDoc = await Category.findById(currentParent);
          if (!parentDoc) break;
          currentParent = parentDoc.parent;
        }
      }
    }

    // Validate image file type if new image is uploaded
    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid image format. Please upload JPG, PNG, or WebP image." 
        });
      }
    }

    let imageUrl = category.image; // Keep existing image if no new one uploaded

    if (req.file) {
      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "categories" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await streamUpload();
      imageUrl = result.secure_url;
    }

    // Generate slug from name if not provided and name changed
    let categorySlug;
    if (slug) {
      // Slug was manually provided
      // If it's the same as current slug, no need to update
      if (slug === category.slug) {
        categorySlug = category.slug; // Keep existing, no update needed
      } else {
        // Different slug - use it as-is (MongoDB will show error if duplicate)
        categorySlug = slug;
      }
    } else if (name) {
      // Slug was auto-generated - make it unique by appending numbers if needed
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      categorySlug = await generateUniqueSlug(baseSlug, categoryId);
    } else {
      // Keep existing slug if name didn't change
      categorySlug = category.slug;
    }

    const updateData = {
      name: name !== undefined ? name.trim() : category.name,
      description: description !== undefined ? description.trim() : category.description,
      type: type || category.type,
      image: imageUrl,
    };

    // Parse sortOrder if provided
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
      const parsedSortOrder = parseInt(sortOrder, 10);
      if (isNaN(parsedSortOrder)) {
        return res.status(400).json({ error: "Sort order must be a valid number." });
      }
      updateData.sortOrder = parsedSortOrder;
    }

    if (parent !== undefined) {
      updateData.parent = parent || null;
    }

    // Only update slug if it's different from the current one
    if (categorySlug && categorySlug !== category.slug) {
      updateData.slug = categorySlug;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true }
    ).populate('parent', 'name type');

    return res.json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Category with this slug already exists." });
    }
    return res.status(500).json({ error: err.message });
  }
};

// DELETE category
export const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check for child categories
    const childCategories = await Category.find({ parent: categoryId });
    if (childCategories.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. There are ${childCategories.length} child categor(ies) associated with this category. Please delete or reassign the child categories first.` 
      });
    }

    // Check for products directly under this category
    const relatedProducts = await Product.find({ category: categoryId });
    if (relatedProducts.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. There are ${relatedProducts.length} product(s) directly associated with this category. Please delete or reassign the products first.` 
      });
    }

    // Check for related subcategories
    const relatedSubCategories = await SubCategory.find({ category: categoryId });
    if (relatedSubCategories.length > 0) {
      // Get all subcategory IDs that belong to this category
      const subcategoryIds = relatedSubCategories.map(sub => sub._id);
      
      // Check if any products are using these subcategories
      const productsWithSubcategories = await Product.find({ 
        subcategory: { $in: subcategoryIds } 
      });
      
      if (productsWithSubcategories.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete category. There are ${productsWithSubcategories.length} product(s) associated with subcategories under this category. Please delete or reassign the products first.` 
        });
      }
      
      // If no products are using the subcategories, still prevent deletion if subcategories exist
      // User must delete or reassign subcategories first
      return res.status(400).json({ 
        error: `Cannot delete category. There are ${relatedSubCategories.length} subcategory(ies) associated with this category. Please delete or reassign the subcategories first.` 
      });
    }

    // Check for related sequences
    const relatedSequences = await Sequence.find({ category: categoryId });
    if (relatedSequences.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. There are ${relatedSequences.length} production sequence(s) associated with this category. Please delete or reassign the sequences first.` 
      });
    }

    // Safe to delete - no related data
    await Category.findByIdAndDelete(categoryId);

    return res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};
