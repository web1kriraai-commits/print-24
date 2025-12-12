# Attribute Type Object Examples

This document provides real-world examples of Attribute Type objects used in the Print24 system.

---

## Example 1: Printing Option Attribute

```javascript
{
  "_id": "507f1f77bcf86cd799439011",
  "attributeName": "Printing Option",
  "functionType": "GENERAL",
  "isPricingAttribute": true,
  "inputStyle": "DROPDOWN",
  "isFixedQuantityNeeded": false,
  "primaryEffectType": "PRICE",
  "isFilterable": true,
  "attributeValues": [
    {
      "value": "single-side",
      "label": "Single Side",
      "priceMultiplier": 1.0,
      "description": "Print on one side only",
      "image": ""
    },
    {
      "value": "both-sides",
      "label": "Both Sides",
      "priceMultiplier": 1.2,
      "description": "Print on both front and back",
      "image": ""
    },
    {
      "value": "single-side-black-back",
      "label": "Single Side with Black Back",
      "priceMultiplier": 1.15,
      "description": "Print on front, black ink on back",
      "image": ""
    }
  ],
  "defaultValue": "single-side",
  "isRequired": true,
  "displayOrder": 1,
  "isCommonAttribute": true,
  "applicableCategories": [],
  "applicableSubCategories": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**What this means:**
- Customers see a dropdown with 3 options
- "Both Sides" increases price by 20% (1.2 multiplier)
- "Single Side with Black Back" increases price by 15% (1.15 multiplier)
- "Single Side" has no price change (1.0 multiplier)
- This attribute is available for all products (isCommonAttribute: true)

---

## Example 2: Paper Type Attribute

```javascript
{
  "_id": "507f1f77bcf86cd799439012",
  "attributeName": "Paper Type",
  "functionType": "GENERAL",
  "isPricingAttribute": true,
  "inputStyle": "RADIO",
  "isFixedQuantityNeeded": false,
  "primaryEffectType": "PRICE",
  "isFilterable": true,
  "attributeValues": [
    {
      "value": "matte",
      "label": "Matte Finish",
      "priceMultiplier": 1.0,
      "description": "Non-glossy, professional look",
      "image": "https://example.com/matte-paper.jpg"
    },
    {
      "value": "glossy",
      "label": "Glossy Finish",
      "priceMultiplier": 1.15,
      "description": "Shiny, premium appearance",
      "image": "https://example.com/glossy-paper.jpg"
    },
    {
      "value": "textured",
      "label": "Textured Paper",
      "priceMultiplier": 1.25,
      "description": "Premium textured surface",
      "image": "https://example.com/textured-paper.jpg"
    }
  ],
  "defaultValue": "matte",
  "isRequired": true,
  "displayOrder": 2,
  "isCommonAttribute": true,
  "applicableCategories": [],
  "applicableSubCategories": [],
  "createdAt": "2024-01-15T10:35:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

**What this means:**
- Customers see radio buttons (can select only one)
- Each option has an image preview
- "Textured Paper" increases price by 25% (1.25 multiplier)
- "Glossy Finish" increases price by 15% (1.15 multiplier)
- "Matte Finish" has no price change (1.0 multiplier)

---

## Example 3: Delivery Speed Attribute

```javascript
{
  "_id": "507f1f77bcf86cd799439013",
  "attributeName": "Delivery Speed",
  "functionType": "GENERAL",
  "isPricingAttribute": true,
  "inputStyle": "RADIO",
  "isFixedQuantityNeeded": false,
  "primaryEffectType": "PRICE",
  "isFilterable": false,
  "attributeValues": [
    {
      "value": "standard",
      "label": "Standard Delivery (5-7 days)",
      "priceMultiplier": 1.0,
      "description": "Regular shipping, 5-7 business days",
      "image": ""
    },
    {
      "value": "express",
      "label": "Express Delivery (2-3 days)",
      "priceMultiplier": 1.3,
      "description": "Fast shipping, 2-3 business days",
      "image": ""
    },
    {
      "value": "urgent",
      "label": "Urgent Delivery (1 day)",
      "priceMultiplier": 1.5,
      "description": "Rush order, 1 business day",
      "image": ""
    }
  ],
  "defaultValue": "standard",
  "isRequired": true,
  "displayOrder": 3,
  "isCommonAttribute": true,
  "applicableCategories": [],
  "applicableSubCategories": [],
  "createdAt": "2024-01-15T10:40:00.000Z",
  "updatedAt": "2024-01-15T10:40:00.000Z"
}
```

**What this means:**
- Customers see radio buttons with delivery options
- "Urgent Delivery" increases price by 50% (1.5 multiplier)
- "Express Delivery" increases price by 30% (1.3 multiplier)
- "Standard Delivery" has no price change (1.0 multiplier)
- Not filterable (customers can't filter products by delivery speed)

---

## Example 4: Color Attribute (Informational)

```javascript
{
  "_id": "507f1f77bcf86cd799439014",
  "attributeName": "Card Color",
  "functionType": "GENERAL",
  "isPricingAttribute": false,
  "inputStyle": "DROPDOWN",
  "isFixedQuantityNeeded": false,
  "primaryEffectType": "INFORMATIONAL",
  "isFilterable": true,
  "attributeValues": [
    {
      "value": "white",
      "label": "White",
      "priceMultiplier": 1.0,
      "description": "Classic white card",
      "image": "https://example.com/white-card.jpg"
    },
    {
      "value": "ivory",
      "label": "Ivory",
      "priceMultiplier": 1.0,
      "description": "Warm ivory tone",
      "image": "https://example.com/ivory-card.jpg"
    },
    {
      "value": "cream",
      "label": "Cream",
      "priceMultiplier": 1.0,
      "description": "Soft cream color",
      "image": "https://example.com/cream-card.jpg"
    }
  ],
  "defaultValue": "white",
  "isRequired": false,
  "displayOrder": 4,
  "isCommonAttribute": false,
  "applicableCategories": ["507f1f77bcf86cd799439020"],
  "applicableSubCategories": ["507f1f77bcf86cd799439021"],
  "createdAt": "2024-01-15T10:45:00.000Z",
  "updatedAt": "2024-01-15T10:45:00.000Z"
}
```

**What this means:**
- Customers see a dropdown with color options
- No price change (all multipliers are 1.0)
- Only available for specific categories/subcategories
- Not required (optional selection)
- Customers can filter products by color

---

## Example 5: File Upload Attribute (Printing Design)

```javascript
{
  "_id": "507f1f77bcf86cd799439015",
  "attributeName": "Front Design",
  "functionType": "PRINTING_IMAGE",
  "isPricingAttribute": false,
  "inputStyle": "FILE_UPLOAD",
  "isFixedQuantityNeeded": false,
  "primaryEffectType": "FILE",
  "isFilterable": false,
  "attributeValues": [],
  "defaultValue": "",
  "isRequired": true,
  "displayOrder": 0,
  "isCommonAttribute": true,
  "applicableCategories": [],
  "applicableSubCategories": [],
  "createdAt": "2024-01-15T10:50:00.000Z",
  "updatedAt": "2024-01-15T10:50:00.000Z"
}
```

**What this means:**
- Customers must upload a file/image
- Used for printing designs
- No price multiplier (doesn't affect price)
- Required for all products using this attribute
- Shows first (displayOrder: 0)

---

## Example 6: Quantity-Based Pricing Attribute

```javascript
{
  "_id": "507f1f77bcf86cd799439016",
  "attributeName": "Order Quantity",
  "functionType": "QUANTITY_PRICING",
  "isPricingAttribute": true,
  "inputStyle": "NUMBER",
  "isFixedQuantityNeeded": true,
  "primaryEffectType": "PRICE",
  "isFilterable": false,
  "attributeValues": [
    {
      "value": "1000",
      "label": "1,000 units",
      "priceMultiplier": 1.0,
      "description": "Base quantity",
      "image": ""
    },
    {
      "value": "5000",
      "label": "5,000 units",
      "priceMultiplier": 0.9,
      "description": "10% discount for bulk",
      "image": ""
    },
    {
      "value": "10000",
      "label": "10,000 units",
      "priceMultiplier": 0.85,
      "description": "15% discount for bulk",
      "image": ""
    }
  ],
  "defaultValue": "1000",
  "isRequired": true,
  "displayOrder": 5,
  "isCommonAttribute": true,
  "applicableCategories": [],
  "applicableSubCategories": [],
  "createdAt": "2024-01-15T10:55:00.000Z",
  "updatedAt": "2024-01-15T10:55:00.000Z"
}
```

**What this means:**
- Customers enter a number (quantity)
- Higher quantities get discounts (lower multipliers)
- 10,000 units = 15% discount (0.85 multiplier)
- 5,000 units = 10% discount (0.9 multiplier)
- 1,000 units = no discount (1.0 multiplier)

---

## Example 7: Text Field Attribute (Custom Text)

```javascript
{
  "_id": "507f1f77bcf86cd799439017",
  "attributeName": "Custom Text",
  "functionType": "GENERAL",
  "isPricingAttribute": false,
  "inputStyle": "TEXT_FIELD",
  "isFixedQuantityNeeded": false,
  "primaryEffectType": "INFORMATIONAL",
  "isFilterable": false,
  "attributeValues": [],
  "defaultValue": "",
  "isRequired": false,
  "displayOrder": 6,
  "isCommonAttribute": false,
  "applicableCategories": ["507f1f77bcf86cd799439020"],
  "applicableSubCategories": [],
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

**What this means:**
- Customers type custom text
- No predefined options (attributeValues is empty)
- Doesn't affect price
- Optional (not required)
- Only for specific categories

---

## Complete Product with Dynamic Attributes

Here's how a product object looks when it uses dynamic attributes:

```javascript
{
  "_id": "507f1f77bcf86cd799439100",
  "name": "Premium Business Cards",
  "description": "High-quality business cards with multiple customization options",
  "basePrice": 0.15,
  "subcategory": "507f1f77bcf86cd799439021",
  "image": "https://cloudinary.com/business-cards.jpg",
  "filters": {
    "printingOption": ["Single Side", "Both Sides"],
    "orderQuantity": {
      "min": 1000,
      "max": 72000,
      "multiples": 1000
    },
    "deliverySpeed": ["Standard", "Express"],
    "textureType": []
  },
  "options": [
    {
      "name": "Both Sides",
      "priceAdd": 20,
      "description": "Print on both sides"
    }
  ],
  "dynamicAttributes": [
    {
      "attributeType": "507f1f77bcf86cd799439011", // Printing Option
      "isEnabled": true,
      "isRequired": true,
      "displayOrder": 0,
      "customValues": []
    },
    {
      "attributeType": "507f1f77bcf86cd799439012", // Paper Type
      "isEnabled": true,
      "isRequired": true,
      "displayOrder": 1,
      "customValues": []
    },
    {
      "attributeType": "507f1f77bcf86cd799439013", // Delivery Speed
      "isEnabled": true,
      "isRequired": true,
      "displayOrder": 2,
      "customValues": []
    }
  ],
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

**What this means:**
- Product uses 3 dynamic attributes
- Each attribute is enabled and required
- Display order: Printing Option (0), Paper Type (1), Delivery Speed (2)
- Product also has legacy filters/options for backward compatibility

---

## Field Explanations

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `attributeName` | String | Yes | Display name (e.g., "Printing Option") |
| `functionType` | Enum | Yes | Purpose: "GENERAL", "QUANTITY_PRICING", "PRINTING_IMAGE", "SPOT_UV_IMAGE" |
| `inputStyle` | Enum | Yes | Input method: "DROPDOWN", "RADIO", "CHECKBOX", "TEXT_FIELD", "NUMBER", "FILE_UPLOAD" |
| `primaryEffectType` | Enum | Yes | Impact: "PRICE", "FILE", "VARIANT", "INFORMATIONAL" |

### Pricing Fields

| Field | Type | Description |
|-------|------|-------------|
| `isPricingAttribute` | Boolean | Does this attribute affect price? |
| `attributeValues[].priceMultiplier` | Number | Price multiplier (1.2 = +20%, 0.9 = -10%) |

### Option Fields

| Field | Type | Description |
|-------|------|-------------|
| `attributeValues` | Array | Available options (for DROPDOWN/RADIO) |
| `attributeValues[].value` | String | Internal value (e.g., "both-sides") |
| `attributeValues[].label` | String | Display label (e.g., "Both Sides") |
| `attributeValues[].description` | String | Optional description |
| `attributeValues[].image` | String | Optional image URL |

### Behavior Fields

| Field | Type | Description |
|-------|------|-------------|
| `isRequired` | Boolean | Must customer select before ordering? |
| `isFilterable` | Boolean | Can customers filter products by this? |
| `isCommonAttribute` | Boolean | Available for all products? |
| `isFixedQuantityNeeded` | Boolean | Restrict quantity to pre-set values? |
| `displayOrder` | Number | Order in UI (0 = first) |

### Scope Fields

| Field | Type | Description |
|-------|------|-------------|
| `applicableCategories` | Array | Category IDs (empty = all categories) |
| `applicableSubCategories` | Array | Subcategory IDs (empty = all subcategories) |

---

## Quick Reference: Price Multipliers

| Multiplier | Effect | Example |
|------------|--------|---------|
| `1.0` | No change | Base price |
| `1.1` | +10% increase | ₹100 → ₹110 |
| `1.2` | +20% increase | ₹100 → ₹120 |
| `1.5` | +50% increase | ₹100 → ₹150 |
| `2.0` | +100% increase (double) | ₹100 → ₹200 |
| `0.9` | -10% decrease | ₹100 → ₹90 |
| `0.8` | -20% decrease | ₹100 → ₹80 |
| `0.5` | -50% decrease (half) | ₹100 → ₹50 |

---

## API Response Example

When you fetch attribute types from the API:

```javascript
// GET /api/attribute-types
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "attributeName": "Printing Option",
      "functionType": "GENERAL",
      "inputStyle": "DROPDOWN",
      "primaryEffectType": "PRICE",
      "isPricingAttribute": true,
      "attributeValues": [
        {
          "value": "single-side",
          "label": "Single Side",
          "priceMultiplier": 1.0
        },
        {
          "value": "both-sides",
          "label": "Both Sides",
          "priceMultiplier": 1.2
        }
      ],
      "isRequired": true,
      "displayOrder": 1,
      "isCommonAttribute": true
    }
  ]
}
```

---

## Creating via Admin Dashboard

When you create an attribute type in the admin dashboard, it gets converted to this structure automatically. You just fill in the form with user-friendly labels, and the system handles the rest!
















