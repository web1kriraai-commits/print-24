import mongoose from "mongoose";

const AttributeTypeSchema = new mongoose.Schema(
  {
    // The name of the option presented to the user (e.g., "Color," "Die Shape")
    attributeName: {
      type: String,
      required: true,
      trim: true,
    },

    // The system role of the attribute: Quantity/Pricing, Printing (Image), Spot UV/Image
    functionType: {
      type: String,
      enum: ["QUANTITY_PRICING", "PRINTING_IMAGE", "SPOT_UV_IMAGE", "GENERAL"],
      required: true,
      default: "GENERAL",
    },

    // Explicitly marks if selecting this attribute affects the price calculation
    isPricingAttribute: {
      type: Boolean,
      required: true,
      default: false,
    },

    // How the option is presented: Dropdown, Text Field, File Upload
    inputStyle: {
      type: String,
      enum: ["DROPDOWN", "TEXT_FIELD", "FILE_UPLOAD", "NUMBER", "CHECKBOX", "RADIO", "POPUP"],
      required: true,
      default: "DROPDOWN",
    },

    // If fixed quantity needed, restricts available quantity options to pre-set values
    isFixedQuantityNeeded: {
      type: Boolean,
      default: false,
    },

    // Quantity configuration for QUANTITY_PRICING attributes
    quantityConfig: {
      // Quantity configuration type: "SIMPLE" (min/max/multiples), "STEP_WISE", "RANGE_WISE"
      quantityType: { 
        type: String, 
        enum: ["SIMPLE", "STEP_WISE", "RANGE_WISE"], 
        default: "SIMPLE" 
      },
      // For SIMPLE type: min, max, multiples
      minQuantity: Number,
      maxQuantity: Number,
      quantityMultiples: Number,
      // For STEP_WISE type: specific discrete quantities
      // e.g., [1000, 2500, 5000, 10000] - exact quantities available
      stepWiseQuantities: [Number],
      // For RANGE_WISE type: quantity ranges with different pricing
      // e.g., [{min: 1000, max: 5000, priceMultiplier: 1.0, label: "1,000 - 5,000"}, ...]
      rangeWiseQuantities: [{
        min: { type: Number, required: true },
        max: { type: Number }, // null means no upper limit
        priceMultiplier: { type: Number, default: 1.0 }, // Price multiplier for this range
        label: String, // Optional display label
      }],
    },

    // What area of the system is impacted: PRICE, FILE, VARIANT, INFORMATIONAL
    primaryEffectType: {
      type: String,
      enum: ["PRICE", "FILE", "VARIANT", "INFORMATIONAL"],
      required: true,
      default: "INFORMATIONAL",
    },

    // Can users use this to filter the catalog results?
    isFilterable: {
      type: Boolean,
      default: false,
    },

    // The pre-defined options (e.g., for "Color": "Red," "Blue," "Green")
    // Only required for DROPDOWN, RADIO input styles
    attributeValues: [
      {
        value: String, // The option value (e.g., "Red")
        label: String, // Display label (e.g., "Red")
        priceMultiplier: Number, // Price multiplier for this value (optional, only if isPricingAttribute is true)
        description: String, // Optional description for this value
        image: String, // Optional image URL for this value
      },
    ],

    // Default value (optional)
    defaultValue: String,

    // Whether this attribute is required
    isRequired: {
      type: Boolean,
      default: false,
    },

    // Display order in the UI
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Whether this is a common attribute (available for all products)
    isCommonAttribute: {
      type: Boolean,
      default: false,
    },

    // Category/Subcategory restrictions (if empty, available for all)
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableSubCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],
  },
  { timestamps: true }
);

// Index for faster queries
AttributeTypeSchema.index({ attributeName: 1 });
AttributeTypeSchema.index({ isCommonAttribute: 1 });

export default mongoose.model("AttributeType", AttributeTypeSchema);

