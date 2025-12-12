import Order from '../models/orderModal.js';
import Department from '../models/departmentModal.js';

/**
 * Format order into 5-stage timeline for customer view
 * Handles all edge cases and missing data
 */
export const formatOrderTimeline = (order) => {
    if (!order) {
        throw new Error('Order is required');
    }

    const timeline = [];

    // Stage 1: Order Placed (Always completed if order exists)
    timeline.push({
        stage: 'Order Placed',
        stageNumber: 1,
        status: 'completed',
        timestamp: order.createdAt,
        details: {
            orderNumber: order.orderNumber || 'N/A',
            placedBy: order.user?.name || 'Customer',
            placedOn: order.createdAt,
            orderId: order._id,
            paymentStatus: order.paymentStatus || 'pending',
            totalAmount: order.totalPrice || 0
        }
    });

    // Stage 2: Design & File Preparation
    const designStage = getDesignStage(order);
    timeline.push(designStage);

    // Stage 3: Production
    const productionStage = getProductionStage(order);
    timeline.push(productionStage);

    // Stage 4: Packing & Dispatch
    const packingStage = getPackingStage(order);
    timeline.push(packingStage);

    // Stage 5: Courier & Delivery
    const courierStage = getCourierStage(order);
    timeline.push(courierStage);

    return timeline;
};

/**
 * Get Design & File Preparation stage with edge case handling
 */
const getDesignStage = (order) => {
    const stage = {
        stage: 'Design & File Preparation',
        stageNumber: 2,
        status: 'pending',
        timestamp: null,
        details: {}
    };

    // Handle design option
    if (order.designOption === 'need_designer') {
        stage.details.designOption = 'Need a Designer';
        stage.details.designer = order.designerAssigned?.name || 'Our Design Team';

        if (order.designFileSentAt) {
            stage.status = order.customerResponse === 'approved' ? 'completed' : 'in_progress';
            stage.timestamp = order.designFileSentAt;
            stage.details.designSentOn = order.designFileSentAt;
            stage.details.customerResponse = order.customerResponse || 'pending';
        } else if (order.designerAssigned) {
            stage.status = 'in_progress';
            stage.timestamp = order.createdAt;
        }

        // Add design timeline if exists
        if (order.designTimeline && order.designTimeline.length > 0) {
            stage.details.timeline = order.designTimeline.map(event => ({
                action: event.action,
                timestamp: event.timestamp,
                operator: event.operator?.name || 'System',
                notes: event.notes || ''
            }));
        }
    } else if (order.designOption === 'upload_own') {
        stage.details.designOption = 'I will upload my own file';

        if (order.fileUploadedAt) {
            stage.timestamp = order.fileUploadedAt;
            stage.details.fileUploadedOn = order.fileUploadedAt;
            stage.details.fileStatus = order.fileStatus || 'under_checking';

            if (order.fileStatus === 'approved_for_print') {
                stage.status = 'completed';
            } else if (order.fileStatus === 'reupload_required') {
                stage.status = 'in_progress';
                stage.details.rejectionReason = order.fileRejectionReason || 'Please reupload file';
            } else {
                stage.status = 'in_progress';
            }
        }
    } else {
        // No design option selected yet (edge case)
        stage.details.designOption = 'Not specified';
        stage.status = 'pending';
    }

    return stage;
};

/**
 * Get Production stage with department tracking
 */
const getProductionStage = (order) => {
    const stage = {
        stage: 'Production',
        stageNumber: 3,
        status: 'pending',
        timestamp: null,
        details: {
            departments: [],
            productionDetails: {}
        }
    };

    // Check if production has started
    if (!order.departmentStatuses || order.departmentStatuses.length === 0) {
        return stage; // No departments assigned yet
    }

    // Map department statuses
    stage.details.departments = order.departmentStatuses.map(ds => ({
        name: ds.department?.name || 'Unknown Department',
        status: ds.status || 'pending',
        operator: ds.operator?.name || 'Not assigned',
        whenAssigned: ds.whenAssigned,
        startedAt: ds.startedAt,
        completedAt: ds.completedAt,
        notes: ds.notes || ''
    }));

    // Determine overall production status
    const hasStarted = order.departmentStatuses.some(ds =>
        ds.status === 'in_progress' || ds.status === 'completed'
    );
    const allCompleted = order.departmentStatuses.every(ds =>
        ds.status === 'completed'
    );
    const anyInProgress = order.departmentStatuses.some(ds =>
        ds.status === 'in_progress'
    );

    if (allCompleted) {
        stage.status = 'completed';
        // Find last completion timestamp
        const completionTimes = order.departmentStatuses
            .filter(ds => ds.completedAt)
            .map(ds => new Date(ds.completedAt));
        if (completionTimes.length > 0) {
            stage.timestamp = new Date(Math.max(...completionTimes));
        }
    } else if (anyInProgress || hasStarted) {
        stage.status = 'in_progress';
        // Find first start timestamp
        const startTimes = order.departmentStatuses
            .filter(ds => ds.startedAt)
            .map(ds => new Date(ds.startedAt));
        if (startTimes.length > 0) {
            stage.timestamp = new Date(Math.min(...startTimes));
        }
    }

    // Add production details if available
    if (order.productionDetails) {
        const details = {};
        if (order.productionDetails.plateMakingCompleted) {
            details.plateMaking = order.productionDetails.plateMakingCompleted;
        }
        if (order.productionDetails.printingCompleted) {
            details.printing = order.productionDetails.printingCompleted;
        }
        if (order.productionDetails.laminationCompleted) {
            details.lamination = order.productionDetails.laminationCompleted;
        }
        if (order.productionDetails.uvCompleted) {
            details.uv = order.productionDetails.uvCompleted;
        }
        if (order.productionDetails.qualityCheckCompleted) {
            details.qualityCheck = order.productionDetails.qualityCheckCompleted;
        }
        stage.details.productionDetails = details;
    }

    // Add production timeline if exists
    if (order.productionTimeline && order.productionTimeline.length > 0) {
        stage.details.timeline = order.productionTimeline.map(event => ({
            department: event.department?.name || 'Unknown',
            action: event.action,
            timestamp: event.timestamp,
            operator: event.operator?.name || 'System',
            notes: event.notes || ''
        }));
    }

    return stage;
};

/**
 * Get Packing & Dispatch stage
 */
const getPackingStage = (order) => {
    const stage = {
        stage: 'Packing & Dispatch',
        stageNumber: 4,
        status: 'pending',
        timestamp: null,
        details: {}
    };

    if (order.movedToPackingAt) {
        stage.status = 'in_progress';
        stage.timestamp = order.movedToPackingAt;
        stage.details.movedToPackingAt = order.movedToPackingAt;
    }

    if (order.packedAt) {
        stage.details.packedAt = order.packedAt;
        stage.details.packedBy = order.packedBy?.name || 'Packing Team';
        stage.details.numberOfBoxes = order.numberOfBoxes || 1;
    }

    if (order.invoiceGeneratedAt) {
        stage.details.invoiceNumber = order.invoiceNumber || 'Pending';
        stage.details.invoiceGeneratedAt = order.invoiceGeneratedAt;
        stage.details.invoiceUrl = order.invoiceUrl;
    }

    if (order.movedToDispatchAt) {
        stage.details.movedToDispatchAt = order.movedToDispatchAt;
    }

    if (order.handedOverToCourierAt) {
        stage.status = 'completed';
        stage.timestamp = order.handedOverToCourierAt;
        stage.details.handedOverToCourierAt = order.handedOverToCourierAt;
    }

    return stage;
};

/**
 * Get Courier & Delivery stage
 */
const getCourierStage = (order) => {
    const stage = {
        stage: 'Courier & Delivery',
        stageNumber: 5,
        status: 'pending',
        timestamp: null,
        details: {}
    };

    if (order.dispatchedAt || order.courierPartner || order.trackingId) {
        stage.status = 'in_progress';
        stage.timestamp = order.dispatchedAt;
        stage.details.dispatchedAt = order.dispatchedAt;
        stage.details.courierPartner = order.courierPartner || 'To be assigned';
        stage.details.trackingId = order.trackingId || 'Pending';
        stage.details.courierStatus = order.courierStatus || 'in_transit';
        stage.details.trackingUrl = order.courierTrackingUrl;
    }

    if (order.deliveredAt) {
        stage.status = 'completed';
        stage.timestamp = order.deliveredAt;
        stage.details.deliveredAt = order.deliveredAt;
    }

    // Add courier timeline if exists
    if (order.courierTimeline && order.courierTimeline.length > 0) {
        stage.details.timeline = order.courierTimeline.map(event => ({
            status: event.status,
            location: event.location || 'Unknown',
            timestamp: event.timestamp,
            notes: event.notes || ''
        }));
    }

    return stage;
};

/**
 * Get timeline for a specific order (API endpoint handler)
 */
export const getOrderTimeline = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        // Validate orderId
        if (!orderId || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID format' });
        }

        // Fetch order with all necessary populations
        const order = await Order.findById(orderId)
            .populate('user', 'name email')
            .populate('designerAssigned', 'name email')
            .populate('departmentStatuses.department', 'name')
            .populate('departmentStatuses.operator', 'name email')
            .populate('productionTimeline.department', 'name')
            .populate('productionTimeline.operator', 'name email')
            .populate('packedBy', 'name email')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check permissions - user must own the order or be admin/employee
        const userRole = req.user.role;
        const orderUserId = order.user?._id?.toString() || order.user?.toString();

        if (orderUserId !== userId && userRole !== 'admin' && userRole !== 'emp') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Format timeline
        const timeline = formatOrderTimeline(order);

        res.status(200).json({
            orderNumber: order.orderNumber,
            status: order.status,
            timeline
        });
    } catch (error) {
        console.error('Get order timeline error:', error);
        res.status(500).json({
            error: 'Failed to fetch order timeline',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get all orders for logged-in user (My Orders)
 */
export const getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalOrders = await Order.countDocuments({ user: userId });

        // Fetch orders with minimal data for list view
        const orders = await Order.find({ user: userId })
            .select('orderNumber product quantity totalPrice status createdAt updatedAt')
            .populate('product', 'name image')
            .sort({ createdAt: -1 }) // Newest first
            .limit(limit)
            .skip(skip)
            .lean();

        res.status(200).json({
            orders,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders,
                ordersPerPage: limit
            },
            latestOrder: orders.length > 0 ? orders[0] : null
        });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({
            error: 'Failed to fetch orders',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get orders for employee's department
 */
export const getDepartmentOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const statusFilter = req.query.status; // 'pending', 'in_progress', 'completed'

        // Find department where user is an operator
        const department = await Department.findOne({ operators: userId });

        if (!department) {
            return res.status(404).json({ error: 'You are not assigned to any department' });
        }

        // Build query
        const query = {
            'departmentStatuses': {
                $elemMatch: {
                    department: department._id
                }
            }
        };

        // Add status filter if provided
        if (statusFilter) {
            query['departmentStatuses'].$elemMatch.status = statusFilter;
        }

        const orders = await Order.find(query)
            .populate('product', 'name image')
            .populate('user', 'name email mobileNumber')
            .populate('departmentStatuses.department', 'name')
            .populate('departmentStatuses.operator', 'name')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            department: {
                id: department._id,
                name: department.name
            },
            orders
        });
    } catch (error) {
        console.error('Get department orders error:', error);
        res.status(500).json({
            error: 'Failed to fetch department orders',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Start work on order (employee action)
 */
export const startDepartmentWork = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        // Find department where user is an operator
        const department = await Department.findOne({ operators: userId });

        if (!department) {
            return res.status(403).json({ error: 'You are not assigned to any department' });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find department status for this department
        const deptStatusIndex = order.departmentStatuses.findIndex(
            ds => ds.department.toString() === department._id.toString()
        );

        if (deptStatusIndex === -1) {
            return res.status(400).json({ error: 'Order not assigned to your department' });
        }

        const deptStatus = order.departmentStatuses[deptStatusIndex];

        // Check if already started
        if (deptStatus.status === 'in_progress') {
            return res.status(400).json({ error: 'Work already in progress' });
        }

        if (deptStatus.status === 'completed') {
            return res.status(400).json({ error: 'Work already completed' });
        }

        // Update department status
        deptStatus.status = 'in_progress';
        deptStatus.startedAt = new Date();
        deptStatus.operator = userId;

        // Add to production timeline
        order.productionTimeline.push({
            department: department._id,
            action: 'started',
            timestamp: new Date(),
            operator: userId,
            notes: req.body.notes || `Work started by ${req.user.name || 'operator'}`
        });

        // Mark as modified for Mongoose
        order.markModified('departmentStatuses');
        order.markModified('productionTimeline');

        await order.save();

        res.status(200).json({
            message: 'Work started successfully',
            order
        });
    } catch (error) {
        console.error('Start department work error:', error);
        res.status(500).json({
            error: 'Failed to start work',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Complete work on order (employee action)
 */
export const completeDepartmentWork = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        // Find department where user is an operator
        const department = await Department.findOne({ operators: userId });

        if (!department) {
            return res.status(403).json({ error: 'You are not assigned to any department' });
        }

        const order = await Order.findById(orderId)
            .populate('product');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find department status
        const deptStatusIndex = order.departmentStatuses.findIndex(
            ds => ds.department.toString() === department._id.toString()
        );

        if (deptStatusIndex === -1) {
            return res.status(400).json({ error: 'Order not assigned to your department' });
        }

        const deptStatus = order.departmentStatuses[deptStatusIndex];

        // Check if work was started
        if (deptStatus.status !== 'in_progress') {
            return res.status(400).json({ error: 'Work must be started before completing' });
        }

        // Update department status
        deptStatus.status = 'completed';
        deptStatus.completedAt = new Date();

        // Add to production timeline
        order.productionTimeline.push({
            department: department._id,
            action: 'completed',
            timestamp: new Date(),
            operator: userId,
            notes: req.body.notes || `Work completed by ${req.user.name || 'operator'}`
        });

        // Check if this was the last department
        const allDepartmentsCompleted = order.departmentStatuses.every(
            ds => ds.status === 'completed'
        );

        if (allDepartmentsCompleted) {
            // Move to packing
            order.movedToPackingAt = new Date();
            order.status = 'processing'; // Or 'ready_for_packing'
        } else {
            // Move to next department if exists
            const currentIndex = order.currentDepartmentIndex || 0;
            const nextIndex = currentIndex + 1;

            if (nextIndex < order.departmentStatuses.length) {
                order.currentDepartmentIndex = nextIndex;
                order.currentDepartment = order.departmentStatuses[nextIndex].department;

                // Update next department status to pending
                order.departmentStatuses[nextIndex].status = 'pending';
                order.departmentStatuses[nextIndex].whenAssigned = new Date();

                // Add timeline entry
                order.productionTimeline.push({
                    department: order.departmentStatuses[nextIndex].department,
                    action: 'requested',
                    timestamp: new Date(),
                    operator: userId,
                    notes: 'Order moved to next department'
                });
            }
        }

        // Mark as modified
        order.markModified('departmentStatuses');
        order.markModified('productionTimeline');

        await order.save();

        res.status(200).json({
            message: 'Work completed successfully',
            order
        });
    } catch (error) {
        console.error('Complete department work error:', error);
        res.status(500).json({
            error: 'Failed to complete work',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
