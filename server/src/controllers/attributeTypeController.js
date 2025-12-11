import AttributeType from "../models/attributeTypeModal.js";

// Create a new attribute type
export const createAttributeType = async (req, res) => {
  try {
    const {
      attributeName,
      functionType,
      isPricingAttribute,
      inputStyle,
      isFixedQuantityNeeded,
      primaryEffectType,
      isFilterable,
      attributeValues,
      defaultValue,
      isRequired,
      displayOrder,
      isCommonAttribute,
      applicableCategories,
      applicableSubCategories,
    } = req.body;

    if (!attributeName) {
      return res.status(400).json({ error: "Attribute name is required." });
    }

    if (!functionType) {
      return res.status(400).json({ error: "Function type is required." });
    }

    if (!inputStyle) {
      return res.status(400).json({ error: "Input style is required." });
    }

    if (!primaryEffectType) {
      return res.status(400).json({ error: "Primary effect type is required." });
    }

    // Parse attributeValues if it's a string
    let parsedAttributeValues = [];
    if (attributeValues) {
      try {
        parsedAttributeValues = typeof attributeValues === 'string' 
          ? JSON.parse(attributeValues) 
          : attributeValues;
        
        // Validate attributeValues is an array
        if (!Array.isArray(parsedAttributeValues)) {
          return res.status(400).json({ error: "attributeValues must be an array" });
        }
        
        // Validate attributeValues structure
        for (const av of parsedAttributeValues) {
          if (!av.value || !av.label) {
            return res.status(400).json({ error: "Each attribute value must have 'value' and 'label' fields" });
          }
        }
        
        // For DROPDOWN, RADIO, POPUP input styles, require at least 2 options
        if (['DROPDOWN', 'RADIO', 'POPUP'].includes(inputStyle) && parsedAttributeValues.length < 2) {
          return res.status(400).json({ 
            error: `${inputStyle} input style requires at least 2 attribute values. Please add more options.` 
          });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in attributeValues" });
      }
    } else {
      // For DROPDOWN, RADIO, POPUP input styles, attributeValues is required
      if (['DROPDOWN', 'RADIO', 'POPUP'].includes(inputStyle)) {
        return res.status(400).json({ 
          error: `${inputStyle} input style requires attribute values. Please add at least 2 options.` 
        });
      }
    }

    // Parse applicableCategories and applicableSubCategories
    let parsedCategories = [];
    if (applicableCategories) {
      try {
        parsedCategories = typeof applicableCategories === 'string'
          ? JSON.parse(applicableCategories)
          : applicableCategories;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in applicableCategories" });
      }
    }

    let parsedSubCategories = [];
    if (applicableSubCategories) {
      try {
        parsedSubCategories = typeof applicableSubCategories === 'string'
          ? JSON.parse(applicableSubCategories)
          : applicableSubCategories;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in applicableSubCategories" });
      }
    }

    const attributeType = await AttributeType.create({
      attributeName,
      functionType,
      isPricingAttribute: isPricingAttribute === true || isPricingAttribute === 'true',
      inputStyle,
      isFixedQuantityNeeded: isFixedQuantityNeeded === true || isFixedQuantityNeeded === 'true',
      primaryEffectType,
      isFilterable: isFilterable === true || isFilterable === 'true',
      attributeValues: parsedAttributeValues,
      defaultValue,
      isRequired: isRequired === true || isRequired === 'true',
      displayOrder: displayOrder || 0,
      isCommonAttribute: isCommonAttribute === true || isCommonAttribute === 'true',
      applicableCategories: parsedCategories,
      applicableSubCategories: parsedSubCategories,
    });

    return res.json({
      success: true,
      message: "Attribute type created successfully",
      data: attributeType,
    });
  } catch (err) {
    console.log("ATTRIBUTE TYPE CREATE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get all attribute types
export const getAllAttributeTypes = async (req, res) => {
  try {
    const { isCommonAttribute, categoryId, subCategoryId } = req.query;
    
    let query = {};
    
    if (isCommonAttribute !== undefined) {
      query.isCommonAttribute = isCommonAttribute === 'true';
    }
    
    if (categoryId) {
      query.$or = [
        { applicableCategories: { $size: 0 } }, // Available for all
        { applicableCategories: categoryId },
      ];
    }
    
    if (subCategoryId) {
      query.$or = [
        ...(query.$or || []),
        { applicableSubCategories: { $size: 0 } }, // Available for all
        { applicableSubCategories: subCategoryId },
      ];
    }

    const attributeTypes = await AttributeType.find(query)
      .sort({ displayOrder: 1, attributeName: 1 })
      .populate('applicableCategories', 'name')
      .populate('applicableSubCategories', 'name');

    return res.json({
      success: true,
      data: attributeTypes,
    });
  } catch (err) {
    console.log("GET ATTRIBUTE TYPES ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get unused attribute types (not used by any product)
export const getUnusedAttributeTypes = async (req, res) => {
  try {
    const Product = (await import("../models/productModal.js")).default;
    const mongoose = (await import("mongoose")).default;
    
    // Get all attribute types
    const allAttributeTypes = await AttributeType.find({})
      .sort({ displayOrder: 1, attributeName: 1 })
      .populate('applicableCategories', 'name')
      .populate('applicableSubCategories', 'name');
    
    // Get all attribute type IDs that are used in products
    // Filter out null/undefined values
    const usedAttributeTypeIds = (await Product.distinct("dynamicAttributes.attributeType"))
      .filter(id => id != null)
      .map(id => id.toString());
    
    // Filter out used attribute types
    const unusedAttributeTypes = allAttributeTypes.filter(
      (attrType) => {
        const attrTypeIdStr = attrType._id.toString();
        return !usedAttributeTypeIds.includes(attrTypeIdStr);
      }
    );

    return res.json({
      success: true,
      data: unusedAttributeTypes,
    });
  } catch (err) {
    console.log("GET UNUSED ATTRIBUTE TYPES ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get single attribute type
export const getSingleAttributeType = async (req, res) => {
  try {
    const { id } = req.params;
    const attributeType = await AttributeType.findById(id)
      .populate('applicableCategories', 'name')
      .populate('applicableSubCategories', 'name');

    if (!attributeType) {
      return res.status(404).json({ error: "Attribute type not found" });
    }

    return res.json({
      success: true,
      data: attributeType,
    });
  } catch (err) {
    console.log("GET ATTRIBUTE TYPE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Update attribute type
export const updateAttributeType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      attributeName,
      functionType,
      isPricingAttribute,
      inputStyle,
      isFixedQuantityNeeded,
      primaryEffectType,
      isFilterable,
      attributeValues,
      defaultValue,
      isRequired,
      displayOrder,
      isCommonAttribute,
      applicableCategories,
      applicableSubCategories,
    } = req.body;

    const attributeType = await AttributeType.findById(id);
    if (!attributeType) {
      return res.status(404).json({ error: "Attribute type not found" });
    }

    // Parse attributeValues if it's a string
    let parsedAttributeValues = attributeType.attributeValues;
    if (attributeValues !== undefined) {
      try {
        parsedAttributeValues = typeof attributeValues === 'string'
          ? JSON.parse(attributeValues)
          : attributeValues;
        
        // Validate attributeValues is an array
        if (!Array.isArray(parsedAttributeValues)) {
          return res.status(400).json({ error: "attributeValues must be an array" });
        }
        
        // Validate attributeValues structure
        for (const av of parsedAttributeValues) {
          if (!av.value || !av.label) {
            return res.status(400).json({ error: "Each attribute value must have 'value' and 'label' fields" });
          }
        }
        
        // Get the inputStyle to validate (use updated value if provided, otherwise existing)
        const currentInputStyle = inputStyle !== undefined ? inputStyle : attributeType.inputStyle;
        
        // For DROPDOWN, RADIO, POPUP input styles, require at least 2 options
        if (['DROPDOWN', 'RADIO', 'POPUP'].includes(currentInputStyle) && parsedAttributeValues.length < 2) {
          return res.status(400).json({ 
            error: `${currentInputStyle} input style requires at least 2 attribute values. Please add more options.` 
          });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in attributeValues" });
      }
    }

    // Parse applicableCategories and applicableSubCategories
    let parsedCategories = attributeType.applicableCategories;
    if (applicableCategories !== undefined) {
      try {
        parsedCategories = typeof applicableCategories === 'string'
          ? JSON.parse(applicableCategories)
          : applicableCategories;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in applicableCategories" });
      }
    }

    let parsedSubCategories = attributeType.applicableSubCategories;
    if (applicableSubCategories !== undefined) {
      try {
        parsedSubCategories = typeof applicableSubCategories === 'string'
          ? JSON.parse(applicableSubCategories)
          : applicableSubCategories;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in applicableSubCategories" });
      }
    }

    // Update fields
    if (attributeName !== undefined) attributeType.attributeName = attributeName;
    if (functionType !== undefined) attributeType.functionType = functionType;
    if (isPricingAttribute !== undefined) attributeType.isPricingAttribute = isPricingAttribute === true || isPricingAttribute === 'true';
    if (inputStyle !== undefined) attributeType.inputStyle = inputStyle;
    if (isFixedQuantityNeeded !== undefined) attributeType.isFixedQuantityNeeded = isFixedQuantityNeeded === true || isFixedQuantityNeeded === 'true';
    if (primaryEffectType !== undefined) attributeType.primaryEffectType = primaryEffectType;
    if (isFilterable !== undefined) attributeType.isFilterable = isFilterable === true || isFilterable === 'true';
    if (attributeValues !== undefined) attributeType.attributeValues = parsedAttributeValues;
    if (defaultValue !== undefined) attributeType.defaultValue = defaultValue;
    if (isRequired !== undefined) attributeType.isRequired = isRequired === true || isRequired === 'true';
    if (displayOrder !== undefined) attributeType.displayOrder = displayOrder;
    if (isCommonAttribute !== undefined) attributeType.isCommonAttribute = isCommonAttribute === true || isCommonAttribute === 'true';
    if (applicableCategories !== undefined) attributeType.applicableCategories = parsedCategories;
    if (applicableSubCategories !== undefined) attributeType.applicableSubCategories = parsedSubCategories;

    await attributeType.save();

    const updatedAttributeType = await AttributeType.findById(id)
      .populate('applicableCategories', 'name')
      .populate('applicableSubCategories', 'name');

    return res.json({
      success: true,
      message: "Attribute type updated successfully",
      data: updatedAttributeType,
    });
  } catch (err) {
    console.log("UPDATE ATTRIBUTE TYPE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Delete attribute type
export const deleteAttributeType = async (req, res) => {
  try {
    const { id } = req.params;
    const attributeType = await AttributeType.findById(id);
    
    if (!attributeType) {
      return res.status(404).json({ error: "Attribute type not found" });
    }

    // Check if attribute type is being used in any products
    const Product = (await import("../models/productModal.js")).default;
    const mongoose = (await import("mongoose")).default;
    
    // Validate that id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid attribute type ID" });
    }
    
    const attributeObjectId = new mongoose.Types.ObjectId(id);
    
    // Find products that use this attribute type in their dynamicAttributes array
    const productsUsingAttribute = await Product.find({
      "dynamicAttributes.attributeType": attributeObjectId
    }).select("name _id").limit(10); // Limit to 10 for performance, but we'll count all

    // Get total count for accurate error message
    const totalProductsCount = await Product.countDocuments({
      "dynamicAttributes.attributeType": attributeObjectId
    });

    if (totalProductsCount > 0) {
      const productNames = productsUsingAttribute.slice(0, 5).map(p => p.name).join(", ");
      const moreProducts = totalProductsCount > 5 ? ` and ${totalProductsCount - 5} more` : "";
      
      return res.status(400).json({ 
        error: `Cannot delete attribute type "${attributeType.attributeName}". It is being used in ${totalProductsCount} product(s): ${productNames}${moreProducts}. Please remove this attribute from all products before deleting it.` 
      });
    }

    // Check if attribute type is being used in any sequences
    const Sequence = (await import("../models/sequenceModal.js")).default;
    const sequencesUsingAttribute = await Sequence.find({
      attributes: attributeObjectId
    });

    if (sequencesUsingAttribute.length > 0) {
      const sequenceNames = sequencesUsingAttribute.slice(0, 5).map(s => s.name).join(", ");
      const moreSequences = sequencesUsingAttribute.length > 5 ? ` and ${sequencesUsingAttribute.length - 5} more` : "";
      
      return res.status(400).json({ 
        error: `Cannot delete attribute type "${attributeType.attributeName}". It is being used in ${sequencesUsingAttribute.length} production sequence(s): ${sequenceNames}${moreSequences}. Please remove this attribute from all sequences before deleting it.` 
      });
    }

    // Safe to delete - no related data
    await AttributeType.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Attribute type deleted successfully",
    });
  } catch (err) {
    console.log("DELETE ATTRIBUTE TYPE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

