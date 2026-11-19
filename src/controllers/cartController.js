const Cart = require("../models/Cart");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");

const isValidId = (id) =>
  typeof id === "string" && /^[\da-f]{24}$/i.test(id);

const parseQuantity = (value, defaultValue) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  const quantity = typeof value === "number" ? value : Number(value);
  return Number.isInteger(quantity) && quantity >= 1 ? quantity : null;
};

const addItem = asyncHandler(async (req, res) => {
  const { productId } = req.body || {};
  const quantity = parseQuantity(req.body && req.body.quantity, 1);

  if (!isValidId(productId) || quantity === null) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid productId and positive integer quantity",
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  let cart = await Cart.findOne({ user: req.user._id });
  const item = cart && cart.items.find((entry) => entry.product.toString() === productId);
  const totalQuantity = (item ? item.quantity : 0) + quantity;

  if (totalQuantity > product.stock) {
    return res
      .status(409)
      .json({ success: false, message: "Requested quantity exceeds available stock" });
  }

  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  if (item) {
    item.quantity = totalQuantity;
  } else {
    cart.items.push({ product: product._id, quantity });
  }

  await cart.save();
  return res.json({
    success: true,
    message: "Cart updated successfully",
    data: cart,
  });
});

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product"
  );
  const items = (cart ? cart.items : [])
    .filter((item) => item.product)
    .map((item) => ({
      product: item.product,
      quantity: item.quantity,
      lineTotal: item.product.price * item.quantity,
    }));
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + item.lineTotal, 0);

  return res.json({
    success: true,
    data: { items, totalItems, totalPrice },
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const productId = req.params.productId || body.productId;
  const quantity = parseQuantity(body.quantity);

  if (!isValidId(productId) || quantity === null) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid productId and positive integer quantity",
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart && cart.items.find((entry) => entry.product.toString() === productId);
  if (!item) {
    return res
      .status(404)
      .json({ success: false, message: "Product is not in the cart" });
  }

  if (quantity > product.stock) {
    return res
      .status(409)
      .json({ success: false, message: "Requested quantity exceeds available stock" });
  }

  item.quantity = quantity;
  await cart.save();
  return res.json({
    success: true,
    message: "Cart updated successfully",
    data: cart,
  });
});

const removeItem = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const productId = req.params.productId || body.productId;
  if (!isValidId(productId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  const itemIndex =
    cart && cart.items.findIndex((entry) => entry.product.toString() === productId);
  if (itemIndex === null || itemIndex === undefined || itemIndex < 0) {
    return res
      .status(404)
      .json({ success: false, message: "Product is not in the cart" });
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();
  return res.json({
    success: true,
    message: "Item removed from cart",
    data: cart,
  });
});

module.exports = { addItem, getCart, updateItem, removeItem };
