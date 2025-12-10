const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve paths correctly for Vercel
const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

app.use(cors());
app.use(express.json());

// Helper to read data
const readData = (file) => {
  if (!fs.existsSync(file)) return [];
  const data = fs.readFileSync(file, 'utf8');
  return JSON.parse(data || '[]');
};

// Helper to write data
const writeData = (file, data) => {
  // on Vercel, this will only write to ephemeral storage and won't persist
  // but we keep it for local development
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Write failed (expected on readonly fs):", e);
  }
};

// GET /api/menu
app.get('/api/menu', (req, res) => {
  try {
    const menu = readData(MENU_FILE);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// POST /api/orders
app.post('/api/orders', (req, res) => {
  try {
    const { customer, items, total } = req.body;
    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    const orders = readData(ORDERS_FILE);
    const newOrder = {
      orderId: uuidv4(),
      customer,
      items,
      total,
      createdAt: new Date().toISOString(),
      status: 'placed'
    };

    orders.push(newOrder);
    writeData(ORDERS_FILE, orders);

    res.status(201).json({
      orderId: newOrder.orderId,
      createdAt: newOrder.createdAt,
      status: newOrder.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// GET /api/orders (Admin)
app.get('/api/orders', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== 'ranna-secret-2025') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const orders = readData(ORDERS_FILE);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/admin/menu (Admin)
app.post('/api/admin/menu', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== 'ranna-secret-2025') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { id, name, description, price, imageUrl, category } = req.body;
    let menu = readData(MENU_FILE);

    if (id) {
      // Update existing
      const index = menu.findIndex(item => item.id === id);
      if (index !== -1) {
        menu[index] = { ...menu[index], name, description, price, imageUrl, category };
      } else {
        return res.status(404).json({ error: 'Item not found' });
      }
    } else {
      // Add new
      const newItem = {
        id: uuidv4(),
        name,
        description,
        price,
        imageUrl,
        category
      };
      menu.push(newItem);
    }

    writeData(MENU_FILE, menu);
    res.json({ success: true, message: 'Menu updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

// Start server if not running in serverless mode
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
