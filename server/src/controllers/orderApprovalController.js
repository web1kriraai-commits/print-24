import Order from '../models/orderModal.js';
import Product from '../models/productModal.js';
import Department from '../models/departmentModal.js';

/**
 * Admin endpoint to approve order and ensure it's properly assigned to departments
 * This guarantees the order will appear in employee dashboard
 * 
 * POST /api/orders/:orderId/approve
 */
export const approveOrderForProduction = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { deliveryDate, adminNotes } = req.body;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if already approved
        if (order.status === 'approved' || order.status === 'processing' || order.status === 'completed') {
            return res.status(400).json({
                error: 'Order is already approved or in production',
                currentStatus: order.status
            });
        }

        // Get product with production sequence
        const productId = order.product._id || order.product;
        const product = await Product.findById(productId).populate('productionSequence');

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Verify product has production sequence
        if (!product.productionSequence || product.productionSequence.length === 0) {
            return res.status(400).json({
                error: 'Product has no production sequence defined. Please configure departments for this product first.',
                productId: product._id,
                productName: product.name
            });
        }

        // Get departments in sequence order
        const deptIds = product.productionSequence.map(dept =>
            typeof dept === 'object' ? dept._id : dept
        );

        const departments = await Department.find({
            _id: { $in: deptIds },
            isEnabled: true
        });

        if (departments.length === 0) {
            return res.status(400).json({
                error: 'No enabled departments found in production sequence',
                sequenceIds: deptIds
            });
        }

        // Create a map for O(1) lookup and maintain sequence order
        const deptMap = new Map(departments.map(d => [d._id.toString(), d]));
        const departmentsInOrder = deptIds
            .map(id => {
                const idStr = typeof id === 'object' ? id.toString() : id?.toString();
                return idStr ? deptMap.get(idStr) : null;
            })
            .filter(d => d !== null && d !== undefined);

        if (departmentsInOrder.length === 0) {
            return res.status(400).json({
                error: 'No valid departments found in sequence'
            });
        }

        // Get first department
        const firstDept = departmentsInOrder[0];
        const now = new Date();

        // Initialize departmentStatuses array if it doesn't exist
        if (!order.departmentStatuses) {
            order.departmentStatuses = [];
        }

        // Check if first department already has a status entry
        let deptStatusIndex = order.departmentStatuses.findIndex(
            (ds) => {
                const deptId = typeof ds.department === 'object'
                    ? ds.department._id?.toString()
                    : ds.department?.toString();
                return deptId === firstDept._id.toString();
            }
        );

        if (deptStatusIndex === -1) {
            // Create new department status entry
            order.departmentStatuses.push({
                department: firstDept._id,
                status: 'pending', // Waiting for department to start
                whenAssigned: now,
                startedAt: null,
                pausedAt: null,
                completedAt: null,
                stoppedAt: null,
                operator: null,
                notes: '',
            });
        } else {
            // Update existing entry to pending
            const existingStatus = order.departmentStatuses[deptStatusIndex];
            existingStatus.status = 'pending';
            if (!existingStatus.whenAssigned) {
                existingStatus.whenAssigned = now;
            }
        }

        // Set current department tracking
        order.currentDepartment = firstDept._id;
        order.currentDepartmentIndex = 0;

        // CRITICAL: Set status to 'approved' so it shows in employee dashboard
        order.status = 'approved';

        // Update delivery date and notes if provided
        if (deliveryDate) {
            order.deliveryDate = new Date(deliveryDate);
        }
        if (adminNotes !== undefined) {
            order.adminNotes = adminNotes;
        }

        // Mark arrays as modified for Mongoose
        order.markModified('departmentStatuses');

        // Add to production timeline
        if (!order.productionTimeline) {
            order.productionTimeline = [];
        }

        order.productionTimeline.push({
            department: firstDept._id,
            action: 'requested',
            timestamp: now,
            operator: req.user?.id || null,
            notes: `Order approved and assigned to ${firstDept.name}`,
        });

        order.markModified('productionTimeline');

        // Save the order
        await order.save();

        // Populate for response
        await order.populate([
            { path: 'product', select: 'name image' },
            { path: 'user', select: 'name email' },
            { path: 'departmentStatuses.department', select: 'name sequence' },
            { path: 'currentDepartment', select: 'name sequence' }
        ]);

        res.status(200).json({
            success: true,
            message: `Order approved and assigned to ${firstDept.name}`,
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                currentDepartment: {
                    _id: firstDept._id,
                    name: firstDept.name
                },
                departmentStatuses: order.departmentStatuses.map(ds => ({
                    department: ds.department?.name || 'Unknown',
                    status: ds.status,
                    whenAssigned: ds.whenAssigned
                })),
                willShowInEmployeeDashboard: true
            }
        });

    } catch (error) {
        console.error('Approve order error:', error);
        res.status(500).json({
            error: 'Failed to approve order',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Diagnostic endpoint to check why an order isn't showing in employee dashboard
 * GET /api/orders/:orderId/department-status
 */
export const checkOrderDepartmentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate('product')
            .populate('departmentStatuses.department')
            .populate('currentDepartment')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const productId = order.product._id || order.product;
        const product = await Product.findById(productId).populate('productionSequence');

        const diagnosis = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            orderStatusIsValid: ['approved', 'processing', 'completed'].includes(order.status),
            currentDepartment: order.currentDepartment?.name || 'None',
            currentDepartmentIndex: order.currentDepartmentIndex,

            departmentStatuses: {
                count: order.departmentStatuses?.length || 0,
                entries: order.departmentStatuses?.map(ds => ({
                    department: ds.department?.name || 'Unknown',
                    departmentId: ds.department?._id,
                    status: ds.status,
                    whenAssigned: ds.whenAssigned,
                    startedAt: ds.startedAt,
                    completedAt: ds.completedAt
                })) || []
            },

            productionSequence: {
                exists: !!product?.productionSequence,
                length: product?.productionSequence?.length || 0,
                departments: product?.productionSequence?.map(d => ({
                    id: d._id,
                    name: d.name,
                    sequence: d.sequence
                })) || []
            },

            willShowInEmployeeDashboard:
                ['approved', 'processing', 'completed'].includes(order.status) &&
                order.departmentStatuses?.length > 0,

            issues: []
        };

        // Identify issues
        if (!['approved', 'processing', 'completed'].includes(order.status)) {
            diagnosis.issues.push({
                issue: 'Invalid order status',
                description: `Order status is "${order.status}" but must be "approved", "processing", or "completed"`,
                fix: 'Change order status to "approved"'
            });
        }

        if (!order.departmentStatuses || order.departmentStatuses.length === 0) {
            diagnosis.issues.push({
                issue: 'No department assignments',
                description: 'Order has no departmentStatuses entries',
                fix: 'Approve the order using POST /api/orders/:orderId/approve'
            });
        }

        if (!product?.productionSequence || product.productionSequence.length === 0) {
            diagnosis.issues.push({
                issue: 'Product has no production sequence',
                description: 'Product must have departments configured',
                fix: 'Configure production sequence for this product in admin panel'
            });
        }

        res.status(200).json(diagnosis);

    } catch (error) {
        console.error('Check department status error:', error);
        res.status(500).json({
            error: 'Failed to check department status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
