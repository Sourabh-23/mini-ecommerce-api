require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Cart = require("../src/models/Cart");

const USERS = [
  { name: "Alex Morgan", email: "alex@example.com", password: "Alex@1234" },
  { name: "Priya Patel", email: "priya@example.com", password: "Priya@1234" },
  { name: "Rahul Sharma", email: "rahul@example.com", password: "Rahul@1234" },
];

const imageUrl = (seed) => `https://picsum.photos/seed/${seed}/600/400`;

const PRODUCTS = [
  {
    name: "Wireless Headphones",
    description: "Over-ear Bluetooth headphones, 30 hour battery.",
    price: 2499,
    category: "Electronics",
    stock: 25,
    image: imageUrl("headphones"),
  },
  {
    name: "Mechanical Keyboard",
    description: "Compact 75% keyboard with hot-swappable switches.",
    price: 3999,
    category: "Electronics",
    stock: 15,
    image: imageUrl("keyboard"),
  },
  {
    name: "Smart Watch",
    description: "Fitness tracking and heart rate monitor.",
    price: 4499,
    category: "Electronics",
    stock: 10,
    image: imageUrl("watch"),
  },
  {
    name: "Running Shoes",
    description: "Lightweight breathable shoes for daily running.",
    price: 2999,
    category: "Footwear",
    stock: 40,
    image: imageUrl("shoes"),
  },
  {
    name: "Cotton T-Shirt",
    description: "Regular fit 100% cotton t-shirt.",
    price: 499,
    category: "Clothing",
    stock: 100,
    image: imageUrl("tshirt"),
  },
  {
    name: "Denim Jacket",
    description: "Classic blue denim jacket.",
    price: 1999,
    category: "Clothing",
    stock: 20,
    image: imageUrl("jacket"),
  },
  {
    name: "Steel Water Bottle",
    description: "Insulated 750 ml bottle, keeps drinks cold 24h.",
    price: 699,
    category: "Home",
    stock: 60,
    image: imageUrl("bottle"),
  },
  {
    name: "Desk Lamp",
    description: "LED desk lamp with 3 brightness levels.",
    price: 899,
    category: "Home",
    stock: 0,
    image: imageUrl("lamp"),
  },
];

const resetSeedData = async () => {
  const fixtureUsers = await User.find({
    email: { $in: USERS.map((user) => user.email) },
  }).select("_id");
  const userIds = fixtureUsers.map((user) => user._id);

  await Cart.deleteMany({ user: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  const fixtureProducts = await Product.find({
    $or: PRODUCTS.map(({ name, category, price, description }) => ({
      name,
      category,
      price,
      description,
    })),
  }).select("_id");
  const productIds = fixtureProducts.map((product) => product._id);

  if (productIds.length > 0) {
    await Cart.updateMany(
      { "items.product": { $in: productIds } },
      { $pull: { items: { product: { $in: productIds } } } }
    );
    await Product.deleteMany({ _id: { $in: productIds } });
  }

  console.log("Seed fixture data removed");
};

const seed = async () => {
  try {
    await connectDB();

    if (process.argv.includes("--reset")) {
      await resetSeedData();
    }

    const users = [];
    for (const userData of USERS) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create(userData);
      }
      users.push(user);
    }

    const products = [];
    for (const productData of PRODUCTS) {
      const product = await Product.findOneAndUpdate(
        { name: productData.name, category: productData.category },
        { $setOnInsert: productData },
        { upsert: true, new: true, runValidators: true }
      );
      products.push(product);
    }

    const carts = [
      {
        user: users[0]._id,
        items: [
          { product: products[0]._id, quantity: 2 },
          { product: products[4]._id, quantity: 1 },
        ],
      },
      {
        user: users[1]._id,
        items: [{ product: products[3]._id, quantity: 1 }],
      },
    ];

    for (const cart of carts) {
      await Cart.findOneAndUpdate(
        { user: cart.user },
        { $set: { items: cart.items } },
        { upsert: true, new: true, runValidators: true }
      );
    }

    console.log(
      `Seed complete: ${users.length} users, ${products.length} products, ${carts.length} carts`
    );
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
