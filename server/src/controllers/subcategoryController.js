import SubCategory from "../models/subcategoryModal.js";
import Category from "../models/categoryModal.js";
import Product from "../models/productModal.js";
import Sequence from "../models/sequenceModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// Helper function to generate a unique slug by appending increment numbers
const generateUniqueSubCategorySlug = async (baseSlug, excludeId = null) => {
  let uniqueSlug = baseSlug;
  let counter = 1;
  
  // Check if slug exists (excluding current subcategory if updating)
  let existingSubCategory = await SubCategory.findOne({ slug: uniqueSlug });
  if (excludeId && existingSubCategory && existingSubCategory._id.toString() === excludeId) {
    // If it's the same subcategory being updated, the slug is already unique
    return uniqueSlug;
  }
  
  // Keep incrementing until we find a unique slug
  while (existingSubCategory) {
    uniqueSlug = `${baseSlug}-${counter}`;
    existingSubCategory = await SubCategory.findOne({ slug: uniqueSlug });
    if (excludeId && existingSubCategory && existingSubCategory._id.toString() === excludeId) {
      // If it's the same subcategory being updated, the slug is already unique
      break;
    }
    counter++;
  }
  
  return uniqueSlug;
};

export const createSubCategory = async (req, res) => {
  try {
    const { name, description, category, slug, sortOrder } = req.body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Subcategory name is required." });
    }

    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }

    // Validate that the category exists and get its ObjectId
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ error: "Parent category not found." });
    }
    
    // Ensure we use the category's _id (ObjectId) for storage
    const categoryId = categoryExists._id;

    // Image is required for subcategory creation
    if (!req.file) {
      return res.status(400).json({ 
        error: "Subcategory image is required. Please upload an image." 
      });
    }

    // Validate image file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: "Invalid image format. Please upload JPG, PNG, or WebP image." 
      });
    }

    // Generate slug from name if not provided
    let subCategorySlug;
    if (slug) {
      // Slug was manually provided - use it as-is (will show error if duplicate)
      subCategorySlug = slug;
    } else {
      // Slug was auto-generated - make it unique by appending numbers if needed
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      subCategorySlug = await generateUniqueSubCategorySlug(baseSlug);
    }

    let imageUrl = null;

    if (req.file) {
      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "subcategories" },
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

    // Parse sortOrder (default to 0 if not provided or invalid)
    const parsedSortOrder = sortOrder !== undefined && sortOrder !== null && sortOrder !== '' 
      ? parseInt(sortOrder, 10) 
      : 0;
    
    if (isNaN(parsedSortOrder)) {
      return res.status(400).json({ error: "Sort order must be a valid number." });
    }

    const data = await SubCategory.create({
      name,
      description,
      category: categoryId, // Use the validated category ObjectId
      slug: subCategorySlug,
      image: imageUrl,
      sortOrder: parsedSortOrder,
    });

    return res.json({
      success: true,
      message: "Subcategory created successfully",
      data,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Subcategory with this slug already exists." });
    }
    return res.status(500).json({ error: err.message });
  }
};

export const getAllSubCategories = async (req, res) => {
  try {
    const list = await SubCategory.find().populate("category").sort({ sortOrder: 1, createdAt: -1 });
    
    // Filter out subcategories with deleted parent categories and add warning
    const validSubCategories = list.map(subCat => {
      if (subCat.category === null || subCat.category === undefined) {
        return {
          ...subCat.toObject(),
          _warning: "Parent category has been deleted. Please reassign this subcategory to a valid category."
        };
      }
      return subCat;
    });
    
    res.json(validSubCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSubCategory = async (req, res) => {
  try {
    const identifier = req.params.id;
    
    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    
    let item;
    if (isObjectId) {
      // Try to find by ID first
      item = await SubCategory.findById(identifier).populate("category");
    }
    
    // If not found by ID or not an ObjectId, try to find by slug
    if (!item) {
      item = await SubCategory.findOne({ slug: identifier }).populate("category");
    }
    
    if (!item) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    
    res.json(item);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid subcategory ID" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const getSubCategoriesByCategory = async (req, res) => {
  try {
    const categoryIdentifier = req.params.categoryId;
    
    if (!categoryIdentifier) {
      return res.status(400).json({ error: "Category ID or slug is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryIdentifier);
    
    let categoryId = categoryIdentifier;
    let category;
    
    if (isObjectId) {
      category = await Category.findById(categoryId);
    } else {
      // Try to find by slug
      category = await Category.findOne({ slug: categoryIdentifier });
      if (category) {
        categoryId = category._id.toString();
      }
    }
    
    if (!category) {
      return res.status(404).json({ error: "Parent category not found. It may have been deleted." });
    }

    // Use the category's _id directly (it's already an ObjectId)
    const list = await SubCategory.find({
      category: category._id,
    }).populate("category").sort({ sortOrder: 1, createdAt: -1 });
    
    res.json(list);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const { name, description, category, slug, sortOrder } = req.body;
    const subCategoryId = req.params.id;

    if (!subCategoryId) {
      return res.status(400).json({ error: "Subcategory ID is required" });
    }

    const subCategory = await SubCategory.findById(subCategoryId);
    
    if (!subCategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    // Validate name if provided
    if (name !== undefined && (!name || name.trim() === "")) {
      return res.status(400).json({ error: "Subcategory name cannot be empty." });
    }

    // Validate category if provided and get its ObjectId
    let categoryId = subCategory.category; // Default to existing category
    if (category !== undefined && category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: "Parent category not found." });
      }
      categoryId = categoryExists._id; // Use the validated category's ObjectId
    }

    // Generate slug from name if not provided
    let subCategorySlug;
    if (slug) {
      // Slug was manually provided
      // If it's the same as current slug, no need to update
      if (slug === subCategory.slug) {
        subCategorySlug = subCategory.slug; // Keep existing, no update needed
      } else {
        // Different slug - use it as-is (MongoDB will show error if duplicate)
        subCategorySlug = slug;
      }
    } else if (name) {
      // Slug was auto-generated - make it unique by appending numbers if needed
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      subCategorySlug = await generateUniqueSubCategorySlug(baseSlug, subCategoryId);
    } else {
      // Keep existing slug if name didn't change
      subCategorySlug = subCategory.slug;
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

    let imageUrl = subCategory.image; // Keep existing image if no new one uploaded

    if (req.file) {
      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "subcategories" },
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

    // Parse sortOrder if provided
    let parsedSortOrder = subCategory.sortOrder || 0;
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
      const parsed = parseInt(sortOrder, 10);
      if (!isNaN(parsed)) {
        parsedSortOrder = parsed;
      }
    }

    // Build update object
    const updateData = {
      name: name !== undefined ? name : subCategory.name,
      description: description !== undefined ? description : subCategory.description,
      category: categoryId, // Use the validated category ObjectId
      image: imageUrl,
      sortOrder: parsedSortOrder,
    };

    // Only update slug if it's different from the current one
    if (subCategorySlug && subCategorySlug !== subCategory.slug) {
      updateData.slug = subCategorySlug;
    }

    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      updateData,
      { new: true }
    ).populate("category");

    return res.json({
      success: true,
      message: "Subcategory updated successfully",
      data: updatedSubCategory,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Subcategory with this slug already exists." });
    }
    return res.status(500).json({ error: err.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const subCategoryId = req.params.id;
    const subCategory = await SubCategory.findById(subCategoryId);
    
    if (!subCategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    // Check for related products
    const relatedProducts = await Product.find({ subcategory: subCategoryId });
    if (relatedProducts.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete subcategory. There are ${relatedProducts.length} product(s) associated with this subcategory. Please delete or reassign the products first.` 
      });
    }

    // Check for related sequences
    const relatedSequences = await Sequence.find({ subcategory: subCategoryId });
    if (relatedSequences.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete subcategory. There are ${relatedSequences.length} production sequence(s) associated with this subcategory. Please delete or reassign the sequences first.` 
      });
    }

    // Safe to delete - no related data
    await SubCategory.findByIdAndDelete(subCategoryId);

    return res.json({
      success: true,
      message: "Subcategory deleted successfully",
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid subcategory ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};


