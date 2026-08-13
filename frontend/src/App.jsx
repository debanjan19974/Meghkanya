import { useEffect, useMemo, useRef, useState } from "react";
import {
  adjustStock,
  createProduct,
  createSale,
  listProducts,
  login,
  resetPassword,
  updateProduct,
  getStockAnalysis,
  getSalesAnalysis,
  getDashboardAnalysis,
  getCustomersAnalysis,
} from "./api";

const defaultProduct = {
  barcode: "",
  name: "",
  category: "",
  buy_price: "",
  sell_price: "",
  stock_quantity: 0
};

const defaultEditProduct = {
  id: null,
  barcode: "",
  name: "",
  category: "",
  buy_price: "",
  sell_price: "",
  stock_quantity: 0,
  is_active: true
};

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 8.25A2.25 2.25 0 0 1 11.25 6h6.5A2.25 2.25 0 0 1 20 8.25v7.5A2.25 2.25 0 0 1 17.75 18h-6.5A2.25 2.25 0 0 1 9 15.75v-7.5Zm1.5 0v7.5c0 .41.34.75.75.75h6.5c.41 0 .75-.34.75-.75v-7.5a.75.75 0 0 0-.75-.75h-6.5a.75.75 0 0 0-.75.75ZM7 10.5A2.5 2.5 0 0 1 9.5 8h.9V6.75h-.9A3.75 3.75 0 0 0 5.75 10.5v6.75A3.75 3.75 0 0 0 9.5 21h6.75v-1.25H9.5A2.5 2.5 0 0 1 7 17.25V10.5Z" fill="currentColor"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9.85 15.7 6.2 12.05l-1.06 1.06 4.71 4.71 9.2-9.2-1.06-1.06-8.14 8.14Z" fill="currentColor"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm14.71-9.04a1 1 0 0 0 0-1.42l-2.33-2.33a1 1 0 0 0-1.42 0l-1.2 1.2 3.75 3.75 1.2-1.2Z" fill="currentColor"/>
    </svg>
  );
}

function SalesTrendChart({ points }) {
  if (!points || !points.length) {
    return <div className="empty-state">No chart data available.</div>;
  }

  const width = 760;
  const height = 230;
  const padding = 26;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const path = points
    .map((point, index) => {
      const x = padding + (chartWidth / Math.max(points.length - 1, 1)) * index;
      const y = height - padding - (point.value / maxValue) * chartHeight;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${path} L ${padding + chartWidth} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="chart-panel">
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="img" aria-label="Sales trend chart">
        <path d={areaPath} fill="rgba(59, 130, 246, 0.18)" />
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        {points.map((point, index) => {
          const x = padding + (chartWidth / Math.max(points.length - 1, 1)) * index;
          const y = height - padding - (point.value / maxValue) * chartHeight;
          return (
            <g key={`${point.label}-${index}`}>
              <circle cx={x} cy={y} r="4" fill="#0f4a75" />
              <text x={x} y={height - 8} fontSize="10" textAnchor="middle" fill="#475569">{point.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("meghkanya_token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    username: localStorage.getItem("meghkanya_username") || "",
    password: ""
  });
  const [resetForm, setResetForm] = useState({
    username: localStorage.getItem("meghkanya_username") || "admin",
    reset_code: "",
    new_password: ""
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(
    () => localStorage.getItem("meghkanya_remember_username") === "true"
  );
  const [activeWorkspace, setActiveWorkspace] = useState("products");
  const [products, setProducts] = useState([]);
  const [analyticsTab, setAnalyticsTab] = useState("stock");
  const [stockAnalysis, setStockAnalysis] = useState(null);
  const [salesAnalysis, setSalesAnalysis] = useState(null);
  const [dashboardAnalysis, setDashboardAnalysis] = useState(null);
  const [customersAnalysis, setCustomersAnalysis] = useState(null);
  const [dashboardFilter, setDashboardFilter] = useState("month");
  const [barcode, setBarcode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [productForm, setProductForm] = useState(defaultProduct);
  const [editProduct, setEditProduct] = useState(defaultEditProduct);
  const [stockChange, setStockChange] = useState("1");
  const [billBarcode, setBillBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [billDiscount, setBillDiscount] = useState("0");
  const [billGst, setBillGst] = useState("0");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [lastInvoice, setLastInvoice] = useState(null);
  const companyInfo = {
    name: "Meghkanya",
    address: "Colonelgola, Midnapore, West Bengal 721101",
    phone: "95475 99371",
    email: "Meghkanya.official@gmail.com"
  };
  const [message, setMessage] = useState("");
  const [copiedPhoneKey, setCopiedPhoneKey] = useState("");
  const barcodeInputRef = useRef(null);
  const billingBarcodeInputRef = useRef(null);

  useEffect(() => {
    document.title = token ? "Meghkanya" : "Meghkanya Login";
  }, [token]);

  useEffect(() => {
    if (!token) {
      setProducts([]);
      setScanResult(null);
      setCart([]);
      setStockAnalysis(null);
      setSalesAnalysis(null);
      setDashboardAnalysis(null);
      setCustomersAnalysis(null);
      return;
    }

    localStorage.setItem("meghkanya_token", token);
    loadProducts();
    loadAnalytics();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const refreshTimer = setInterval(() => {
      loadProducts();
      loadAnalytics();
      if (activeWorkspace === "analytics") {
        loadDashboardAnalytics(dashboardFilter);
      }
    }, 15000);

    return () => clearInterval(refreshTimer);
  }, [token, activeWorkspace, dashboardFilter]);

  async function loadProducts() {
    try {
      const rows = await listProducts(token);
      setProducts(rows);
    } catch (err) {
      if (String(err?.message).toLowerCase().includes("could not validate credentials")) {
        handleLogout();
        setMessage("Your session expired. Please log in again.");
        return;
      }
      setMessage(err?.message || "Could not load products.");
    }
  }

  async function loadAnalytics() {
    try {
      const [stock, sales, customers] = await Promise.all([
        getStockAnalysis(token),
        getSalesAnalysis(token),
        getCustomersAnalysis(token)
      ]);
      setStockAnalysis(stock);
      setSalesAnalysis(sales);
      setCustomersAnalysis(customers);
      if (activeWorkspace === "analytics") {
        const dashboard = await getDashboardAnalysis(token, dashboardFilter);
        setDashboardAnalysis(dashboard);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err?.message);
    }
  }

  async function loadDashboardAnalytics(nextFilter = dashboardFilter) {
    if (!token) return;
    try {
      const data = await getDashboardAnalysis(token, nextFilter);
      setDashboardAnalysis(data);
    } catch (err) {
      console.error("Failed to load dashboard analytics:", err?.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setAuthLoading(true);
    try {
      const auth = await login(authForm.username, authForm.password);
      setToken(auth.access_token);
      if (rememberUsername) {
        localStorage.setItem("meghkanya_username", authForm.username);
        localStorage.setItem("meghkanya_remember_username", "true");
      } else {
        localStorage.removeItem("meghkanya_username");
        localStorage.removeItem("meghkanya_remember_username");
      }
      setAuthForm({ username: rememberUsername ? authForm.username : "", password: "" });
      setMessage("");
    } catch (err) {
      setMessage(
        err?.message ||
          "Login failed. Check the username and password, or use Reset password below."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setMessage("");
    setAuthLoading(true);
    try {
      const result = await resetPassword(resetForm);
      setAuthMode("login");
      setAuthForm({ username: resetForm.username, password: "" });
      setResetForm({ username: resetForm.username, reset_code: "", new_password: "" });
      setMessage(result.message || "Password reset successfully. Please log in again.");
    } catch (err) {
      setMessage(err?.message || "Password reset failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCopyPhone(phone, rowKey) {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhoneKey(rowKey);
      window.setTimeout(() => setCopiedPhoneKey((current) => (current === rowKey ? "" : current)), 1200);
    } catch (err) {
      setMessage("Could not copy phone number.");
    }
  }

  function handleEditCustomer(customer) {
    setMessage(`Edit customer: ${customer.name} (${customer.phone})`);
  }

  function handleLogout() {
    localStorage.removeItem("meghkanya_token");
    setToken("");
    setAuthForm({ username: "", password: "" });
    setMessage("");
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setMessage("");
    try {
      await createProduct(token, {
        ...productForm,
        buy_price: Number(productForm.buy_price),
        sell_price: Number(productForm.sell_price),
        stock_quantity: Number(productForm.stock_quantity || 0)
      });
      setProductForm(defaultProduct);
      await loadProducts();
      setMessage("Product created.");
      barcodeInputRef.current?.focus();
    } catch (err) {
      setMessage(err?.message || "Product create failed.");
    }
  }

  function handleEditClick(product) {
    setEditProduct({
      id: product.id,
      barcode: product.barcode,
      name: product.name || "",
      category: product.category || "",
      buy_price: product.buy_price || "",
      sell_price: product.sell_price || "",
      stock_quantity: product.stock_quantity || 0,
      is_active: product.is_active ?? true
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditFieldChange(field, value) {
    setEditProduct((prev) => ({ ...prev, [field]: value }));
  }

  async function handleUpdateProduct(e) {
    e.preventDefault();
    if (!editProduct.id) return;
    setMessage("");
    try {
      await updateProduct(token, editProduct.id, {
        name: editProduct.name,
        category: editProduct.category,
        buy_price: Number(editProduct.buy_price),
        sell_price: Number(editProduct.sell_price),
        stock_quantity: Number(editProduct.stock_quantity),
        is_active: editProduct.is_active
      });
      setEditProduct(defaultEditProduct);
      await loadProducts();
      setMessage("Product updated successfully.");
    } catch (err) {
      setMessage(err?.message || "Product update failed.");
    }
  }

  function cancelEdit() {
    setEditProduct(defaultEditProduct);
  }

  async function handleBarcodeSearch(code) {
    if (!code.trim()) return;
    try {
      const rows = await listProducts(token, { barcode: code.trim() });
      if (!rows.length) {
        setScanResult(null);
        setMessage(`No product found for barcode ${code}`);
        return;
      }
      setScanResult(rows[0]);
      setMessage("");
    } catch (err) {
      setMessage(err?.message || "Barcode lookup failed.");
    }
  }

  async function handleAdjustStock() {
    if (!scanResult) return;
    try {
      const response = await adjustStock(token, {
        product_id: scanResult.id,
        quantity_change: Number(stockChange),
        note: "Inventory module adjustment"
      });
      setScanResult({ ...scanResult, stock_quantity: response.updated_stock });
      await loadProducts();
      setMessage("Stock updated.");
    } catch (err) {
      setMessage(err?.message || "Stock update failed.");
    }
  }

  async function handleBillingScan(code) {
    if (!code.trim()) return;
    try {
      const rows = await listProducts(token, { barcode: code.trim() });
      if (!rows.length) {
        setMessage(`No product found for barcode ${code}`);
        return;
      }
      const product = rows[0];
      if (product.stock_quantity <= 0) {
        setMessage(`${product.name} is out of stock.`);
        return;
      }
      setCart((prev) => {
        const existing = prev.find((item) => item.product_id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: Math.min(item.quantity + 1, product.stock_quantity) }
              : item
          );
        }
        return [
          ...prev,
          {
            product_id: product.id,
            barcode: product.barcode,
            name: product.name,
            price: Number(product.sell_price),
            available_stock: product.stock_quantity,
            quantity: 1
          }
        ];
      });
      setMessage("");
    } catch (err) {
      setMessage(err?.message || "Billing barcode scan failed.");
    }
  }

  function updateCartQuantity(productId, value) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const qty = Number(value);
        if (Number.isNaN(qty)) return item;
        return { ...item, quantity: Math.max(1, Math.min(qty, item.available_stock)) };
      })
    );
  }

  function removeCartItem(productId) {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  }

  async function checkoutSale() {
    if (!cart.length) {
      setMessage("Cart is empty.");
      return;
    }
    if (!customerName.trim()) {
      setMessage("Customer name is required for checkout.");
      return;
    }
    if (!customerPhone.trim()) {
      setMessage("Customer phone number is required.");
      return;
    }
    if (!shippingAddress.trim()) {
      setMessage("Shipping address is required.");
      return;
    }
    try {
      const payload = {
        payment_mode: paymentMode,
        discount_amount: Number(billDiscount || 0),
        gst_amount: Number(billGst || 0),
        customer_name: customerName,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity }))
      };
      const result = await createSale(token, payload);
      setLastInvoice(result);
      setCart([]);
      setBillDiscount("0");
      setBillGst("0");
      setCustomerName("");
      setCustomerPhone("");
      setShippingAddress("");
      setMessage(`Sale completed. Invoice ${result.invoice_no}`);
      await loadProducts();
      await loadAnalytics();
      if (activeWorkspace === "analytics") {
        await loadDashboardAnalytics(dashboardFilter);
      }
      billingBarcodeInputRef.current?.focus();
    } catch (err) {
      setMessage(err?.message || "Checkout failed. Please verify stock and totals.");
    }
  }

  const lowStockCount = useMemo(
    () => products.filter((item) => Number(item.stock_quantity) <= 5).length,
    [products]
  );
  const totalBuyingPrice = useMemo(
    () =>
      products.reduce(
        (sum, item) => sum + Number(item.buy_price || 0) * Number(item.stock_quantity || 0),
        0
      ),
    [products]
  );
  const totalSellingPrice = useMemo(
    () =>
      products.reduce(
        (sum, item) => sum + Number(item.sell_price || 0) * Number(item.stock_quantity || 0),
        0
      ),
    [products]
  );
  const billingSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const billingTotal = useMemo(
    () => billingSubtotal - Number(billDiscount || 0) + Number(billGst || 0),
    [billingSubtotal, billDiscount, billGst]
  );

  if (!token) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <img className="auth-logo" src="/logo/maghkanyalogo.jpeg" alt="Meghkanya" />
          <div className="brand-block">
            <p className="eyebrow">Inventory and Billing</p>
            <h1>Meghkanya</h1>
            <p className="auth-copy">
              Sign in to manage saree inventory, barcode scans, stock updates, and billing.
            </p>
          </div>

          {message && <div className="message">{message}</div>}

          <div className="auth-tabs" aria-label="Account options">
            <button
              className={authMode === "login" ? "active" : ""}
              type="button"
              onClick={() => {
                setAuthMode("login");
                setMessage("");
              }}
            >
              Login
            </button>
            <button
              className={authMode === "reset" ? "active" : ""}
              type="button"
              onClick={() => {
                setAuthMode("reset");
                setMessage("");
              }}
            >
              Reset Password
            </button>
          </div>

          {authMode === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="admin"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                />
              </label>
              <label>
                Password
                <span className="password-row">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={rememberUsername}
                  onChange={(e) => setRememberUsername(e.target.checked)}
                />
                Remember username
              </label>
              <button type="submit" disabled={authLoading}>
                {authLoading ? "Signing In..." : "Login"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handlePasswordReset}>
              <label>
                Username
                <input
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="admin"
                  value={resetForm.username}
                  onChange={(e) => setResetForm({ ...resetForm, username: e.target.value })}
                />
              </label>
              <label>
                Reset code
                <input
                  required
                  type="password"
                  placeholder="Value of BOOTSTRAP_ADMIN_PASSWORD in .env"
                  value={resetForm.reset_code}
                  onChange={(e) => setResetForm({ ...resetForm, reset_code: e.target.value })}
                />
              </label>
              <label>
                New password
                <input
                  required
                  minLength="8"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={resetForm.new_password}
                  onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
                />
              </label>
              <button type="submit" disabled={authLoading}>
                {authLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <p className="eyebrow">Inventory and Billing</p>
          <h1>Meghkanya</h1>
          <p>Barcode-first inventory management and checkout workspace with fast product lookup and sales flow.</p>
        </div>
        <button className="secondary-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="summary-cards">
        <div className="summary-card">
          <span>Total Products</span>
          <strong>{products.length}</strong>
        </div>
        <div className="summary-card">
          <span>Low Stock Items</span>
          <strong>{lowStockCount}</strong>
        </div>
        <div className="summary-card">
          <span>Buying Price</span>
          <strong>Rs {totalBuyingPrice.toFixed(2)}</strong>
        </div>
        <div className="summary-card">
          <span>Selling Price</span>
          <strong>Rs {totalSellingPrice.toFixed(2)}</strong>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      <nav className="workspace-tabs" aria-label="Workspace sections">
        <button
          className={activeWorkspace === "products" ? "active" : ""}
          type="button"
          onClick={() => setActiveWorkspace("products")}
        >
          Add Product
        </button>
        <button
          className={activeWorkspace === "billing" ? "active" : ""}
          type="button"
          onClick={() => setActiveWorkspace("billing")}
        >
          Billing Process
        </button>
        <button
          className={activeWorkspace === "analytics" ? "active" : ""}
          type="button"
          onClick={() => { setActiveWorkspace("analytics"); setAnalyticsTab("stock"); }}
        >
          Analysis Dashboard
        </button>
        <button
          className={activeWorkspace === "customers" ? "active" : ""}
          type="button"
          onClick={() => setActiveWorkspace("customers")}
        >
          Customer Details
        </button>
      </nav>

      {activeWorkspace === "products" ? (
        <>
          <section className="card">
            <div className="section-headline">
              <div>
                <h2>Product Lookup</h2>
                <p className="help-text">Scan a barcode or enter one manually to view stock and update inventory quickly.</p>
              </div>
              <button className="secondary-button" type="button" onClick={loadProducts}>
                Refresh Products
              </button>
            </div>
            <div className="row">
              <input
                ref={barcodeInputRef}
                placeholder="Scan or type barcode here"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleBarcodeSearch(barcode);
                    setBarcode("");
                  }
                }}
              />
              <button onClick={() => handleBarcodeSearch(barcode)}>Search</button>
            </div>
            {scanResult && (
              <div className="scan-box">
                <div className="section-headline">
                  <strong>{scanResult.name}</strong>
                  <span className="badge">{scanResult.category || "No category"}</span>
                </div>
                <div className="grid grid-2">
                  <div>Barcode: {scanResult.barcode}</div>
                  <div>Stock: {scanResult.stock_quantity}</div>
                  <div>Buy Price: Rs {scanResult.buy_price}</div>
                  <div>Sell Price: Rs {scanResult.sell_price}</div>
                </div>
                <div className="row">
                  <input
                    type="number"
                    min="-999"
                    value={stockChange}
                    onChange={(e) => setStockChange(e.target.value)}
                    aria-label="Stock adjustment amount"
                  />
                  <button onClick={handleAdjustStock}>Adjust Stock</button>
                </div>
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-headline">
              <div>
                <h2>Add New Product</h2>
                <p className="help-text">Add your saree products, set pricing, and enter opening stock levels.</p>
              </div>
            </div>
            <form className="grid product-form" onSubmit={handleCreateProduct}>
              <input
                required
                placeholder="Barcode"
                value={productForm.barcode}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
              />
              <input
                required
                placeholder="Name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
              <input
                placeholder="Category"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              />
              <input
                required
                type="number"
                step="0.01"
                placeholder="Buy Price"
                value={productForm.buy_price}
                onChange={(e) => setProductForm({ ...productForm, buy_price: e.target.value })}
              />
              <input
                required
                type="number"
                step="0.01"
                placeholder="Sell Price"
                value={productForm.sell_price}
                onChange={(e) => setProductForm({ ...productForm, sell_price: e.target.value })}
              />
              <input
                type="number"
                placeholder="Opening Stock"
                value={productForm.stock_quantity}
                onChange={(e) =>
                  setProductForm({ ...productForm, stock_quantity: e.target.value })
                }
              />
              <button type="submit">Save Product</button>
            </form>

            {editProduct.id && (
              <div className="edit-card card">
                <div className="section-headline">
                  <div>
                    <h2>Edit Product</h2>
                    <p className="help-text">Update product details. SKU is fixed and cannot be changed.</p>
                  </div>
                </div>
                <form className="grid product-form" onSubmit={handleUpdateProduct}>
                  <input disabled placeholder="Barcode (SKU)" value={editProduct.barcode} />
                  <input
                    required
                    placeholder="Name"
                    value={editProduct.name}
                    onChange={(e) => handleEditFieldChange("name", e.target.value)}
                  />
                  <input
                    placeholder="Category"
                    value={editProduct.category}
                    onChange={(e) => handleEditFieldChange("category", e.target.value)}
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="Buy Price"
                    value={editProduct.buy_price}
                    onChange={(e) => handleEditFieldChange("buy_price", e.target.value)}
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="Sell Price"
                    value={editProduct.sell_price}
                    onChange={(e) => handleEditFieldChange("sell_price", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Stock Quantity"
                    value={editProduct.stock_quantity}
                    onChange={(e) => handleEditFieldChange("stock_quantity", e.target.value)}
                  />
                  <div className="checkbox-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={editProduct.is_active}
                        onChange={(e) => handleEditFieldChange("is_active", e.target.checked)}
                      />
                      Active
                    </label>
                  </div>
                  <div className="button-row">
                    <button type="submit">Save Changes</button>
                    <button type="button" className="secondary-button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-headline">
              <div>
                <h2>Inventory List</h2>
                <p className="help-text">Products are ordered by latest added. Low stock items are highlighted for easy restocking.</p>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.id} className={Number(item.stock_quantity) <= 5 ? "row-low-stock" : ""}>
                      <td>{item.barcode}</td>
                      <td>{item.name}</td>
                      <td>{item.category || "—"}</td>
                      <td>Rs {Number(item.sell_price).toFixed(2)}</td>
                      <td>{item.stock_quantity}</td>
                      <td>
                        <button type="button" onClick={() => handleEditClick(item)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!products.length && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No products yet. Add a product to start managing inventory.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : activeWorkspace === "billing" ? (
        <section className="card">
          <h2>Billing Counter</h2>
          <div className="row">
            <input
              ref={billingBarcodeInputRef}
              placeholder="Scan barcode to add in bill"
              value={billBarcode}
              onChange={(e) => setBillBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleBillingScan(billBarcode);
                  setBillBarcode("");
                }
              }}
            />
            <button
              onClick={() => {
                handleBillingScan(billBarcode);
                setBillBarcode("");
              }}
            >
              Add to Cart
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.product_id}>
                  <td>{item.barcode}</td>
                  <td>{item.name}</td>
                  <td>Rs {item.price.toFixed(2)}</td>
                  <td>
                    <input
                      className="qty-input"
                      type="number"
                      min="1"
                      max={item.available_stock}
                      value={item.quantity}
                      onChange={(e) => updateCartQuantity(item.product_id, e.target.value)}
                    />
                  </td>
                  <td>Rs {(item.price * item.quantity).toFixed(2)}</td>
                  <td>
                    <button onClick={() => removeCartItem(item.product_id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="billing-summary">
            <div className="summary-row">
              <label>Customer Name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer full name"
              />
            </div>
            <div className="summary-row">
              <label>Phone Number</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Customer mobile number"
              />
            </div>
            <div className="summary-row">
              <label>Shipping Address</label>
              <textarea
                rows={3}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Delivery address with city, state, pincode"
              />
            </div>
            <div className="summary-row">
              <label>Payment</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div className="summary-row">
              <label>Discount</label>
              <input
                type="number"
                step="0.01"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
              />
            </div>
            <div className="summary-row">
              <label>GST</label>
              <input
                type="number"
                step="0.01"
                value={billGst}
                onChange={(e) => setBillGst(e.target.value)}
              />
            </div>
            <p>Subtotal: Rs {billingSubtotal.toFixed(2)}</p>
            <p>
              <strong>Total Payable: Rs {billingTotal.toFixed(2)}</strong>
            </p>
            <button onClick={checkoutSale}>Checkout Sale</button>
            {lastInvoice && (
              <div className="invoice-note">
              <div className="invoice-preview">
                <div className="invoice-header">
                  <div className="shipping-block">
                    <strong>Shipping Address</strong>
                    <p>{lastInvoice.customer_name}</p>
                    <p>{lastInvoice.shipping_address}</p>
                    <p>{lastInvoice.customer_phone}</p>
                  </div>
                  <div className="invoice-meta">
                    <p><strong>Invoice:</strong> {lastInvoice.invoice_no}</p>
                    <p><strong>Sale Date:</strong> {new Date(lastInvoice.sold_at).toLocaleString()}</p>
                    <p><strong>Payment:</strong> {lastInvoice.payment_mode}</p>
                  </div>
                </div>

                <div className="invoice-buyer">
                  <div>
                    <strong>Bill To</strong>
                    <p>{lastInvoice.customer_name}</p>
                    <p>{lastInvoice.customer_phone}</p>
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastInvoice.items.map((item, index) => (
                      <tr key={item.product_id}>
                        <td>{index + 1}</td>
                        <td>{item.name}</td>
                        <td>Rs {Number(item.selling_price).toFixed(2)}</td>
                        <td>{item.quantity}</td>
                        <td>Rs {Number(item.line_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="invoice-summary">
                  <div>
                    <p>Subtotal: Rs {Number(lastInvoice.subtotal).toFixed(2)}</p>
                    <p>Discount: Rs {Number(lastInvoice.discount_amount).toFixed(2)}</p>
                  </div>
                  <div className="total-box">
                    <strong>Total Payable</strong>
                    <strong>Rs {Number(lastInvoice.total_amount).toFixed(2)}</strong>
                  </div>
                </div>

                <div className="invoice-footer">
                  <div className="company-info">
                    <h4>{companyInfo.name}</h4>
                    <p>{companyInfo.address}</p>
                    <p>WhatsApp: {companyInfo.phone}</p>
                    <p>Email: {companyInfo.email}</p>
                  </div>
                  <div className="invoice-signature">
                    <p>Authorized Signatory</p>
                    <div className="signature-box image-signature">
                      <img src="/logo/Signeture.png" alt="Authorized signature" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const labelHtml = `<!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8" />
                        <title>Invoice - ${lastInvoice.invoice_no}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
                          .header, .footer { margin-bottom: 20px; }
                          .header h1 { margin: 0; font-size: 28px; color: #075985; }
                          .header p { margin: 4px 0; color: #334155; }
                          .details, .summary { margin-top: 20px; width: 100%; }
                          .details td, .summary td { padding: 8px 6px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                          th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
                          th { background: #eff6ff; }
                          .total-row td { font-weight: 700; }
                          .signature-box { margin-top: 30px; padding: 16px; border: 1px dashed #0f172a; width: 260px; text-align: center; color: #0f172a; }
                        </style>
                      </head>
                      <body>
                        <div class="header-grid">
                          <div class="header-left">
                            <strong>Shipping Address</strong>
                            <p>${lastInvoice.customer_name}</p>
                            <p>${lastInvoice.shipping_address}</p>
                            <p>${lastInvoice.customer_phone}</p>
                          </div>
                          <div class="header-right">
                            <table>
                              <tr><td><strong>Invoice</strong></td><td>${lastInvoice.invoice_no}</td></tr>
                              <tr><td><strong>Sale Date</strong></td><td>${new Date(lastInvoice.sold_at).toLocaleString()}</td></tr>
                              <tr><td><strong>Payment</strong></td><td>${lastInvoice.payment_mode}</td></tr>
                            </table>
                          </div>
                        </div>
                        <div class="details">
                          <table>
                            <tr><td><strong>Bill To</strong></td><td>${lastInvoice.customer_name}</td></tr>
                            <tr><td><strong>Phone</strong></td><td>${lastInvoice.customer_phone}</td></tr>
                          </table>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Product</th>
                              <th>Price</th>
                              <th>Qty</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${lastInvoice.items
                              .map(
                                (item, index) => `
                                  <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.name}</td>
                                    <td>Rs ${Number(item.selling_price).toFixed(2)}</td>
                                    <td>${item.quantity}</td>
                                    <td>Rs ${Number(item.line_total).toFixed(2)}</td>
                                  </tr>
                                `
                              )
                              .join("")}
                          </tbody>
                        </table>
                        <div class="summary">
                          <table>
                            <tr><td><strong>Subtotal</strong></td><td>Rs ${Number(lastInvoice.subtotal).toFixed(2)}</td></tr>
                            <tr><td><strong>Discount</strong></td><td>Rs ${Number(lastInvoice.discount_amount).toFixed(2)}</td></tr>
                            <tr class="total-row"><td><strong>Total Payable</strong></td><td>Rs ${Number(lastInvoice.total_amount).toFixed(2)}</td></tr>
                          </table>
                        </div>
                        <div class="footer-grid">
                          <div class="footer-left">
                            <h2>${companyInfo.name}</h2>
                            <p>${companyInfo.address}</p>
                            <p>WhatsApp: ${companyInfo.phone}</p>
                            <p>Email: ${companyInfo.email}</p>
                          </div>
                          <div class="footer-right">
                            <div class="signature-box">
                              <img src="/logo/Signeture.png" alt="Authorized signature" style="max-width: 100%; height: auto;" />
                            </div>
                          </div>
                        </div>
                      </body>
                    </html>`;
                  printWindow.document.write(labelHtml);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }}
              >
                Print Invoice
              </button>
            </div>
            )}
          </div>
        </section>
      ) : activeWorkspace === "analytics" ? (
        <>
          <nav className="analytics-tabs">
            <button
              className={analyticsTab === "stock" ? "active" : ""}
              onClick={() => setAnalyticsTab("stock")}
            >
              Stock Analysis
            </button>
            <button
              className={analyticsTab === "sales" ? "active" : ""}
              onClick={() => setAnalyticsTab("sales")}
            >
              Sales Analysis
            </button>
          </nav>

          {analyticsTab === "stock" && stockAnalysis && (
            <section className="card">
              <h2>Stock Analysis</h2>
              <div className="analytics-summary">
                <div className="analytics-card">
                  <span>Total Products</span>
                  <strong>{stockAnalysis.total_products}</strong>
                </div>
                <div className="analytics-card">
                  <span>Low Stock Items</span>
                  <strong>{stockAnalysis.low_stock_count}</strong>
                </div>
                <div className="analytics-card">
                  <span>High Stock Items</span>
                  <strong>{stockAnalysis.high_stock_count}</strong>
                </div>
                <div className="analytics-card">
                  <span>Total Inventory Value (Cost)</span>
                  <strong>Rs {stockAnalysis.total_inventory_value.toFixed(2)}</strong>
                </div>
                <div className="analytics-card">
                  <span>Total Potential Revenue</span>
                  <strong>Rs {stockAnalysis.total_potential_revenue.toFixed(2)}</strong>
                </div>
              </div>

              <div className="chart-toolbar">
                <label>
                  Filter:
                  <select value={dashboardFilter} onChange={(e) => {
                    const nextVal = e.target.value;
                    setDashboardFilter(nextVal);
                    loadDashboardAnalytics(nextVal);
                  }}>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </label>
              </div>

              {dashboardAnalysis && (
                <>
                  <div className="chart-card">
                    <div className="chart-header-row">
                      <div>
                        <h3>Live stock intake graph</h3>
                        <p>{dashboardAnalysis.period.toUpperCase()} stock intake</p>
                      </div>
                      <strong>{dashboardAnalysis.stock_summary.total_stock_intake} units</strong>
                    </div>
                    <SalesTrendChart points={dashboardAnalysis.stock_intake_trend} />
                  </div>

                  <div className="analytics-summary details-grid">
                    <div className="analytics-card">
                      <span>Total intake</span>
                      <strong>{dashboardAnalysis.stock_summary.total_stock_intake}</strong>
                    </div>
                    <div className="analytics-card">
                      <span>Inventory value</span>
                      <strong>Rs {dashboardAnalysis.stock_summary.total_inventory_value.toFixed(2)}</strong>
                    </div>
                    <div className="analytics-card">
                      <span>Low stock items</span>
                      <strong>{stockAnalysis.low_stock_count}</strong>
                    </div>
                    <div className="analytics-card">
                      <span>High stock items</span>
                      <strong>{stockAnalysis.high_stock_count}</strong>
                    </div>
                  </div>

                  <div className="detail-panels">
                    <div className="detail-panel">
                      <h3>Stock by category</h3>
                      {dashboardAnalysis.stock_by_category.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Stock Qty</th>
                              <th>Cost Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardAnalysis.stock_by_category.map((item) => (
                              <tr key={item.category}>
                                <td>{item.category}</td>
                                <td>{item.stock_quantity}</td>
                                <td>Rs {item.stock_value.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p>No stock categories available.</p>
                      )}
                    </div>

                    <div className="detail-panel">
                      <h3>Category-wise sales</h3>
                      {dashboardAnalysis.category_sales.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Sales</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardAnalysis.category_sales.map((item) => (
                              <tr key={item.category}>
                                <td>{item.category}</td>
                                <td>Rs {item.total_sales.toFixed(2)}</td>
                                <td>{item.total_quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p>No category sales available.</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <h3 style={{marginTop: "30px"}}>Low Stock Items ({stockAnalysis.low_stock_items.length})</h3>
              {stockAnalysis.low_stock_items.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Barcode</th>
                      <th>Stock Qty</th>
                      <th>Buy Price</th>
                      <th>Sell Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAnalysis.low_stock_items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.barcode}</td>
                        <td style={{color: "#dc2626"}}><strong>{item.stock_quantity}</strong></td>
                        <td>Rs {item.buy_price.toFixed(2)}</td>
                        <td>Rs {item.sell_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>All items are well stocked!</p>
              )}
            </section>
          )}

          {analyticsTab === "sales" && salesAnalysis && dashboardAnalysis && (
            <section className="card">
              <h2>Sales Analysis</h2>
              <div className="analytics-summary">
                <div className="analytics-card">
                  <span>Total Sales Value</span>
                  <strong>Rs {salesAnalysis.total_sales_value.toFixed(2)}</strong>
                </div>
                <div className="analytics-card">
                  <span>Total Transactions</span>
                  <strong>{salesAnalysis.total_transactions}</strong>
                </div>
                <div className="analytics-card">
                  <span>Average Transaction Value</span>
                  <strong>Rs {salesAnalysis.average_transaction_value.toFixed(2)}</strong>
                </div>
                <div className="analytics-card">
                  <span>Items Sold</span>
                  <strong>{dashboardAnalysis.summary.total_quantity_sold}</strong>
                </div>
              </div>

              <div className="chart-toolbar">
                <label>
                  Filter:
                  <select value={dashboardFilter} onChange={(e) => {
                    const nextVal = e.target.value;
                    setDashboardFilter(nextVal);
                    loadDashboardAnalytics(nextVal);
                  }}>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </label>
              </div>

              <div className="chart-card">
                <div className="chart-header-row">
                  <div>
                    <h3>Live sales graph</h3>
                    <p>{dashboardAnalysis.period.toUpperCase()} trend</p>
                  </div>
                  <strong>Rs {dashboardAnalysis.summary.total_sales_value.toFixed(2)}</strong>
                </div>
                <SalesTrendChart points={dashboardAnalysis.sales_trend} />
              </div>

              <div className="analytics-summary details-grid">
                <div className="analytics-card">
                  <span>Best category</span>
                  <strong>{dashboardAnalysis.best_category.category}</strong>
                  <small>Rs {dashboardAnalysis.best_category.total_sales.toFixed(2)}</small>
                </div>
                <div className="analytics-card">
                  <span>Lowest category</span>
                  <strong>{dashboardAnalysis.lowest_category.category}</strong>
                  <small>Rs {dashboardAnalysis.lowest_category.total_sales.toFixed(2)}</small>
                </div>
                <div className="analytics-card">
                  <span>Average bill</span>
                  <strong>Rs {dashboardAnalysis.summary.avg_transaction_value.toFixed(2)}</strong>
                </div>
                <div className="analytics-card">
                  <span>Transactions</span>
                  <strong>{dashboardAnalysis.summary.total_transactions}</strong>
                </div>
              </div>

              <div className="detail-panels">
                <div className="detail-panel">
                  <h3>Category-wise sales</h3>
                  {dashboardAnalysis.category_sales.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Sales</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardAnalysis.category_sales.map((item) => (
                          <tr key={item.category}>
                            <td>{item.category}</td>
                            <td>Rs {item.total_sales.toFixed(2)}</td>
                            <td>{item.total_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No category sales available.</p>
                  )}
                </div>

                <div className="detail-panel">
                  <h3>Top selling products</h3>
                  {salesAnalysis.top_products.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesAnalysis.top_products.map((product, index) => (
                          <tr key={index}>
                            <td>{product.name}</td>
                            <td>{product.total_quantity_sold}</td>
                            <td>Rs {product.total_revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No sales data available.</p>
                  )}
                </div>
              </div>

              <div className="detail-panels">
                <div className="detail-panel">
                  <h3>Payment mode breakdown</h3>
                  {salesAnalysis.payment_modes.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Mode</th>
                          <th>Count</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesAnalysis.payment_modes.map((mode, index) => (
                          <tr key={index}>
                            <td>{mode.mode.toUpperCase()}</td>
                            <td>{mode.count}</td>
                            <td>Rs {mode.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No payment data available.</p>
                  )}
                </div>

                <div className="detail-panel">
                  <h3>Stock by category</h3>
                  {dashboardAnalysis.stock_by_category.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Stock Qty</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardAnalysis.stock_by_category.map((item) => (
                          <tr key={item.category}>
                            <td>{item.category}</td>
                            <td>{item.stock_quantity}</td>
                            <td>Rs {item.stock_value.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No stock categories available.</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      ) : activeWorkspace === "customers" ? (
        <section className="card">
          <h2>Customer Details</h2>
          <div className="analytics-summary">
            <div className="analytics-card">
              <span>Total Customers</span>
              <strong>{customersAnalysis ? customersAnalysis.total_customers : 0}</strong>
            </div>
          </div>

          <h3 style={{marginTop: "30px"}}>Customer List</h3>
          {customersAnalysis && customersAnalysis.customers.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Purchase Count</th>
                  <th>Total Spent</th>
                  <th>Average Purchase</th>
                  <th>Last Purchase</th>
                </tr>
              </thead>
              <tbody>
                {customersAnalysis.customers.map((customer, index) => {
                  const rowKey = `${customer.phone}-${customer.name}-${index}`;
                  const isCopied = copiedPhoneKey === rowKey;

                  return (
                    <tr key={rowKey}>
                      <td>{customer.name}</td>
                      <td>
                        <span className="customer-phone-cell">
                          {customer.phone}
                          <button
                            type="button"
                            className={`secondary-button inline-copy-button${isCopied ? " copied" : ""}`}
                            onClick={() => handleCopyPhone(customer.phone, rowKey)}
                            title={isCopied ? "Copied" : `Copy ${customer.phone}`}
                            aria-label={isCopied ? `Copied ${customer.phone}` : `Copy ${customer.phone}`}
                          >
                            {isCopied ? <CheckIcon /> : <CopyIcon />}
                          </button>
                          <button
                            type="button"
                            className="secondary-button inline-edit-button"
                            onClick={() => handleEditCustomer(customer)}
                            title={`Edit ${customer.name}`}
                            aria-label={`Edit ${customer.name}`}
                          >
                            <EditIcon />
                          </button>
                        </span>
                      </td>
                      <td>{customer.purchase_count}</td>
                      <td><strong>Rs {customer.total_spent.toFixed(2)}</strong></td>
                      <td>Rs {customer.average_purchase.toFixed(2)}</td>
                      <td>{customer.last_purchase_date ? new Date(customer.last_purchase_date).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p>No customer data available.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
