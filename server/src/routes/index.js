import express from "express";
import { adminAuth } from "../middlewares/roleMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { optionalAuthMiddleware } from "../middlewares/optionalAuthMiddleware.js";
import upload from "../middlewares/upload.js";

/* CATEGORY CONTROLLERS */
import {
  createCategory,
  getAllCategories,
  getCategoriesTree,
  getAvailableParents,
  getTopLevelCategories,
  getCategoriesByParent,
  getCategory,
  getDigitalCategories,
  getBulkCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

/* PRODUCT CONTROLLERS */
import {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getProductsByCategory,
  getProductsBySubcategory,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

/* ADMIN CONTROLLERS */
import {
  getAllUploads,
  getUploadById,
  createAdmin,
  getAllAdmins,
  getAllUsers,
  getAllEmployees,
  updateUserRole,
  deleteUpload,
} from "../controllers/adminController.js";

/* REVIEW CONTROLLERS */
import {
  createReview,
  getAllReviews,
} from "../controllers/reviewController.js";

/* IMAGE UPLOAD CONTROLLER */
import { uploadImage } from "../controllers/imageUploadController.js";

/* ORDER CONTROLLERS */
import {
  createOrder,
  createOrderWithAccount,
  getMyOrders,
  getSingleOrder,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orderController.js";

/* ORDER APPROVAL CONTROLLERS */
import {
  approveOrderForProduction,
  checkOrderDepartmentStatus,
} from "../controllers/orderApprovalController.js";

/* SUBCATEGORY CONTROLLERS */
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategory,
  getSubCategoriesByCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/subcategoryController.js";

/* ATTRIBUTE TYPE CONTROLLERS */
import {
  createAttributeType,
  getAllAttributeTypes,
  getUnusedAttributeTypes,
  getSingleAttributeType,
  updateAttributeType,
  deleteAttributeType,
} from "../controllers/attributeTypeController.js";

/* DEPARTMENT CONTROLLERS */
import {
  createDepartment,
  getAllDepartments,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController.js";

/* SEQUENCE CONTROLLERS */
import {
  createSequence,
  getAllSequences,
  getSingleSequence,
  getSequenceBySubcategory,
  updateSequence,
  deleteSequence,
} from "../controllers/sequenceController.js";

/* DEPARTMENT ACTION CONTROLLERS */
import {
  getDepartmentOrders,
  departmentAction,
} from "../controllers/departmentActionController.js";

const router = express.Router();

/* =====================================
   CATEGORY ROUTES
===================================== */

router.post(
  "/categories",
  authMiddleware,
  adminAuth,
  upload.single("image"), // enable file upload
  createCategory
);

router.get("/categories", getAllCategories);
router.get("/categories/tree", getCategoriesTree);
router.get("/categories/available-parents", getAvailableParents);
router.get("/categories/top-level", getTopLevelCategories);
router.get("/categories/parent/:parentId", getCategoriesByParent);
router.get("/categories/digital", getDigitalCategories);
router.get("/categories/bulk", getBulkCategories);
router.get("/categories/:id", getCategory);
router.put(
  "/categories/:id",
  authMiddleware,
  adminAuth,
  upload.single("image"),
  updateCategory
);
router.delete("/categories/:id", authMiddleware, adminAuth, deleteCategory);

/* =====================================
   SUBCATEGORY ROUTES
===================================== */

router.post(
  "/subcategories",
  authMiddleware,
  adminAuth,
  upload.single("image"),
  createSubCategory
);

router.get("/subcategories", getAllSubCategories);
router.get("/subcategories/category/:categoryId", getSubCategoriesByCategory);
router.get("/subcategories/:id", getSubCategory);
router.put(
  "/subcategories/:id",
  authMiddleware,
  adminAuth,
  upload.single("image"),
  updateSubCategory
);
router.delete(
  "/subcategories/:id",
  authMiddleware,
  adminAuth,
  deleteSubCategory
);

/* =====================================
   PRODUCT ROUTES
===================================== */

router.post(
  "/products",
  authMiddleware,
  adminAuth,
  upload.single("image"), // enable file upload
  createProduct
);

router.get("/products", getAllProducts);
router.get("/products/category/:categoryId", getProductsByCategory);
router.get("/products/subcategory/:subcategoryId", getProductsBySubcategory);
router.get("/products/:id", getSingleProduct);
router.put(
  "/products/:id",
  authMiddleware,
  adminAuth,
  upload.single("image"),
  updateProduct
);
router.delete("/products/:id", authMiddleware, adminAuth, deleteProduct);

/* =====================================
   ADMIN ROUTES
===================================== */

router.get("/admin/uploads", authMiddleware, adminAuth, getAllUploads);

router.get("/admin/uploads/:id", authMiddleware, adminAuth, getUploadById);

router.delete("/admin/uploads/:id", authMiddleware, adminAuth, deleteUpload);

router.post("/admin/create-admin", authMiddleware, adminAuth, createAdmin);

router.get("/admin/admins", authMiddleware, adminAuth, getAllAdmins);

router.get("/admin/users", authMiddleware, adminAuth, getAllUsers);

router.get("/admin/employees", authMiddleware, adminAuth, getAllEmployees);

router.put(
  "/admin/update-user-role",
  authMiddleware,
  adminAuth,
  updateUserRole
);

/* =====================================
   REVIEW ROUTES
===================================== */

// Reviews route - authentication is optional (handled in controller)
router.post("/reviews", optionalAuthMiddleware, createReview);
router.get("/reviews", getAllReviews);

/* =====================================
   IMAGE UPLOAD ROUTES (for CKEditor)
===================================== */
router.post("/upload-image", authMiddleware, upload.single("image"), uploadImage);

/* =====================================
   ORDER ROUTES
===================================== */

// User order routes
router.post("/orders", authMiddleware, createOrder);
router.post("/orders/create-with-account", createOrderWithAccount); // No auth required - creates account if needed
router.get("/orders/my-orders", authMiddleware, getMyOrders);
router.get("/orders/:orderId", authMiddleware, getSingleOrder);
router.put("/orders/:orderId/cancel", authMiddleware, cancelOrder);

// Admin order routes
router.get("/admin/orders", authMiddleware, adminAuth, getAllOrders);
router.put(
  "/admin/orders/:orderId",
  authMiddleware,
  adminAuth,
  updateOrderStatus
);

// New: Admin order approval route (ensures proper department assignment)
router.post(
  "/orders/:orderId/approve",
  authMiddleware,
  adminAuth,
  approveOrderForProduction
);

// New: Diagnostic route to check why order isn't showing in employee dashboard
router.get(
  "/orders/:orderId/department-status",
  authMiddleware,
  checkOrderDepartmentStatus
);

/* =====================================
   ATTRIBUTE TYPE ROUTES
===================================== */

router.post("/attribute-types", authMiddleware, adminAuth, createAttributeType);

router.get("/attribute-types", getAllAttributeTypes);
router.get("/attribute-types/unused/list", getUnusedAttributeTypes);
router.get("/attribute-types/:id", getSingleAttributeType);
router.put(
  "/attribute-types/:id",
  authMiddleware,
  adminAuth,
  updateAttributeType
);
router.delete(
  "/attribute-types/:id",
  authMiddleware,
  adminAuth,
  deleteAttributeType
);

/* =====================================
   DEPARTMENT ROUTES
===================================== */

router.post("/departments", authMiddleware, adminAuth, createDepartment);

router.get("/departments", getAllDepartments);
router.get("/departments/:id", getSingleDepartment);
router.put("/departments/:id", authMiddleware, adminAuth, updateDepartment);
router.delete("/departments/:id", authMiddleware, adminAuth, deleteDepartment);

// Department orders route (for employees)
router.get(
  "/departments/:departmentId/orders",
  authMiddleware,
  getDepartmentOrders
);

// Department action route (for employees to perform actions on orders)
router.post(
  "/orders/:orderId/departments/:departmentId/action",
  authMiddleware,
  departmentAction
);

/* =====================================
   SEQUENCE ROUTES
===================================== */

router.post("/sequences", authMiddleware, adminAuth, createSequence);

router.get("/sequences", getAllSequences);
router.get("/sequences/subcategory/:subcategoryId", getSequenceBySubcategory);
router.get("/sequences/:id", getSingleSequence);
router.put("/sequences/:id", authMiddleware, adminAuth, updateSequence);
router.delete("/sequences/:id", authMiddleware, adminAuth, deleteSequence);

export default router;
