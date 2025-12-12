import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Clock,
    Package,
    Truck,
    FileText,
    Circle,
    Loader
} from 'lucide-react';

interface TimelineStage {
    stage: string;
    stageNumber: number;
    status: 'completed' | 'in_progress' | 'pending';
    timestamp: string | null;
    details: any;
}

interface OrderTimelineProps {
    timeline: TimelineStage[];
    orderNumber: string;
    onStageClick?: (stage: TimelineStage) => void;
}

const OrderTimeline: React.FC<OrderTimelineProps> = ({
    timeline,
    orderNumber,
    onStageClick
}) => {
    if (!timeline || timeline.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <p className="text-slate-500">No timeline data available</p>
            </div>
        );
    }

    const getStageIcon = (stageNumber: number, status: string) => {
        const iconClass = "w-6 h-6";

        if (status === 'completed') {
            return <CheckCircle2 className={`${iconClass} text-green-600`} />;
        } else if (status === 'in_progress') {
            return <Loader className={`${iconClass} text-orange-500 animate-spin`} />;
        } else {
            return <Circle className={`${iconClass} text-slate-300`} />;
        }
    };

    const getStageColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 border-green-500 text-green-700';
            case 'in_progress':
                return 'bg-orange-100 border-orange-500 text-orange-700';
            default:
                return 'bg-slate-50 border-slate-200 text-slate-400';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Pending';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">Order Timeline</h3>
                <p className="text-sm text-slate-500">Track your order progress</p>
            </div>

            {/* Desktop View - Horizontal Timeline */}
            <div className="hidden md:block">
                <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200">
                        <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{
                                width: `${(timeline.filter(s => s.status === 'completed').length / timeline.length) * 100}%`
                            }}
                        />
                    </div>

                    {/* Stages */}
                    <div className="relative flex justify-between">
                        {timeline.map((stage, index) => (
                            <motion.div
                                key={stage.stageNumber}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex flex-col items-center cursor-pointer ${stage.status === 'pending' ? 'opacity-50' : ''
                                    }`}
                                onClick={() => onStageClick && onStageClick(stage)}
                            >
                                {/* Icon Circle */}
                                <div className={`
                  w-16 h-16 rounded-full border-4 flex items-center justify-center
                  transition-all duration-300 hover:scale-110
                  ${getStageColor(stage.status)}
                  ${stage.status === 'in_progress' ? 'animate-pulse' : ''}
                `}>
                                    {getStageIcon(stage.stageNumber, stage.status)}
                                </div>

                                {/* Stage Name */}
                                <div className="mt-4 text-center max-w-[120px]">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {stage.stage}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatDate(stage.timestamp)}
                                    </p>
                                </div>

                                {/* Status Badge */}
                                {stage.status !== 'pending' && (
                                    <div className={`
                    mt-2 px-2 py-1 rounded-full text-xs font-medium
                    ${stage.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                  `}>
                                        {stage.status === 'completed' ? 'Completed' : 'In Progress'}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile View - Vertical Timeline */}
            <div className="md:hidden space-y-4">
                {timeline.map((stage, index) => (
                    <motion.div
                        key={stage.stageNumber}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`
              relative pl-12 pb-6 border-l-4 cursor-pointer
              ${stage.status === 'completed' ? 'border-green-500' :
                                stage.status === 'in_progress' ? 'border-orange-500' : 'border-slate-200'}
              ${stage.status === 'pending' ? 'opacity-50' : ''}
            `}
                        onClick={() => onStageClick && onStageClick(stage)}
                    >
                        {/* Icon */}
                        <div className={`
              absolute left-[-20px] top-0 w-10 h-10 rounded-full border-4
              flex items-center justify-center bg-white
              ${getStageColor(stage.status)}
              ${stage.status === 'in_progress' ? 'animate-pulse' : ''}
            `}>
                            {getStageIcon(stage.stageNumber, stage.status)}
                        </div>

                        {/* Content */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-slate-900">{stage.stage}</h4>
                                {stage.status !== 'pending' && (
                                    <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${stage.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                  `}>
                                        {stage.status === 'completed' ? 'Completed' : 'In Progress'}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500">
                                {formatDate(stage.timestamp)}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default OrderTimeline;
