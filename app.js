const express = require("express");
const fs = require("fs");
const cors = require("cors");
const midtransClient = require("midtrans-client");

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());

// Read the database files
const dbFile = fs.readFileSync("db.json");
const cartFile = fs.readFileSync("cart.json");

// Parse JSON data
const data = JSON.parse(dbFile);
const cartData = JSON.parse(cartFile);

// Midtrans client configuration
const snap = new midtransClient.Snap({
  isProduction: false, // Setel ke true jika Anda ingin menggunakan mode produksi
  serverKey: "SB-Mid-server-y7Jbk2UWIfvtDPYkNKCG0xlF", // Ganti dengan server key Anda
  clientKey: "SB-Mid-client-Fk9hLaOKsWxkcfTu", // Ganti dengan client key Anda
});

// Define routes

// Get all categories
app.get("/categories", (req, res) => {
  res.json(data.categories);
});

// Add item to cart
app.post("/cart", (req, res) => {
  const newItem = req.body;
  if (!newItem.id || !newItem.name || !newItem.type || !newItem.price) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Check if the product exists
  const productExists = data.categories.some((category) =>
    category.products.some(
      (product) => product.id === newItem.id && product.type === newItem.type
    )
  );

  if (!productExists) {
    return res.status(404).json({ message: "Product not found" });
  }

  data.cart.push(newItem);
  // Save the updated cart data to the database file (db.json)
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
  res.status(201).json(newItem); // Respond with the added item
});

app.checkout("/checkout", async (req, res) => {
  const { orderId, amount, items, paymentInfo } = req.params;
  const snap = new midtransClient.Snap({
    isProduction: false, // Setel ke true jika Anda ingin menggunakan mode produksi
    serverKey: "SB-Mid-server-y7Jbk2UWIfvtDPYkNKCG0xlF", // Ganti dengan server key Anda
    clientKey: "SB-Mid-client-Fk9hLaOKsWxkcfTu", // Ganti dengan client key Anda
  });

  try {
    const transactionDetails = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: items.map((item) => ({
        id: item.productId,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
      customer_details: {
        email: paymentInfo.email,
        first_name: paymentInfo.name,
        ticket: paymentInfo.ticket,
      },
    };

    const transaction = await snap.createTransaction(transactionDetails);
    const responseData = {
      redirect_url: transaction.redirect_url,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Failed to create transaction:", error);
    throw error;
  }
});

// Get category by namepage
app.get("/categories/:namepage", (req, res) => {
  const categoryNamePage = req.params.namepage;
  const category = data.categories.find(
    (cat) => cat.namepage === categoryNamePage
  );
  if (category) {
    res.json(category);
  } else {
    res.status(404).send("Category not found");
  }
});

// Get all products of a category by namepage
app.get("/categories/:namepage/products", (req, res) => {
  const categoryNamePage = req.params.namepage;
  const category = data.categories.find(
    (cat) => cat.namepage === categoryNamePage
  );
  if (category) {
    res.json(category.products);
  } else {
    res.status(404).send("Category not found");
  }
});

// Get product by category namepage and product ID
app.get("/categories/:namepage/products/:productId", (req, res) => {
  const categoryNamePage = req.params.namepage;
  const productId = parseInt(req.params.productId);
  const category = data.categories.find(
    (cat) => cat.namepage === categoryNamePage
  );
  if (category) {
    const product = category.products.find((prod) => prod.id === productId);
    if (product) {
      res.json(product);
    } else {
      res.status(404).send("Product not found");
    }
  } else {
    res.status(404).send("Category not found");
  }
});

// Get category by ID
app.get("/categories/:id", (req, res) => {
  const categoryId = parseInt(req.params.id);
  const category = data.categories.find((cat) => cat.page === categoryId);
  if (category) {
    res.json(category);
  } else {
    res.status(404).send("Category not found");
  }
});

// Get all products of a category
app.get("/categories/:categoryId/products", (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const category = data.categories.find((cat) => cat.page === categoryId);
  if (category) {
    res.json(category.products);
  } else {
    res.status(404).send("Category not found");
  }
});

// Get product by category and product ID
app.get("/categories/:categoryId/products/:productId", (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const productId = parseInt(req.params.productId);
  const category = data.categories.find((cat) => cat.page === categoryId);
  if (category) {
    const product = category.products.find((prod) => prod.id === productId);
    if (product) {
      res.json(product);
    } else {
      res.status(404).send("Product not found");
    }
  } else {
    res.status(404).send("Category not found");
  }
});

// Endpoint for creating transaction with Midtrans
app.post("/create-transaction", async (req, res) => {
  try {
    const { orderId, amount, items, paymentInfo } = req.body;

    // Debugging: Log received data
    console.log("Received data:", { orderId, amount, items, paymentInfo });

    const transactionDetails = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: items.map((item) => ({
        id: item.productId,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
      customer_details: {
        email: paymentInfo.email,
        first_name: paymentInfo.name,
        ticket: paymentInfo.ticket,
      },
    };

    // Debugging: Log transaction details
    console.log("Transaction details:", transactionDetails);

    const transaction = await snap.createTransaction(transactionDetails);

    // Debugging: Log transaction result
    console.log("Transaction result:", transaction);

    res.json({ redirect_url: transaction.redirect_url });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the Express server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
