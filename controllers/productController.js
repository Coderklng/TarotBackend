// Product Model ko import kar rahe hain
const Product = require("../models/Product");

/////////////////////////////////
// 1. GET ALL PRODUCTS
/////////////////////////////////
// Endpoint: GET /api/products
// Access: Public
// @desc    Get products with dynamic search and filters
// @route   GET /api/products?keyword=rock&name=key&category=Electronics
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { keyword, name, category, minPrice, maxPrice, page } = req.query;

    // Mongo query object
    let query = {};

    // 1. Title/Keyword Search (Case-insensitive)
    if (keyword) {
      query.title = { $regex: keyword, $options: "i" };
    }

    // 2. Specific Name Search (Agar exact/partial name search karna ho)
    if (name) {
      query.title = { $regex: name, $options: "i" };
    }

    // 3. Category Filter
    if (category) {
      query.category = category;
    }

    // 4. Price Range Filter (e.g., ?minPrice=100&maxPrice=500)
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Pagination
    const pageSize = 10;
    const currentPage = Number(page) || 1;

    // DB Query Execute Karo
    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .limit(pageSize)
      .skip(pageSize * (currentPage - 1));

    res.status(200).json({
      success: true,
      count: products.length,
      totalProducts: count,
      page: currentPage,
      pages: Math.ceil(count / pageSize),
      products,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 2. GET SINGLE PRODUCT BY ID
/////////////////////////////////
// Endpoint: GET /api/products/:id
// Access: Public
const getProductById = async (req, res) => {
  try {
    // URL parameter se product ID lekar database mein dhoondh rahe hain
    const product = await Product.findById(req.params.id);

    if (product) {
      res.status(200).json(product);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 3. CREATE NEW PRODUCT
/////////////////////////////////
// Endpoint: POST /api/products
// Access: Private/Admin
const createProduct = async (req, res) => {
  try {
    const { title, description, price, category, stock, images } = req.body;

    // Basic Validation
    if (!title || !description || !price || !category) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    // Naya product document DB mein create kar rahe hain
    // req.user._id hume authMiddleware se milega (kis admin ne create kiya)
    const product = await Product.create({
      title,
      description,
      price,
      category,
      stock: stock || 1,
      images: images || [],
      user: req.user._id,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 4. UPDATE PRODUCT
/////////////////////////////////
// Endpoint: PUT /api/products/:id
// Access: Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { title, description, price, category, stock, images } = req.body;

    // Pehle product dhoondhte hain
    const product = await Product.findById(req.params.id);

    if (product) {
      // Agar payload mein nayi value aayi hai toh update karo, nahi toh purani rehne do
      product.title = title || product.title;
      product.description = description || product.description;
      product.price = price !== undefined ? price : product.price;
      product.category = category || product.category;
      product.stock = stock !== undefined ? stock : product.stock;
      product.images = images || product.images;

      // Updated product save karo
      const updatedProduct = await product.save();
      res.status(200).json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////////////////////////
// 5. DELETE PRODUCT
/////////////////////////////////
// Endpoint: DELETE /api/products/:id
// Access: Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // Product remove kar rahe hain
      await product.deleteOne();
      res.status(200).json({ message: "Product removed successfully" });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Functions export kar rahe hain routes mein mapping ke liye
module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};