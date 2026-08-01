import { useEffect, useMemo, useRef, useState } from "react";
import { adjustStock, createProduct, createSale, listProducts, login, resetPassword } from "./api";

const defaultProduct = {
  barcode: "",
  name: "",
  category: "",
  buy_price: "",
  sell_price: "",
  stock_quantity: 0
};

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
  const [barcode, setBarcode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [productForm, setProductForm] = useState(defaultProduct);
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
  const [message, setMessage] = useState("");
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
      return;
    }

    localStorage.setItem("meghkanya_token", token);
    loadProducts();
  }, [token]);

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
      billingBarcodeInputRef.current?.focus();
    } catch (err) {
      setMessage(err?.message || "Checkout failed. Please verify stock and totals.");
    }
  }

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
        <img className="auth-logo" src="/logo/maghkanyalogo.jpeg" alt="Meghkanya" />
        <section className="auth-card">
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
          <p>Barcode-first inventory management and checkout workspace.</p>
        </div>
        <button className="secondary-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

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
      </nav>

      {activeWorkspace === "products" ? (
        <>
          <section className="card">
            <h2>Barcode Scan</h2>
            <div className="row">
              <input
                ref={barcodeInputRef}
                placeholder="Scan barcode here (USB scanner)"
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
                <strong>{scanResult.name}</strong>
                <span>Barcode: {scanResult.barcode}</span>
                <span>Selling Price: Rs {scanResult.sell_price}</span>
                <span>Stock: {scanResult.stock_quantity}</span>
                <div className="row">
                  <input
                    type="number"
                    value={stockChange}
                    onChange={(e) => setStockChange(e.target.value)}
                  />
                  <button onClick={handleAdjustStock}>Adjust Stock</button>
                </div>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Add Product</h2>
            <form className="grid" onSubmit={handleCreateProduct}>
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
          </section>
        </>
      ) : (
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
                <p>
                  Last Invoice: {lastInvoice.invoice_no} | Amount: Rs {Number(lastInvoice.total_amount).toFixed(2)}
                </p>
                <p>Customer: {lastInvoice.customer_name} | {lastInvoice.customer_phone}</p>
                <p>Shipping: {lastInvoice.shipping_address}</p>
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (!printWindow) return;
                    const labelHtml = `<!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8" />
                          <title>Shipment Labels - ${lastInvoice.invoice_no}</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 16px; }
                            .print-header { margin-bottom: 16px; }
                            .label { border: 1px solid #333; padding: 12px; margin-bottom: 16px; }
                            .label strong { display: block; margin-bottom: 4px; }
                            .barcode { font-family: monospace; font-size: 14px; margin: 8px 0; }
                          </style>
                        </head>
                        <body>
                          <div class="print-header">
                            <h1>Shipment Labels</h1>
                            <p><strong>Invoice:</strong> ${lastInvoice.invoice_no}</p>
                            <p><strong>Customer:</strong> ${lastInvoice.customer_name}</p>
                            <p><strong>Phone:</strong> ${lastInvoice.customer_phone}</p>
                            <p><strong>Address:</strong> ${lastInvoice.shipping_address}</p>
                          </div>
                          ${lastInvoice.items
                            .map(
                              (item, index) => `
                                <div class="label">
                                  <h2>Item ${index + 1}</h2>
                                  <strong>Product:</strong> ${item.name}
                                  <strong>SKU Barcode:</strong> ${item.barcode}
                                  <div class="barcode">Shipment ID: ${item.shipment_barcode}</div>
                                  <strong>Quantity:</strong> ${item.quantity}
                                </div>
                              `
                            )
                            .join("")}
                        </body>
                      </html>`;
                    printWindow.document.write(labelHtml);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                  }}
                >
                  Print Shipment Labels
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
