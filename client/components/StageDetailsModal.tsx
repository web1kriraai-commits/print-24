import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, FileText, Package, Truck, CheckCircle2 } from 'lucide-react';

interface TimelineStage {
    stage: string;
    stageNumber: number;
    status: 'completed' | 'in_progress' | 'pending';
    timestamp: string | null;
    details: any;
}

interface StageDetailsModalProps {
    stage: TimelineStage | null;
    isOpen: boolean;
    onClose: () => void;
}

const StageDetailsModal: React.FC<StageDetailsModalProps> = ({ stage, isOpen, onClose }) => {
    if (!stage) return null;

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return 'Not available';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const renderStageDetails = () => {
        switch (stage.stageNumber) {
            case 1: // Order Placed
                return (
                    <div className="space-y-4">
                        <DetailRow label="Order Number" value={stage.details.orderNumber} />
                        <DetailRow label="Placed By" value={stage.details.placedBy} />
                        <DetailRow label="Placed On" value={formatDateTime(stage.details.placedOn)} />
                        <DetailRow label="Total Amount" value={`₹${stage.details.totalAmount?.toFixed(2) || 0}`} />
                        <DetailRow
                            label="Payment Status"
                            value={stage.details.paymentStatus}
                            badge={stage.details.paymentStatus === 'completed' ? 'success' : 'warning'}
                        />
                    </div>
                );

            case 2: // Design & File Preparation
                return (
                    <div className="space-y-4">
                        <DetailRow label="Design Option" value={stage.details.designOption || 'Not specified'} />

                        {stage.details.designOption === 'Need a Designer' && (
                            <>
                                <DetailRow label="Designer" value={stage.details.designer || 'Not assigned'} />
                                {stage.details.designSentOn && (
                                    <DetailRow label="Design Sent On" value={formatDateTime(stage.details.designSentOn)} />
                                )}
                                <DetailRow
                                    label="Customer Response"
                                    value={stage.details.customerResponse || 'Pending'}
                                    badge={
                                        stage.details.customerResponse === 'approved' ? 'success' :
                                            stage.details.customerResponse === 'change_requested' ? 'warning' : 'info'
                                    }
                                />

                                {stage.details.timeline && stage.details.timeline.length > 0 && (
                                    <div className="mt-4">
                                        <h5 className="font-semibold text-sm text-slate-700 mb-2">Design Timeline:</h5>
                                        <div className="space-y-2">
                                            {stage.details.timeline.map((event: any, idx: number) => (
                                                <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-medium text-slate-900">{event.action}</span>
                                                        <span className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</span>
                                                    </div>
                                                    {event.operator && (
                                                        <p className="text-xs text-slate-600 mt-1">By: {event.operator}</p>
                                                    )}
                                                    {event.notes && (
                                                        <p className="text-xs text-slate-600 mt-1">{event.notes}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {stage.details.designOption === 'I will upload my own file' && (
                            <>
                                {stage.details.fileUploadedOn && (
                                    <DetailRow label="File Uploaded On" value={formatDateTime(stage.details.fileUploadedOn)} />
                                )}
                                <DetailRow
                                    label="File Status"
                                    value={stage.details.fileStatus || 'Under checking'}
                                    badge={
                                        stage.details.fileStatus === 'approved_for_print' ? 'success' :
                                            stage.details.fileStatus === 'reupload_required' ? 'error' : 'warning'
                                    }
                                />
                                {stage.details.rejectionReason && (
                                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                        <p className="text-sm text-red-800">
                                            <strong>Reason:</strong> {stage.details.rejectionReason}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );

            case 3: // Production
                return (
                    <div className="space-y-4">
                        {stage.details.departments && stage.details.departments.length > 0 && (
                            <div>
                                <h5 className="font-semibold text-sm text-slate-700 mb-3">Department Progress:</h5>
                                <div className="space-y-3">
                                    {stage.details.departments.map((dept: any, idx: number) => (
                                        <div key={idx} className={`
                      p-4 rounded-lg border-2
                      ${dept.status === 'completed' ? 'bg-green-50 border-green-200' :
                                                dept.status === 'in_progress' ? 'bg-orange-50 border-orange-200' :
                                                    'bg-slate-50 border-slate-200'}
                    `}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h6 className="font-semibold text-slate-900">{dept.name}</h6>
                                                <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${dept.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        dept.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-600'}
                        `}>
                                                    {dept.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <p className="text-slate-600">Operator: {dept.operator || 'Not assigned'}</p>
                                                {dept.startedAt && (
                                                    <p className="text-slate-600">Started: {formatDateTime(dept.startedAt)}</p>
                                                )}
                                                {dept.completedAt && (
                                                    <p className="text-slate-600">Completed: {formatDateTime(dept.completedAt)}</p>
                                                )}
                                                {dept.notes && (
                                                    <p className="text-slate-600 italic">Notes: {dept.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {stage.details.productionDetails && Object.keys(stage.details.productionDetails).length > 0 && (
                            <div className="mt-4">
                                <h5 className="font-semibold text-sm text-slate-700 mb-2">Production Steps:</h5>
                                <div className="space-y-2">
                                    {Object.entries(stage.details.productionDetails).map(([key, value]: [string, any]) => (
                                        <div key={key} className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            <span className="text-slate-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                            <span className="text-slate-600">{formatDateTime(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 4: // Packing & Dispatch
                return (
                    <div className="space-y-4">
                        {stage.details.movedToPackingAt && (
                            <DetailRow label="Moved to Packing" value={formatDateTime(stage.details.movedToPackingAt)} />
                        )}
                        {stage.details.packedAt && (
                            <>
                                <DetailRow label="Packed On" value={formatDateTime(stage.details.packedAt)} />
                                <DetailRow label="Packed By" value={stage.details.packedBy || 'Packing Team'} />
                                <DetailRow label="Number of Boxes" value={stage.details.numberOfBoxes || 1} />
                            </>
                        )}
                        {stage.details.invoiceNumber && (
                            <>
                                <DetailRow label="Invoice Number" value={stage.details.invoiceNumber} />
                                {stage.details.invoiceGeneratedAt && (
                                    <DetailRow label="Invoice Generated" value={formatDateTime(stage.details.invoiceGeneratedAt)} />
                                )}
                            </>
                        )}
                        {stage.details.movedToDispatchAt && (
                            <DetailRow label="Moved to Dispatch" value={formatDateTime(stage.details.movedToDispatchAt)} />
                        )}
                        {stage.details.handedOverToCourierAt && (
                            <DetailRow label="Handed to Courier" value={formatDateTime(stage.details.handedOverToCourierAt)} />
                        )}
                    </div>
                );

            case 5: // Courier & Delivery
                return (
                    <div className="space-y-4">
                        <DetailRow label="Courier Partner" value={stage.details.courierPartner || 'To be assigned'} />
                        <DetailRow label="Tracking ID" value={stage.details.trackingId || 'Pending'} />
                        {stage.details.dispatchedAt && (
                            <DetailRow label="Dispatched On" value={formatDateTime(stage.details.dispatchedAt)} />
                        )}
                        {stage.details.courierStatus && (
                            <DetailRow
                                label="Courier Status"
                                value={stage.details.courierStatus.replace('_', ' ')}
                                badge={stage.details.courierStatus === 'delivered' ? 'success' : 'info'}
                            />
                        )}
                        {stage.details.deliveredAt && (
                            <DetailRow label="Delivered On" value={formatDateTime(stage.details.deliveredAt)} />
                        )}
                        {stage.details.trackingUrl && (
                            <a
                                href={stage.details.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Track on Courier Website
                            </a>
                        )}

                        {stage.details.timeline && stage.details.timeline.length > 0 && (
                            <div className="mt-4">
                                <h5 className="font-semibold text-sm text-slate-700 mb-2">Courier Timeline:</h5>
                                <div className="space-y-2">
                                    {stage.details.timeline.map((event: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm">
                                            <div className="flex justify-between items-start">
                                                <span className="font-medium text-slate-900">{event.status}</span>
                                                <span className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</span>
                                            </div>
                                            {event.location && (
                                                <p className="text-xs text-slate-600 mt-1">Location: {event.location}</p>
                                            )}
                                            {event.notes && (
                                                <p className="text-xs text-slate-600 mt-1">{event.notes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return <p className="text-slate-500">No details available</p>;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black bg-opacity-50 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-bold">{stage.stage}</h3>
                                        <p className="text-blue-100 mt-1">
                                            {stage.status === 'completed' ? 'Completed' :
                                                stage.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                                {renderStageDetails()}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// Helper component for detail rows
const DetailRow: React.FC<{
    label: string;
    value: string | number;
    badge?: 'success' | 'warning' | 'error' | 'info'
}> = ({ label, value, badge }) => {
    const getBadgeColor = () => {
        switch (badge) {
            case 'success': return 'bg-green-100 text-green-700';
            case 'warning': return 'bg-orange-100 text-orange-700';
            case 'error': return 'bg-red-100 text-red-700';
            case 'info': return 'bg-blue-100 text-blue-700';
            default: return '';
        }
    };

    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-600">{label}:</span>
            {badge ? (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor()}`}>
                    {value}
                </span>
            ) : (
                <span className="text-sm text-slate-900 font-semibold">{value}</span>
            )}
        </div>
    );
};

export default StageDetailsModal;
