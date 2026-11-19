const express = require("express");
const multer = require("multer");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  listProducts,
  getProduct,
  showProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();
const parseFormFields = multer().none();

router.get("/", parseFormFields, listProducts);
router.get("/:id", getProduct);
router.post("/show", parseFormFields, showProduct);
router.post("/", protect, authorize("admin"), upload, createProduct);
router.put("/", protect, authorize("admin"), upload, updateProduct);
router.put("/update", protect, authorize("admin"), upload, updateProduct);
router.put("/:id", protect, authorize("admin"), upload, updateProduct);
router.delete("/", protect, authorize("admin"), parseFormFields, deleteProduct);
router.delete("/delete", protect, authorize("admin"), parseFormFields, deleteProduct);
router.delete("/:id", protect, authorize("admin"), parseFormFields, deleteProduct);

module.exports = router;
