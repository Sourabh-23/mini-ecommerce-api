const Cart = require("../models/Cart");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");

const isValidId = (id) =>
  typeof id === "string" && /^[\da-f]{24}$/i.test(id);

const parseQuantity = (value, defaultValue) => {
  if (value === undefined) {
    return defaultValue === undefined ? null : defaultValue;
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

const normalizeItems = (body, defaultSingleQuantity) => {
  const isBatch = Array.isArray(body.items);
  const entries = isBatch ? body.items : [body];

  if (entries.length === 0) {
    return null;
  }

  const items = [];
  const productIds = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }

    const quantity = parseQuantity(
      entry.quantity,
      !isBatch && defaultSingleQuantity ? 1 : undefined
    );
    if (!isValidId(entry.productId) || quantity === null) {
      return null;
    }

    const productId = entry.productId.toLowerCase();
    if (productIds.has(productId)) {
      return null;
    }
    productIds.add(productId);
    items.push({ productId, quantity });
  }

  return items;
};

const addItem = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const items = normalizeItems(body, true);

  if (!items) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid productId and positive integer quantity",
    });
  }

  const products = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
  });
  if (products.length !== items.length) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  const productsById = new Map(
    products.map((product) => [product._id.toString(), product])
  );
  let cart = await Cart.findOne({ user: req.user._id });
  const changes = items.map((requested) => {
    const product = productsById.get(requested.productId);
    const cartItem =
      cart &&
      cart.items.find(
        (entry) => entry.product.toString() === requested.productId
      );
    return {
      product,
      cartItem,
      quantity: (cartItem ? cartItem.quantity : 0) + requested.quantity,
    };
  });

  if (changes.some((change) => change.quantity > change.product.stock)) {
    return res.status(409).json({
      success: false,
      message: "Requested quantity exceeds available stock",
    });
  }

  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  for (const change of changes) {
    if (change.cartItem) {
      change.cartItem.quantity = change.quantity;
    } else {
      cart.items.push({
        product: change.product._id,
        quantity: change.quantity,
      });
    }
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
  const items = req.params.productId
    ? normalizeItems(
        { productId: req.params.productId, quantity: body.quantity },
        false
      )
    : normalizeItems(body, false);

  if (!items) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid productId and positive integer quantity",
    });
  }

  const products = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
  });
  if (products.length !== items.length) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  const productsById = new Map(
    products.map((product) => [product._id.toString(), product])
  );
  const cart = await Cart.findOne({ user: req.user._id });
  const changes = items.map((requested) => ({
    product: productsById.get(requested.productId),
    cartItem:
      cart &&
      cart.items.find(
        (entry) => entry.product.toString() === requested.productId
      ),
    quantity: requested.quantity,
  }));

  if (changes.some((change) => !change.cartItem)) {
    return res
      .status(404)
      .json({ success: false, message: "Product is not in the cart" });
  }

  if (changes.some((change) => change.quantity > change.product.stock)) {
    return res.status(409).json({
      success: false,
      message: "Requested quantity exceeds available stock",
    });
  }

  for (const change of changes) {
    change.cartItem.quantity = change.quantity;
  }
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
