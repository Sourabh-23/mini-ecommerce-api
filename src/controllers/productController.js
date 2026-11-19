const Product = require("../models/Product");
const Cart = require("../models/Cart");
const asyncHandler = require("../utils/asyncHandler");
const {
  uploadImage,
  deleteImage,
} = require("../utils/cloudinaryUpload");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
};

const parsePageValue = (value, defaultValue) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value);
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const isValidId = (id) => /^[\da-f]{24}$/i.test(id);

const cleanupUploadedImage = async (publicId) => {
  try {
    await deleteImage(publicId);
  } catch (error) {
    console.error("Failed to remove uploaded product image:", error.message);
  }
};

const listProducts = asyncHandler(async (req, res) => {
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
  const input = { ...body, ...req.query };
  const filterOptions = input.filter || {};
  const pagination = input.pagination || {};
  const sortOptions = input.sort || {};

  if (
    typeof filterOptions !== "object" ||
    Array.isArray(filterOptions) ||
    typeof pagination !== "object" ||
    Array.isArray(pagination) ||
    typeof sortOptions !== "object" ||
    Array.isArray(sortOptions)
  ) {
    return res.status(400).json({
      success: false,
      message: "Filter, pagination, and sort must be objects",
    });
  }

  const page = parsePageValue(
    input.page === undefined ? pagination.page_number : input.page,
    1
  );
  const requestedLimit = parsePageValue(
    input.limit === undefined ? pagination.page_size : input.limit,
    10
  );
  if (page === null || requestedLimit === null) {
    return res.status(400).json({
      success: false,
      message: "Page and limit must be positive integers",
    });
  }

  const search =
    input.search !== undefined
      ? input.search
      : input.searchedText !== undefined
        ? input.searchedText
        : filterOptions.searchedText;
  const category =
    input.category === undefined ? filterOptions.category : input.category;
  if (
    (search !== undefined && typeof search !== "string") ||
    (category !== undefined && typeof category !== "string")
  ) {
    return res.status(400).json({
      success: false,
      message: "Search and category must be strings",
    });
  }

  const sortableFields = new Set([
    "name",
    "description",
    "price",
    "category",
    "stock",
    "createdAt",
  ]);
  const sortField = sortOptions.field || "createdAt";
  const sortOrder = sortOptions.order || "DESC";
  if (
    typeof sortField !== "string" ||
    !sortableFields.has(sortField) ||
    typeof sortOrder !== "string" ||
    !["ASC", "DESC"].includes(sortOrder.toUpperCase())
  ) {
    return res.status(400).json({
      success: false,
      message: "Sort field or order is invalid",
    });
  }

  const limit = Math.min(requestedLimit, 100);
  const filter = {};
  if (search && search.trim()) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }
  if (category && category.trim()) {
    filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, "i");
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sortField]: sortOrder.toUpperCase() === "ASC" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    count: products.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: products,
  });
});

const sendProduct = async (productId, res) => {
  if (!isValidId(productId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  return res.json({ success: true, data: product });
};

const getProduct = asyncHandler(async (req, res) =>
  sendProduct(req.params.id, res)
);

const showProduct = asyncHandler(async (req, res) => {
  const body = req.body || {};
  return sendProduct(body.productId, res);
});

const createProduct = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  const price = parseNumber(body.price);
  const stock =
    body.stock === undefined ||
    (typeof body.stock === "string" && body.stock.trim() === "")
      ? 0
      : parseNumber(body.stock);

  if (
    !name ||
    !description ||
    !category ||
    price === null ||
    price < 0 ||
    stock === null ||
    stock < 0 ||
    !Number.isInteger(stock)
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide valid name, description, price, category, and stock values",
    });
  }

  const image = req.file ? await uploadImage(req.file.buffer) : null;
  const product = new Product({
    name,
    description,
    price,
    category,
    stock,
    image: image && image.url,
    imagePublicId: image && image.publicId,
  });

  try {
    await product.save();
  } catch (error) {
    if (image) {
      await cleanupUploadedImage(image.publicId);
    }
    throw error;
  }

  const data = product.toObject();
  delete data.imagePublicId;

  return res.status(201).json({
    success: true,
    message: "Product created successfully",
    data,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const productId = req.params.id || body.productId;

  if (!isValidId(productId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  const updates = {};
  for (const field of ["name", "description", "category"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      if (typeof body[field] !== "string" || !body[field].trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-empty string`,
        });
      }
      updates[field] = body[field].trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "price")) {
    updates.price = parseNumber(body.price);
    if (updates.price === null || updates.price < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Price must be a number of at least 0" });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "stock")) {
    updates.stock = parseNumber(body.stock);
    if (
      updates.stock === null ||
      updates.stock < 0 ||
      !Number.isInteger(updates.stock)
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative integer",
      });
    }
  }

  if (Object.keys(updates).length === 0 && !req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Provide at least one product field or image" });
  }

  const product = await Product.findById(productId).select("+imagePublicId");
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  const oldPublicId = product.imagePublicId;
  const image = req.file ? await uploadImage(req.file.buffer) : null;
  Object.assign(product, updates);
  if (image) {
    product.image = image.url;
    product.imagePublicId = image.publicId;
  }

  try {
    await product.save();
  } catch (error) {
    if (image) {
      await cleanupUploadedImage(image.publicId);
    }
    throw error;
  }

  if (image && oldPublicId) {
    try {
      await deleteImage(oldPublicId);
    } catch (error) {
      console.error("Failed to remove replaced product image:", error.message);
      return res.status(502).json({
        success: false,
        message: "Product updated, but the previous image could not be deleted",
      });
    }
  }

  const data = product.toObject();
  delete data.imagePublicId;

  return res.json({
    success: true,
    message: "Product updated successfully",
    data,
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const productId = req.params.id || body.productId;

  if (!isValidId(productId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  const product = await Product.findById(productId).select("+imagePublicId");
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  const publicId = product.imagePublicId;
  await Cart.updateMany(
    { "items.product": product._id },
    { $pull: { items: { product: product._id } } }
  );
  await product.deleteOne();

  if (publicId) {
    try {
      await deleteImage(publicId);
    } catch (error) {
      console.error("Failed to remove deleted product image:", error.message);
      return res.status(502).json({
        success: false,
        message: "Product deleted, but its image could not be removed",
      });
    }
  }

  return res.json({
    success: true,
    message: "Product deleted successfully",
  });
});

module.exports = {
  listProducts,
  getProduct,
  showProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
