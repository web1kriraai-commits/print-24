# Product Creation Guide - Print24 SSR

This guide explains how to add products to the Print24 system and how to use attributes for product customization and pricing.

## Table of Contents

1. [Overview](#overview)
2. [Product Structure](#product-structure)
3. [Creating a Product](#creating-a-product)
4. [Understanding Attributes](#understanding-attributes)
5. [Product Options vs Dynamic Attributes](#product-options-vs-dynamic-attributes)
6. [Step-by-Step Product Creation](#step-by-step-product-creation)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Products in Print24 can have:
- **Basic Information**: Name, description, price, images
- **Filters**: Legacy system for printing options, delivery speed, texture types
- **Options**: Simple pricing modifiers (legacy)
- **Dynamic Attributes**: Advanced, reusable attribute system (recommended)

---

## Product Structure

### Basic Product Fields

```javascript
{
  name: "Product Name",                    // Required
  description: "Full description text",    // Optional
  descriptionArray: ["Point 1", "Point 2"], // Optional - for bullet points
  basePrice: 100,                          // Required - base price per unit
  subcategory: ObjectId,                   // Required - link to subcategory
  image: "https://cloudinary.com/...",     // Optional - product image
  productType: "gloss"                     // Optional - product type identifier
}
```

### Filters (Legacy System)

```javascript
filters: {
  printingOption: ["Single Side", "Both Sides"],
  orderQuantity: {
    min: 1000,      // Minimum order quantity
    max: 72000,     // Maximum order quantity
    multiples: 1000 // Quantity must be multiple of this
  },
  deliverySpeed: ["Standard", "Express"],
  textureType: ["Texture No.1", "Texture No.2"] // Optional
}
```

### Options (Legacy Pricing System)

```javascript
options: [
  {
    name: "Both Sides",      // Option name (must match filter value)
    priceAdd: 20,            // Price increase (percentage or multiplier)
    description: "Optional description",
    image: "https://..."      // Optional image
  }
]
```

### Dynamic Attributes (Advanced System)

```javascript
dynamicAttributes: [
  {
    attributeType: ObjectId("..."),  // Reference to AttributeType
    customValues: [...],             // Product-specific overrides (optional)
    isEnabled: true,                 // Enable/disable for this product
    isRequired: false,              // Make selection required
    displayOrder: 0                  // Display order
  }
]
```

---

## Creating a Product

### Step 1: Access Admin Dashboard

1. Log in as an admin user
2. Navigate to the Admin Dashboard
3. Click on the "Products" tab

### Step 2: Fill Basic Information

1. **Product Name**: Enter a descriptive name (e.g., "Glossy Business Cards")
2. **Subcategory**: Select the subcategory this product belongs to
3. **Base Price**: Enter the base price per unit (e.g., 0.15 for ₹0.15 per card)
4. **Description**: Enter product description (supports rich text)
   - Use line breaks for bullet points
   - The system will automatically convert to `descriptionArray`
5. **Product Image**: Upload a product image (optional)

### Step 3: Configure Filters

Filters define what options customers can select:

#### Printing Options
- Click "Add" to add printing options
- Examples: "Single Side", "Both Sides", "Single Side with Black Back Printing"

#### Delivery Speed
- Click "Add" to add delivery options
- Examples: "Standard", "Express"

#### Texture Type (Optional)
- Click "Add" to add texture options
- Examples: "Texture No.1", "Texture No.2", etc.

#### Order Quantity
- **Min**: Minimum order quantity (e.g., 1000)
- **Max**: Maximum order quantity (e.g., 72000)
- **Multiples**: Quantity must be a multiple of this (e.g., 1000)

### Step 4: Configure Options (Legacy Pricing)

Options define how each filter selection affects pricing:

1. Click "Add Option" in the Options table
2. Fill in:
   - **Name**: Must exactly match a filter value (e.g., "Both Sides")
   - **Price Add**: Price modifier
     - If < 1: Treated as multiplier (e.g., 1.2 = 20% increase)
     - If >= 1: Treated as percentage (e.g., 20 = 20% increase)
   - **Description**: Optional description
   - **Image**: Optional image URL

**Example:**
```
Name: "Both Sides"
Price Add: 20
→ This adds 20% to the base price when "Both Sides" is selected

Name: "Express"
Price Add: 30
→ This adds 30% to the base price when "Express" is selected
```

### Step 5: Save Product

Click "Create Product" to save. The system will:
- Upload the image to Cloudinary
- Convert description to `descriptionArray`
- Save all filters and options
- Link the product to the selected subcategory

---

## Understanding Attributes

### What are Attributes?

Attributes are reusable templates that define product customization options. They are more powerful than the legacy "Options" system because:

1. **Reusable**: Create once, use across multiple products
2. **Flexible**: Support different input types (dropdown, text field, file upload)
3. **Advanced**: Can affect pricing, file uploads, or just be informational

### Attribute Types

#### 1. **QUANTITY_PRICING**
- Used for quantity-based pricing tiers
- Example: "Order Quantity" with tiers like 1000-5000, 5000-10000

#### 2. **PRINTING_IMAGE**
- Used for printing-related options that require image uploads
- Example: "Front Design", "Back Design"

#### 3. **SPOT_UV_IMAGE**
- Used for special effects that require image uploads
- Example: "Spot UV Design"

#### 4. **GENERAL**
- General purpose attributes
- Example: "Color", "Size", "Paper Type"

### Creating an Attribute Type

1. Go to Admin Dashboard → "Attribute Types" tab
2. Click "Create Attribute Type"
3. Fill in the form:

#### Required Fields:
- **Attribute Name**: Display name (e.g., "Printing Option")
- **Function Type**: Choose from QUANTITY_PRICING, PRINTING_IMAGE, SPOT_UV_IMAGE, GENERAL
- **Input Style**: How users select the option
  - `DROPDOWN`: Dropdown menu
  - `RADIO`: Radio buttons
  - `TEXT_FIELD`: Text input
  - `FILE_UPLOAD`: File upload
  - `NUMBER`: Number input
  - `CHECKBOX`: Checkbox
- **Primary Effect Type**: What this attribute affects
  - `PRICE`: Affects pricing
  - `FILE`: Requires file upload
  - `VARIANT`: Creates product variant
  - `INFORMATIONAL`: Just displays information

#### Optional Fields:
- **Is Pricing Attribute**: Check if this affects price
- **Is Filterable**: Can users filter products by this?
- **Is Required**: Is selection mandatory?
- **Is Common Attribute**: Available for all products?
- **Display Order**: Order in the UI

#### Attribute Values (for DROPDOWN/RADIO):
For dropdown or radio inputs, define the available options:

```
Value: "both-sides"
Label: "Both Sides"
Price Multiplier: 1.2
Description: "Print on both sides"
Image: (optional)
```

### Using Attributes in Products

Currently, the admin dashboard uses the legacy "Options" system. To use Dynamic Attributes:

1. Create Attribute Types first (see above)
2. When creating/editing a product, the system can link to Attribute Types via `dynamicAttributes`
3. This is typically done via API or future UI updates

---

## Product Options vs Dynamic Attributes

### Legacy Options System (Current)

**Pros:**
- Simple and straightforward
- Easy to understand
- Works well for basic pricing

**Cons:**
- Not reusable
- Must be configured per product
- Limited flexibility

**When to Use:**
- Simple products with few options
- Quick setup needed
- Basic pricing modifiers

### Dynamic Attributes System (Advanced)

**Pros:**
- Reusable across products
- More flexible input types
- Better for complex products
- Can affect multiple aspects (price, files, variants)

**Cons:**
- More complex setup
- Requires Attribute Type creation first
- Currently not fully integrated in UI

**When to Use:**
- Multiple products with similar options
- Complex customization needs
- Need file uploads or special input types
- Want to filter products by attributes

---

## Step-by-Step Product Creation

### Example: Creating "Glossy Business Cards"

1. **Basic Info**
   - Name: "Glossy Business Cards - Standard Size"
   - Subcategory: "Gloss Finish"
   - Base Price: 0.15
   - Description: "High-quality glossy business cards..."

2. **Filters**
   - Printing Options: ["Single Side", "Both Sides"]
   - Delivery Speed: ["Standard", "Express"]
   - Texture Type: ["Texture No.1", "Texture No.2"]
   - Quantity: Min: 1000, Max: 72000, Multiples: 1000

3. **Options** (for pricing)
   - Option 1:
     - Name: "Both Sides"
     - Price Add: 20 (20% increase)
   - Option 2:
     - Name: "Express"
     - Price Add: 30 (30% increase)
   - Option 3:
     - Name: "Texture No.1"
     - Price Add: 15 (15% increase)

4. **Image**
   - Upload product preview image

5. **Save**
   - Click "Create Product"

### Price Calculation Example

If a customer selects:
- Quantity: 5000
- Printing: "Both Sides" (+20%)
- Delivery: "Express" (+30%)
- Texture: "Texture No.1" (+15%)

**Calculation:**
```
Base Price = 0.15
Multiplier = 1.0 (base) × 1.2 (Both Sides) × 1.3 (Express) × 1.15 (Texture)
Final Price per Unit = 0.15 × 1.2 × 1.3 × 1.15 = 0.2691
Total Price = 0.2691 × 5000 = ₹1,345.50
```

---

## Troubleshooting

### Ngrok Blocked Request Error

**Error Message:**
```
Ngrok blocked request. Please try again or check your Ngrok configuration.
```

**Solution:**
1. All API calls automatically include the `ngrok-skip-browser-warning` header
2. If you still see this error:
   - Check your ngrok URL is correct
   - Ensure the server is running
   - Try refreshing the page
   - Check browser console for more details

### Product Not Appearing

**Possible Causes:**
1. **Subcategory not selected**: Ensure you selected a valid subcategory
2. **Image upload failed**: Check Cloudinary configuration
3. **Validation error**: Check the error message in the admin dashboard

### Price Calculation Not Working

**Check:**
1. Options table has entries matching filter values exactly
2. `priceAdd` values are correct (percentage or multiplier)
3. Base price is set correctly
4. Quantity is within min/max range

### Description Not Displaying Correctly

**Tips:**
1. Use line breaks for bullet points
2. The system converts description to `descriptionArray` automatically
3. For rich text, use the Rich Text Editor in the admin panel
4. HTML tags are supported in descriptions

---

## Best Practices

1. **Naming Conventions**
   - Use descriptive product names
   - Keep option names consistent across products
   - Use clear, customer-friendly labels

2. **Pricing**
   - Set realistic base prices
   - Use percentage-based `priceAdd` for clarity (e.g., 20 = 20%)
   - Test price calculations before publishing

3. **Images**
   - Use high-quality product images
   - Keep file sizes reasonable (< 10MB)
   - Use consistent image dimensions

4. **Descriptions**
   - Write clear, concise descriptions
   - Use bullet points for features
   - Include important details (sizes, materials, etc.)

5. **Filters and Options**
   - Keep filter names consistent
   - Ensure option names exactly match filter values
   - Test all combinations before publishing

---

## API Reference

### Create Product (POST /api/products)

```javascript
FormData:
- name: string (required)
- description: string
- basePrice: number (required)
- subcategory: ObjectId (required)
- productType: string
- image: File
- descriptionArray: JSON string
- filters: JSON string
- options: JSON string
- dynamicAttributes: JSON string (optional)
```

### Example Request

```javascript
const formData = new FormData();
formData.append("name", "Glossy Business Cards");
formData.append("basePrice", "0.15");
formData.append("subcategory", "507f1f77bcf86cd799439011");
formData.append("filters", JSON.stringify({
  printingOption: ["Single Side", "Both Sides"],
  orderQuantity: { min: 1000, max: 72000, multiples: 1000 },
  deliverySpeed: ["Standard", "Express"]
}));
formData.append("options", JSON.stringify([
  { name: "Both Sides", priceAdd: 20 },
  { name: "Express", priceAdd: 30 }
]));
```

---

## Summary

- **Products** are created in the Admin Dashboard
- **Filters** define what customers can select
- **Options** define how selections affect pricing (legacy system)
- **Attributes** are advanced, reusable customization templates
- Always test price calculations before publishing
- Use consistent naming conventions
- Keep descriptions clear and informative

For more help, check the code comments in:
- `client/pages/AdminDashboard.tsx` - Admin UI
- `server/src/controllers/productController.js` - Product API
- `server/src/models/productModal.js` - Product schema













