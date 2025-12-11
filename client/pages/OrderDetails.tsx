import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  FileCheck,
  Download,
  CreditCard,
  HelpCircle,
  AlertTriangle,
  Printer,
  Scissors,
  Layers,
  Box as BoxIcon,
  MapPin,
  Info,
} from 'lucide-react';
import { formatCurrency, calculateOrderBreakdown, OrderForCalculation } from '../utils/pricing';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import BackButton from '../components/BackButton';

// Types
interface TimelineEvent {
  stage: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp?: string;
  startedAt?: string;
  completedAt?: string;
}

interface DepartmentStatus {
  departmentName: string;
  status: 'completed' | 'in_progress' | 'pending';
  startedAt?: string;
  completedAt?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  product: {
    _id: string;
    name: string;
    image: string;
    basePrice?: number;
    additionalDesignCharge?: number;
    subcategory?: {
      name: string;
      image?: string;
      category?: {
        name: string;
      };
    } | string;
    gstPercentage?: number;
    maxFileSizeMB?: number;
    options?: Array<{ name: string; priceAdd: number; description?: string }>;
    filters?: {
      filterPricesEnabled?: boolean;
      printingOptionPrices?: Array<{ name: string; priceAdd: number }>;
    };
  };
  quantity: number;
  finish: string;
  shape: string;
  selectedOptions: Array<{
    optionId?: string;
    name?: string;
    optionName?: string;
    priceAdd: number;
    description?: string;
    image?: string;
  }>;
  selectedDynamicAttributes?: Array<{
    attributeTypeId: string;
    attributeName: string;
    attributeValue: any;
    label: string;
    priceMultiplier?: number;
    priceAdd: number;
    description?: string;
    image?: string;
  }>;
  totalPrice: number;
  status: 'request' | 'processing' | 'completed' | 'cancelled' | 'rejected';
  deliveryDate: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  packedAt?: string | null;
  movedToPackingAt?: string | null;
  dispatchedAt?: string | null;
  handedOverToCourierAt?: string | null;
  courierPartner?: string | null;
  trackingId?: string | null;
  uploadedDesign?: {
    frontImage?: {
      data: string;
      filename: string;
    };
    backImage?: {
      data: string;
      filename: string;
    };
  };
  advancePaid?: number;
  paymentStatus?: 'pending' | 'partial' | 'completed';
  paymentGatewayInvoiceId?: string | null;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  departmentStatuses?: Array<{
    department: {
      _id: string;
      name: string;
      sequence: number;
    } | string;
    status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'stopped';
    startedAt: string | null;
    completedAt: string | null;
  }>;
  productionTimeline?: Array<{
    department: {
      _id: string;
      name: string;
    } | string;
    action: string;
    timestamp: string;
  }>;
}

// Subcomponents
const TimelineStep: React.FC<{
  event: TimelineEvent;
  isLast: boolean;
  isActive: boolean;
}> = ({ event, isLast, isActive }) => {
  const isCompleted = event.status === 'completed';
  const isPending = event.status === 'pending';
  const [showTooltip, setShowTooltip] = useState(false);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const hasTimestamps = event.startedAt || event.completedAt || event.timestamp;

  return (
    <div className={`flex-1 relative ${isLast ? '' : 'mb-8 md:mb-0'}`}>
      {!isLast && (
        <div
          className={`absolute left-3.5 top-8 w-0.5 h-[calc(100%-2rem)] md:w-[calc(100%-2rem)] md:h-0.5 md:left-8 md:top-3.5 ${
            isCompleted ? 'bg-green-500' : 'bg-slate-200'
          }`}
        />
      )}
      <div className="flex md:flex-col items-center gap-4 md:gap-2">
        <div
          className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 cursor-pointer ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : isActive
              ? 'bg-white border-orange-500 text-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.2)]'
              : 'bg-white border-slate-300 text-slate-300'
          }`}
          onMouseEnter={() => hasTimestamps && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isActive ? (
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          
          {/* Hover Tooltip */}
          {showTooltip && hasTimestamps && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
              <div className="flex flex-col gap-1">
                {event.startedAt && (
                  <div>
                    <span className="font-semibold">Started:</span>{' '}
                    <span>{formatDateTime(event.startedAt)}</span>
                  </div>
                )}
                {event.completedAt && (
                  <div>
                    <span className="font-semibold">Completed:</span>{' '}
                    <span>{formatDateTime(event.completedAt)}</span>
                  </div>
                )}
                {!event.startedAt && !event.completedAt && event.timestamp && (
                  <div>
                    <span className="font-semibold">Date:</span>{' '}
                    <span>{formatDateTime(event.timestamp)}</span>
                  </div>
                )}
                {isActive && !event.completedAt && (
                  <div className="text-orange-300 mt-1">In Progress</div>
                )}
              </div>
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>
        <div className="md:text-center">
          <p
            className={`text-sm font-semibold ${
              isActive ? 'text-orange-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            {event.stage}
          </p>
          {event.timestamp && (
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(event.timestamp).toLocaleDateString()}
            </p>
          )}
          {isActive && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-orange-600 animate-pulse">
              In Progress
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const DepartmentChip: React.FC<{ status: DepartmentStatus }> = ({ status }) => {
  const getIcon = (name: string) => {
    if (name.includes('Prepress')) return <FileCheck className="w-3 h-3" />;
    if (name.includes('Print')) return <Printer className="w-3 h-3" />;
    if (name.includes('Cut')) return <Scissors className="w-3 h-3" />;
    if (name.includes('Plate')) return <Layers className="w-3 h-3" />;
    return <BoxIcon className="w-3 h-3" />;
  };

  const isCompleted = status.status === 'completed';
  const isInProgress = status.status === 'in_progress';

  return (
    <div
      className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
        isCompleted
          ? 'bg-green-50 border-green-200'
          : isInProgress
          ? 'bg-white border-orange-400 shadow-sm ring-1 ring-orange-100'
          : 'bg-slate-50 border-slate-200 opacity-60'
      }`}
    >
      <div
        className={`p-1.5 rounded-full ${
          isCompleted
            ? 'bg-green-100 text-green-700'
            : isInProgress
            ? 'bg-orange-100 text-orange-700'
            : 'bg-slate-200 text-slate-500'
        }`}
      >
        {getIcon(status.departmentName)}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p
            className={`text-xs font-semibold ${
              isCompleted ? 'text-green-900' : isInProgress ? 'text-orange-900' : 'text-slate-500'
            }`}
          >
            {status.departmentName}
          </p>
          {isInProgress && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
        </div>
        <p className="text-[10px] text-slate-500">
          {status.completedAt
            ? new Date(status.completedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : status.startedAt
            ? 'Started ' +
              new Date(status.startedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Pending'}
        </p>
      </div>
    </div>
  );
};

const ProductSpecsPanel: React.FC<{ order: Order }> = ({ order }) => {
  // Safety check for product
  if (!order.product) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Package className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-bold text-slate-900">Product Configuration</h3>
        </div>
        <p className="text-slate-600">Product information not available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <Package className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-slate-900">Product Configuration</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Shape</p>
          <p className="text-slate-900 font-semibold">{order.shape}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Finish</p>
          <p className="text-slate-900 font-semibold">{order.finish}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-3">Selected Options</h4>
        {order.selectedOptions && order.selectedOptions.length > 0 ? (
          <div className="space-y-3">
            {order.selectedOptions.map((opt, idx) => {
              // Handle both stored format (optionName) and display format (name)
              const name = opt.optionName || opt.name || 'Option';
              const priceAdd = opt.priceAdd || 0;
              
              // Use stored description or try to get from product options
              let description = opt.description;
              if (!description && order.product?.options && opt.optionId) {
                const productOption = order.product.options.find(
                  (o: any) => o._id === opt.optionId || o.name === name
                );
                description = productOption?.description;
              }
              
              return (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {opt.image ? (
                      <img src={opt.image} alt={name} className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{name}</p>
                      {description && <p className="text-xs text-slate-500">{description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-slate-900">
                      +{formatCurrency(priceAdd)}
                    </span>
                    {priceAdd < 10 && (
                      <span className="text-[10px] text-slate-500 uppercase font-medium">
                        Per Unit
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No additional options configured.
          </div>
        )}

        {/* Display Selected Dynamic Attributes */}
        {order.selectedDynamicAttributes && order.selectedDynamicAttributes.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Selected Attributes</h4>
            <div className="space-y-3">
              {order.selectedDynamicAttributes.map((attr, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {attr.image ? (
                      <img src={attr.image} alt={attr.attributeName} className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{attr.attributeName}</p>
                      <p className="text-xs text-slate-600 font-medium">{attr.label}</p>
                      {attr.description && <p className="text-xs text-slate-500 mt-0.5">{attr.description}</p>}
                    </div>
                  </div>
                  {(attr.priceAdd > 0 || attr.priceMultiplier) && (
                    <div className="text-right">
                      {attr.priceAdd > 0 ? (
                        <span className="block text-sm font-bold text-slate-900">
                          +{formatCurrency(attr.priceAdd)}/unit
                        </span>
                      ) : attr.priceMultiplier && attr.priceMultiplier !== 1 ? (
                        <span className="block text-sm font-bold text-slate-900">
                          +{formatCurrency((order.product?.basePrice || 0) * (attr.priceMultiplier - 1))}/unit
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PriceBreakdownPanel: React.FC<{ order: Order }> = ({ order }) => {
  // Safety check for product
  if (!order.product) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Price Breakdown</h3>
        <p className="text-slate-600">Product information not available.</p>
      </div>
    );
  }

  const orderForCalc: OrderForCalculation = {
    quantity: order.quantity,
    product: {
      basePrice: order.product?.basePrice || 0,
      gstPercentage: order.product?.gstPercentage || 18,
      options: order.product?.options || [],
      filters: order.product?.filters || {},
      quantityDiscounts: (order.product as any)?.quantityDiscounts || [],
    },
    finish: order.finish,
    shape: order.shape,
    selectedOptions: (order.selectedOptions || []).map((opt) => ({
      name: opt.optionName || opt.name,
      optionName: opt.optionName || opt.name,
      priceAdd: opt.priceAdd || 0,
    })),
    selectedDynamicAttributes: order.selectedDynamicAttributes?.map((attr) => ({
      attributeName: attr.attributeName,
      label: attr.label,
      priceMultiplier: attr.priceMultiplier,
      priceAdd: attr.priceAdd,
    })),
  };

  const calculations = calculateOrderBreakdown(orderForCalc) as any;
  
  // Get additional design charge from product
  const additionalDesignCharge = (order.product as any)?.additionalDesignCharge || 0;
  
  // New calculation order:
  // 1. Base Price = quantity * price
  // 2. Add options/attributes/charges
  // 3. Subtotal before discount
  // 4. Apply discount to subtotal
  // 5. Add design charge
  // 6. Subtotal including design charge (after discount)
  // 7. Add GST (on discounted subtotal + design charge)
  // 8. Final total
  
  const subtotalBeforeDiscount = calculations.subtotalBeforeGst || calculations.rawBaseTotal + calculations.optionBreakdowns.reduce((sum: number, opt: any) => sum + opt.cost, 0);
  const subtotalAfterDiscount = calculations.subtotalAfterDiscount || calculations.subtotal || subtotalBeforeDiscount;
  const discountAmount = calculations.discountAmount || (subtotalBeforeDiscount - subtotalAfterDiscount);
  const subtotalWithDesignCharge = subtotalAfterDiscount + additionalDesignCharge;
  // GST is calculated on discounted subtotal + design charge
  const gstAmount = (subtotalWithDesignCharge * (order.product?.gstPercentage || 18)) / 100;
  const finalTotal = subtotalWithDesignCharge + gstAmount;
  
  // Use stored totalPrice as source of truth
  const storedTotal = order.totalPrice;
  const categoryName =
    order.product?.subcategory && typeof order.product.subcategory === 'object'
      ? order.product.subcategory.name
      : order.product?.subcategory || 'N/A';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Price Breakdown</h3>
      <div className="space-y-3 text-sm">
        {/* Step 1: Base Price = quantity * price */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div className="text-slate-600">
            <span>
              Base Price ({order.quantity.toLocaleString()} ×{' '}
              {formatCurrency(order.product?.basePrice || 0)})
            </span>
          </div>
          <span className="font-medium text-slate-900">{formatCurrency(calculations.rawBaseTotal)}</span>
        </div>

        {/* Step 2: Options, Attributes, and Charges */}
        {calculations.optionBreakdowns.map((opt: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center text-slate-600">
            <span>
              {opt.name} {opt.isPerUnit ? `(${order.quantity} × ${formatCurrency(opt.priceAdd)})` : ''}
            </span>
            <span>+{formatCurrency(opt.cost)}</span>
          </div>
        ))}

        {/* Step 3: Subtotal (before discount) */}
        <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
          <span>Subtotal (Before Discount)</span>
          <span>{formatCurrency(subtotalBeforeDiscount)}</span>
        </div>

        {/* Step 4: Discount (applied to subtotal before GST) */}
        {calculations.discountPercentage > 0 && discountAmount > 0 && (
          <div className="flex justify-between items-center text-green-600 bg-green-50 p-2 rounded-md">
            <div>
              <span className="font-semibold">
                Bulk Discount ({calculations.discountPercentage}%)
              </span>
              <p className="text-xs opacity-80">Applied for {order.quantity} units</p>
            </div>
            <span className="font-bold">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        {/* Step 5: Subtotal (after discount) */}
        <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
          <span>Subtotal (After Discount)</span>
          <span>{formatCurrency(subtotalAfterDiscount)}</span>
        </div>

        {/* Step 6: Additional Design Charge */}
        {additionalDesignCharge > 0 && (
          <div className="flex justify-between items-center text-slate-600">
            <span>Additional Design Charge</span>
            <span>+{formatCurrency(additionalDesignCharge)}</span>
          </div>
        )}

        {/* Step 7: Subtotal (including design charge) */}
        {additionalDesignCharge > 0 && (
          <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
            <span>Subtotal (Including Design Charge)</span>
            <span>{formatCurrency(subtotalWithDesignCharge)}</span>
          </div>
        )}

        {/* Step 8: GST (calculated on discounted subtotal + design charge) */}
        <div className="flex justify-between items-center text-slate-500 text-xs">
          <span>GST ({order.product?.gstPercentage || 18}%)</span>
          <span>+{formatCurrency(gstAmount)}</span>
        </div>

        {/* Advance Paid / Balance Due (before Total Amount) */}
        {(order.advancePaid !== undefined && order.advancePaid > 0) && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500">Advance Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(order.advancePaid || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Balance Due</span>
              <span
                className={`font-bold ${
                  order.totalPrice - (order.advancePaid || 0) > 0
                    ? 'text-red-600'
                    : 'text-slate-400'
                }`}
              >
                {formatCurrency(order.totalPrice - (order.advancePaid || 0))}
              </span>
            </div>
          </div>
        )}

        {/* Step 9: Final Total - Displayed at the end */}
        <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-300">
          <span className="text-lg font-bold text-slate-900">Total Amount</span>
          <span className="text-xl font-bold text-brand-600">{formatCurrency(storedTotal)}</span>
        </div>
      </div>
    </div>
  );
};

const FileUploadPanel: React.FC<{ order: Order }> = ({ order }) => {
  const files: Array<{ type: string; fileName: string; uploadedAt: string; sizeMb: number; data?: string }> = [];

  if (order.uploadedDesign?.frontImage) {
    files.push({
      type: 'front',
      fileName: order.uploadedDesign.frontImage.filename || 'front-design.png',
      uploadedAt: order.createdAt,
      sizeMb: 0, // Size not available in current structure
      data: order.uploadedDesign.frontImage.data,
    });
  }

  if (order.uploadedDesign?.backImage) {
    files.push({
      type: 'back',
      fileName: order.uploadedDesign.backImage.filename || 'back-design.png',
      uploadedAt: order.createdAt,
      sizeMb: 0,
      data: order.uploadedDesign.backImage.data,
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-slate-900">Design Files (CMYK Format)</h3>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
          Max {order.product?.maxFileSizeMB || 10}MB
        </span>
      </div>

      {files.length > 0 ? (
        <div className="space-y-4 mb-6">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50 group hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-slate-400 border border-slate-200">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.fileName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="uppercase bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium">{file.type}</span>
                      <span>CMYK JPEG</span>
                      {file.sizeMb > 0 && ` • ${file.sizeMb} MB`}
                      {` • ${new Date(file.uploadedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                {file.data && (
                  <a
                    href={file.data}
                    download={file.fileName}
                    className="text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-white transition-colors"
                    title="Download image"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
              {file.data && (
                <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <img
                    src={file.data}
                    alt={`${file.type} design preview`}
                    className="w-full h-auto max-h-64 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm mb-4 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>No files uploaded yet.</p>
        </div>
      )}
    </div>
  );
};

// Main OrderDetails Component
const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is required');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order details');
        }

        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, navigate]);


  // Transform backend data to match expected format
  const getProductionTimeline = (): TimelineEvent[] => {
    if (!order) return [];

    // Helper to get first department start time
    const getFirstDepartmentStart = () => {
      const firstDept = order.departmentStatuses?.find((ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'in_progress' || status === 'completed';
      });
      return typeof firstDept === 'object' ? firstDept.startedAt : undefined;
    };

    // Helper to get last department completion time
    const getLastDepartmentComplete = () => {
      const completedDepts = order.departmentStatuses?.filter((ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'completed';
      });
      if (!completedDepts || completedDepts.length === 0) return undefined;
      
      const lastCompleted = completedDepts.reduce((latest, ds) => {
        const dsObj = typeof ds === 'object' ? ds : null;
        const latestObj = typeof latest === 'object' ? latest : null;
        if (!dsObj?.completedAt) return latest;
        if (!latestObj?.completedAt) return ds;
        return new Date(dsObj.completedAt) > new Date(latestObj.completedAt) ? ds : latest;
      });
      
      return typeof lastCompleted === 'object' ? lastCompleted.completedAt : undefined;
    };

    const stages: TimelineEvent[] = [
      {
        stage: 'Order Placed',
        status: 'completed',
        timestamp: order.createdAt,
        startedAt: order.createdAt,
        completedAt: order.createdAt,
      },
    ];

    // Design & File Prep
    const fileUploadedAt = order.uploadedDesign?.frontImage || order.uploadedDesign?.backImage 
      ? order.createdAt 
      : undefined;
    
    if (fileUploadedAt) {
      stages.push({
        stage: 'Design & File Prep',
        status: 'completed',
        timestamp: fileUploadedAt,
        startedAt: order.createdAt,
        completedAt: fileUploadedAt,
      });
    } else {
      stages.push({
        stage: 'Design & File Prep',
        status: 'pending',
      });
    }

    // Production
    const hasProductionStarted = order.departmentStatuses?.some(
      (ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'in_progress' || status === 'completed';
      }
    );

    if (hasProductionStarted) {
      const allCompleted = order.departmentStatuses?.every((ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'completed';
      });

      stages.push({
        stage: 'Production',
        status: allCompleted ? 'completed' : 'in_progress',
        timestamp: getFirstDepartmentStart(),
        startedAt: getFirstDepartmentStart(),
        completedAt: allCompleted ? getLastDepartmentComplete() : undefined,
      });
    } else {
      stages.push({
        stage: 'Production',
        status: 'pending',
      });
    }

    // Packing
    const packedAt = order.packedAt || (order.status === 'completed' ? order.updatedAt : undefined);
    if (packedAt) {
      stages.push({
        stage: 'Packing',
        status: 'completed',
        timestamp: packedAt,
        startedAt: order.movedToPackingAt || packedAt,
        completedAt: packedAt,
      });
    } else {
      stages.push({
        stage: 'Packing',
        status: 'pending',
      });
    }

    // Courier
    const dispatchedAt = order.dispatchedAt || order.handedOverToCourierAt;
    if (order.courierPartner || order.trackingId || dispatchedAt) {
      stages.push({
        stage: 'Courier',
        status: 'completed',
        timestamp: dispatchedAt || order.updatedAt,
        startedAt: dispatchedAt || order.handedOverToCourierAt || order.updatedAt,
        completedAt: order.deliveredAt || undefined,
      });
    } else {
      stages.push({
        stage: 'Courier',
        status: 'pending',
      });
    }

    return stages;
  };

  const getDepartmentStatuses = (): DepartmentStatus[] => {
    if (!order?.departmentStatuses) return [];

    return order.departmentStatuses
      .map((ds) => {
        const dept = typeof ds.department === 'object' ? ds.department : null;
        const status = typeof ds === 'object' ? ds.status : 'pending';
        return {
          departmentName: dept?.name || 'Unknown',
          status: status as 'completed' | 'in_progress' | 'pending',
          startedAt: typeof ds === 'object' ? ds.startedAt || undefined : undefined,
          completedAt: typeof ds === 'object' ? ds.completedAt || undefined : undefined,
        };
      })
      .sort((a, b) => {
        // Sort by sequence if available
        const deptA = order.departmentStatuses?.find(
          (ds) => {
            const dept = typeof ds.department === 'object' ? ds.department : null;
            return dept?.name === a.departmentName;
          }
        );
        const deptB = order.departmentStatuses?.find(
          (ds) => {
            const dept = typeof ds.department === 'object' ? ds.department : null;
            return dept?.name === b.departmentName;
          }
        );
        const seqA = typeof deptA?.department === 'object' ? deptA.department.sequence : 0;
        const seqB = typeof deptB?.department === 'object' ? deptB.department.sequence : 0;
        return seqA - seqB;
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-900 font-semibold mb-2">Error loading order</p>
          <p className="text-slate-600 mb-4">{error || 'Order not found'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // Safety check for product
  if (!order.product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-900 font-semibold mb-2">Product information missing</p>
          <p className="text-slate-600 mb-4">This order is missing product details. Please contact support.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const isPaymentPending = order.paymentStatus !== 'completed';
  const productionTimeline = getProductionTimeline();
  const departmentStatuses = getDepartmentStatuses();
  const categoryName =
    typeof order.product.subcategory === 'object'
      ? order.product.subcategory.name
      : order.product.subcategory || 'N/A';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackButton fallbackPath="/profile" label="Back to Orders" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* Subcategory Image on Left */}
              {(() => {
                const subcategory = order.product?.subcategory;
                const subcategoryImage =
                  typeof subcategory === 'object' ? subcategory?.image : null;
                return subcategoryImage ? (
                  <img
                    src={subcategoryImage}
                    alt="Subcategory"
                    className="hidden md:block w-24 h-24 object-cover rounded-lg shadow-sm border border-slate-100"
                  />
                ) : order.product?.image ? (
                  <img
                    src={order.product.image}
                    alt={order.product.name}
                    className="hidden md:block w-24 h-24 object-cover rounded-lg shadow-sm border border-slate-100"
                  />
                ) : null;
              })()}

              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'processing'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {order.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-1">
                  {(() => {
                    const subcategory = order.product?.subcategory;
                    if (subcategory && typeof subcategory === 'object' && subcategory?.category) {
                      return `${subcategory.category.name} • ${subcategory.name}`;
                    } else if (subcategory && typeof subcategory === 'object') {
                      return subcategory.name;
                    }
                    return categoryName;
                  })()}
                </div>
                <p className="text-slate-600 font-medium">{order.product?.name || 'Product'}</p>

                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Est. Delivery:{' '}
                    {order.deliveryDate
                      ? new Date(order.deliveryDate).toLocaleDateString()
                      : 'Not set'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" /> {order.quantity.toLocaleString()} units
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 md:self-start">
              {order.paymentGatewayInvoiceId && (
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                  <Download className="w-4 h-4" /> Invoice
                </button>
              )}
              <button className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                <HelpCircle className="w-4 h-4" /> Support
              </button>
            </div>
          </div>
        </div>

        {isPaymentPending ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Required</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              Your order has been created but production will not start until payment is confirmed.
            </p>
            <button className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/20 transition-all">
              Pay {formatCurrency(order.totalPrice)} Now
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 overflow-hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-8">
                Order Status
              </h3>
              <div className="flex flex-col md:flex-row justify-between relative">
                {productionTimeline.map((event, idx) => (
                  <TimelineStep
                    key={idx}
                    event={event}
                    isLast={idx === productionTimeline.length - 1}
                    isActive={event.status === 'in_progress'}
                  />
                ))}
              </div>

              {departmentStatuses.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-slate-900">Production Sequence</h4>
                    <span className="text-xs text-slate-500">Live Updates</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {departmentStatuses.map((dept, idx) => (
                      <React.Fragment key={idx}>
                        <DepartmentChip status={dept} />
                        {idx < departmentStatuses.length - 1 && (
                          <div className="w-8 h-0.5 bg-slate-200 shrink-0 self-center" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProductSpecsPanel order={order} />
            <FileUploadPanel order={order} />

            {order.shippingAddress && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-brand-600" />
                  <h3 className="text-lg font-bold text-slate-900">Delivery Location</h3>
                </div>
                <div className="pl-8">
                  <p className="text-slate-900 font-medium">{order.shippingAddress.street}</p>
                  <p className="text-slate-600">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                  <p className="text-slate-600">{order.shippingAddress.country}</p>
                </div>
              </div>
            )}

            {order.status === 'completed' && (order.courierPartner || order.trackingId) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-5 h-5 text-brand-600" />
                  <h3 className="text-lg font-bold text-slate-900">Tracking Information</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">
                    Tracking Number:{' '}
                    <span className="font-mono text-slate-900">
                      {order.trackingId || 'TRK-99887766'}
                    </span>
                  </p>
                  {order.courierPartner && (
                    <p className="text-sm text-slate-600 mt-1">
                      Courier: <span className="font-medium">{order.courierPartner}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <PriceBreakdownPanel order={order} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
