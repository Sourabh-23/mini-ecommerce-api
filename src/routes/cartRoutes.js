const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  addItem,
  getCart,
  updateItem,
  removeItem,
} = require("../controllers/cartController");

const router = express.Router();

router.use(protect, authorize("user"));
router.post("/add", addItem);
router.get("/", getCart);
router.put("/update", updateItem);
router.put("/update/:productId", updateItem);
router.delete("/remove", removeItem);
router.delete("/remove/:productId", removeItem);

module.exports = router;
