// Helper function to ensure order is properly assigned to departments after approval
// This should be called after admin approves an order

import Order from '../models/orderModal.js';
import Product from '../models/productModal.js';
import Department from '../models/departmentModal.js';

/**
 * Assign order to first department in production sequence
 * This ensures the order appears in employee dashboard
 * 
 * @param {string} orderId - The order ID
 * @returns {Promise<Object>} Updated order
 */
export const assignOrderToDepartments = async (orderId) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // Get product with production sequence
        const productId = order.product._id || order.product;
        const product = await Product.findById(productId).populate('productionSequence');

        if (!product) {
            throw new Error('Product not found');
        }

        // Get departments in sequence order
        let departmentsToUse = [];
        if (product.productionSequence && product.productionSequence.length > 0) {
            const deptIds = product.productionSequence.map(dept =>
                typeof dept === 'object' ? dept._id : dept
            );
            const departments = await Department.find({
                _id: { $in: deptIds },
                isEnabled: true
            });

            // Create a map for O(1) lookup
            const deptMap = new Map(departments.map(d => [d._id.toString(), d]));
            departmentsToUse = deptIds
                .map(id => {
                    const idStr = typeof id === 'object' ? id.toString() : id?.toString();
                    return idStr ? deptMap.get(idStr) : null;
                })
                .filter(d => d !== null && d !== undefined);
        } else {
            // Fallback: use all enabled departments
            departmentsToUse = await Department.find({ isEnabled: true }).sort({ sequence: 1 });
        }

        if (departmentsToUse.length === 0) {
            throw new Error('No departments available for this product');
        }

        // Assign to first department
        const firstDept = departmentsToUse[0];
        const now = new Date();

        // Initialize departmentStatuses array if it doesn't exist
        if (!order.departmentStatuses) {
            order.departmentStatuses = [];
        }

        // Check if department status already exists
        let deptStatusIndex = order.departmentStatuses.findIndex(
            (ds) => {
                const deptId = typeof ds.department === 'object' ? ds.department._id?.toString() : ds.department?.toString();
                return deptId === firstDept._id.toString();
            }
        );

        if (deptStatusIndex === -1) {
            // Create new department status entry
            order.departmentStatuses.push({
                department: firstDept._id,
                status: 'pending',
                whenAssigned: now,
                startedAt: null,
                pausedAt: null,
                completedAt: null,
                stoppedAt: null,
                operator: null,
                notes: '',
            });
        } else {
            // Update existing department status
            const existingStatus = order.departmentStatuses[deptStatusIndex];
            existingStatus.status = 'pending';
            if (!existingStatus.whenAssigned) {
                existingStatus.whenAssigned = now;
            }
        }

        // Set current department
        order.currentDepartment = firstDept._id;
        order.currentDepartmentIndex = 0;

        // Ensure order status is 'approved' so it shows in employee dashboard
        if (order.status === 'request' || order.status === 'production_ready') {
            order.status = 'approved';
        }

        // Mark as modified for Mongoose
        order.markModified('departmentStatuses');

        // Add to production timeline
        if (!order.productionTimeline) {
            order.productionTimeline = [];
        }

        order.productionTimeline.push({
            department: firstDept._id,
            action: 'requested',
            timestamp: now,
            operator: null,
            notes: `Order assigned to ${firstDept.name}`,
        });

        order.markModified('productionTimeline');

        await order.save();

        return order;
    } catch (error) {
        console.error('Error assigning order to departments:', error);
        throw error;
    }
};

/**
 * Verify order is properly configured for department workflow
 * Returns diagnostic information
 * 
 * @param {string} orderId - The order ID
 * @returns {Promise<Object>} Diagnostic information
 */
export const verifyOrderDepartmentSetup = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate('product')
        .populate('departmentStatuses.department')
        .populate('currentDepartment');

    if (!order) {
        return { error: 'Order not found' };
    }

    const productId = order.product._id || order.product;
    const product = await Product.findById(productId).populate('productionSequence');

    return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        currentDepartment: order.currentDepartment?.name || 'None',
        departmentStatusesCount: order.departmentStatuses?.length || 0,
        departmentStatuses: order.departmentStatuses?.map(ds => ({
            department: ds.department?.name || 'Unknown',
            status: ds.status,
            whenAssigned: ds.whenAssigned,
        })) || [],
        productHasSequence: !!product?.productionSequence,
        productSequenceLength: product?.productionSequence?.length || 0,
        productSequence: product?.productionSequence?.map(d => d.name) || [],
        willShowInEmployeeDashboard:
            ['approved', 'processing', 'completed'].includes(order.status) &&
            order.departmentStatuses?.length > 0,
    };
};
