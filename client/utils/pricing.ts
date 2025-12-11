// Format currency helper
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Order breakdown calculation
export interface OrderBreakdown {
  rawBaseTotal: number;
  discountedBaseTotal: number;
  discountPercentage: number;
  optionBreakdowns: Array<{
    name: string;
    priceAdd: number;
    cost: number;
    isPerUnit: boolean;
  }>;
  subtotal: number;
  gstAmount: number;
  finalTotal: number;
}

export interface OrderForCalculation {
  quantity: number;
  product: {
    basePrice: number;
    gstPercentage?: number;
    options?: Array<{ name: string; priceAdd: number }>;
    filters?: {
      filterPricesEnabled?: boolean;
      printingOptionPrices?: Array<{ name: string; priceAdd: number }>;
      deliverySpeedPrices?: Array<{ name: string; priceAdd: number }>;
      textureTypePrices?: Array<{ name: string; priceAdd: number }>;
      orderQuantity?: {
        quantityType?: "SIMPLE" | "STEP_WISE" | "RANGE_WISE";
        rangeWiseQuantities?: Array<{
          min: number;
          max: number | null;
          priceMultiplier: number;
        }>;
      };
    };
    quantityDiscounts?: Array<{
      minQuantity: number;
      maxQuantity?: number | null;
      discountPercentage?: number;
      priceMultiplier?: number;
    }>;
  };
  finish?: string;
  shape?: string;
  selectedOptions?: Array<{
    name?: string;
    optionName?: string;
    priceAdd: number;
  } | string>;
  selectedDynamicAttributes?: Array<{
    attributeName: string;
    label: string;
    priceMultiplier?: number;
    priceAdd?: number;
  }>;
}

export const calculateOrderBreakdown = (order: OrderForCalculation): OrderBreakdown => {
  const originalBasePrice = order.product.basePrice || 0;
  const quantity = order.quantity || 0;
  const gstPercentage = order.product.gstPercentage || 18;

  // Step 1: Apply range-wise price multiplier if applicable
  let rangeWiseMultiplier = 1.0;
  if (order.product.filters?.orderQuantity?.quantityType === "RANGE_WISE" && 
      order.product.filters.orderQuantity.rangeWiseQuantities && 
      order.product.filters.orderQuantity.rangeWiseQuantities.length > 0) {
    const applicableRange = order.product.filters.orderQuantity.rangeWiseQuantities.find((range) => {
      return quantity >= range.min && (range.max === null || range.max === undefined || quantity <= range.max);
    });
    if (applicableRange) {
      rangeWiseMultiplier = applicableRange.priceMultiplier || 1.0;
    }
  }
  
  // Apply range-wise multiplier to base price
  const adjustedBasePrice = originalBasePrice * rangeWiseMultiplier;
  
  // Step 1: Base Price = quantity * adjusted base price
  const rawBaseTotal = adjustedBasePrice * quantity;

  // Step 2: Calculate all option prices and charges
  const optionBreakdowns: Array<{
    name: string;
    priceAdd: number;
    cost: number;
    isPerUnit: boolean;
  }> = [];

  // Add selected product options (checkboxes)
  if (order.selectedOptions && order.selectedOptions.length > 0) {
    order.selectedOptions.forEach((opt) => {
      if (typeof opt === 'string') return;
      
      const name = opt.name || opt.optionName || 'Option';
      const priceAdd = opt.priceAdd || 0;
      const isPerUnit = priceAdd < 10; // If price is less than 10, assume per unit
      const cost = isPerUnit ? priceAdd * quantity : priceAdd;

      optionBreakdowns.push({
        name,
        priceAdd,
        cost,
        isPerUnit,
      });
    });
  }

  // Add finish/printing option if applicable
  if (order.finish && order.product.filters?.filterPricesEnabled) {
    const printingOption = order.product.filters.printingOptionPrices?.find(
      (p) => p.name === order.finish
    );
    if (printingOption && printingOption.priceAdd !== 0) {
      const cost = (printingOption.priceAdd / 1000) * quantity;
      optionBreakdowns.push({
        name: `Printing: ${order.finish}`,
        priceAdd: printingOption.priceAdd / 1000,
        cost,
        isPerUnit: true,
      });
    }
  }

  // Add delivery speed if applicable
  if (order.shape && order.product.filters?.filterPricesEnabled) {
    const deliverySpeedOption = order.product.filters.deliverySpeedPrices?.find(
      (p) => p.name === order.shape
    );
    if (deliverySpeedOption && deliverySpeedOption.priceAdd !== 0) {
      const cost = (deliverySpeedOption.priceAdd / 1000) * quantity;
      optionBreakdowns.push({
        name: `Delivery: ${order.shape}`,
        priceAdd: deliverySpeedOption.priceAdd / 1000,
        cost,
        isPerUnit: true,
      });
    }
  }

  // Add dynamic attributes (both multipliers and priceAdd)
  if (order.selectedDynamicAttributes && order.selectedDynamicAttributes.length > 0) {
    order.selectedDynamicAttributes.forEach((attr) => {
      if (attr.priceMultiplier && attr.priceMultiplier !== 1) {
        // Calculate the price impact from multiplier as per-unit price
        const multiplierImpact = attr.priceMultiplier - 1;
        const pricePerUnit = originalBasePrice * multiplierImpact;
        const cost = pricePerUnit * quantity;
        
        optionBreakdowns.push({
          name: `${attr.attributeName}: ${attr.label}`,
          priceAdd: pricePerUnit, // Show as per-unit price instead of multiplier
          cost,
          isPerUnit: true, // Mark as per-unit for consistent display
        });
      } else if (attr.priceAdd && attr.priceAdd > 0) {
        // Handle priceAdd for dynamic attributes
        const cost = attr.priceAdd * quantity;
        optionBreakdowns.push({
          name: `${attr.attributeName}: ${attr.label}`,
          priceAdd: attr.priceAdd,
          cost,
          isPerUnit: true,
        });
      }
    });
  }

  // Step 3: Calculate subtotal (base + all options/charges) BEFORE discount
  const optionsTotal = optionBreakdowns.reduce((sum, opt) => sum + opt.cost, 0);
  const subtotalBeforeDiscount = rawBaseTotal + optionsTotal;

  // Step 4: Apply discount to subtotal (discount applied to subtotal before GST)
  let discountPercentage = 0;
  let discountMultiplier = 1.0;
  let discountedBaseTotal = rawBaseTotal; // For backward compatibility

  // Use product quantityDiscounts if available (matches order creation logic)
  if (order.product.quantityDiscounts && Array.isArray(order.product.quantityDiscounts) && order.product.quantityDiscounts.length > 0) {
    // Find the applicable discount tier for the selected quantity
    const applicableDiscount = order.product.quantityDiscounts.find((discount) => {
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
      discountPercentage = applicableDiscount.discountPercentage || 0;
      discountedBaseTotal = rawBaseTotal * discountMultiplier;
    }
  } else {
    // Fallback to hardcoded discount logic (for backward compatibility)
    if (quantity >= 10000) {
      discountPercentage = 70;
      discountMultiplier = 0.3; // Keep 30% of the price
      discountedBaseTotal = rawBaseTotal * 0.3;
    } else if (quantity >= 1000) {
      discountPercentage = 50;
      discountMultiplier = 0.5; // Keep 50% of the price
      discountedBaseTotal = rawBaseTotal * 0.5;
    } else if (quantity >= 500) {
      discountPercentage = 10;
      discountMultiplier = 0.9; // Keep 90% of the price
      discountedBaseTotal = rawBaseTotal * 0.9;
    }
  }

  // Apply discount to subtotal
  const subtotalAfterDiscount = subtotalBeforeDiscount * discountMultiplier;
  const discountAmount = subtotalBeforeDiscount - subtotalAfterDiscount;

  // Step 5: Calculate GST on discounted subtotal
  const gstAmount = (subtotalAfterDiscount * gstPercentage) / 100;

  // Step 6: Calculate total before design charge
  const totalBeforeDesignCharge = subtotalAfterDiscount + gstAmount;

  // Step 7: Final total (subtotal after discount + GST)
  const finalTotal = subtotalAfterDiscount + gstAmount;

  // For backward compatibility, calculate subtotal after discount
  const subtotal = discountedBaseTotal + optionsTotal;

  return {
    rawBaseTotal,
    discountedBaseTotal,
    discountPercentage,
    optionBreakdowns,
    subtotal: subtotalAfterDiscount, // Use discounted subtotal
    gstAmount,
    finalTotal,
    // New fields for the new calculation order
    subtotalBeforeGst: subtotalBeforeDiscount,
    subtotalAfterDiscount,
    totalBeforeDiscount: totalBeforeDesignCharge,
    discountAmount,
  } as OrderBreakdown & {
    subtotalBeforeGst: number;
    subtotalAfterDiscount: number;
    totalBeforeDiscount: number;
    discountAmount: number;
  };
};

