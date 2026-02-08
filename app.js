import { db } from "./db.js";

/* ======================
   ESTADO GLOBAL
====================== */
let products = db.get("products") || [];
let sales = db.get("sales") || [];
let view = "dashboard";
let editProductIndex = null;

const app = document.getElementById("app");

/* ======================
   INIT
====================== */
renderApp();
renderView();

/* ======================
   LAYOUT
====================== */
function renderApp() {
  app.innerHTML = `
    <div class="app-shell">
      <aside id="sidebar" class="sidebar">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <h2 style="margin:0;">CajaFeria</h2>
          <button
            onclick="toggleMenu()"
            style="
              width:32px;
              height:32px;
              cursor:pointer;
              font-size:18px;
              line-height:1;
            "
            aria-label="Cerrar menú"
          >✕</button>
        </div>

        <button onclick="go('dashboard')">📊 Caja</button>
        <button onclick="go('products')">📦 Productos</button>
        <button onclick="go('sale')">💸 Nueva venta</button>
        <button onclick="go('history')">🧾 Ventas</button>
      </aside>

      <div class="app-main">
        <header class="topbar">
          <button class="hamburger" onclick="toggleMenu()">☰</button>
          <span>Sistema de Gestión Comercial</span>
        </header>

        <main id="content"></main>
      </div>
    </div>
  `;
}


/* ======================
   NAVEGACIÓN (GLOBAL)
====================== */
window.toggleMenu = function () {
  document.getElementById("sidebar").classList.toggle("open");
};

window.go = function (v) {
  view = v;
  editProductIndex = null;
  document.getElementById("sidebar").classList.remove("open");
  renderView();
};

/* ======================
   ROUTER
====================== */
function renderView() {
  const c = document.getElementById("content");
  if (view === "dashboard") renderDashboard(c);
  if (view === "products") renderProducts(c);
  if (view === "sale") renderSale(c);
  if (view === "history") renderHistory(c);
}

/* ======================
   DASHBOARD
====================== */
function renderDashboard(c) {
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => s.date === today);

  const total = sum(todaySales, "total");
  const profit = sum(todaySales, s => s.total - s.cost);

  c.innerHTML = `
    <h1>Caja del día</h1>
    <div class="grid">
      ${card("Ventas", todaySales.length)}
      ${card("Total", `$${total}`)}
      ${card("Ganancia", `$${profit}`)}
    </div>
    <button class="action danger" onclick="closeDay()">Cerrar caja</button>
  `;
}

/* ======================
   PRODUCTOS
====================== */
function renderProducts(c) {
  const p = editProductIndex !== null ? products[editProductIndex] : {};

  c.innerHTML = `
    <h1>Productos</h1>

    <div class="card">
      <input id="pName" placeholder="Nombre" value="${p.name || ""}">
      <input id="pCost" type="number" placeholder="Costo" value="${p.cost || ""}">
      <input id="pPrice" type="number" placeholder="Precio" value="${p.price || ""}">
      <input id="pStock" type="number" placeholder="Stock" value="${p.stock || ""}">
      <button class="action" onclick="saveProduct()">
        ${editProductIndex !== null ? "Actualizar" : "Agregar"}
      </button>
    </div>

    <table>
      <tr><th>Producto</th><th>Precio</th><th>Stock</th><th></th></tr>
      ${products.map((p,i)=>`
        <tr>
          <td>${p.name}</td>
          <td>$${p.price}</td>
          <td>${p.stock}</td>
          <td>
            <button onclick="editProduct(${i})">✏️</button>
            <button class="danger" onclick="deleteProduct(${i})">🗑️</button>
          </td>
        </tr>
      `).join("")}
    </table>
  `;
}

window.saveProduct = function () {
  const product = {
    name: pName.value,
    cost: +pCost.value,
    price: +pPrice.value,
    stock: +pStock.value
  };

  if (!product.name) return alert("Nombre requerido");

  if (editProductIndex !== null) {
    products[editProductIndex] = product;
  } else {
    products.push(product);
  }

  db.set("products", products);
  editProductIndex = null;
  renderView();
};

window.editProduct = function (i) {
  editProductIndex = i;
  renderView();
};

window.deleteProduct = function (i) {
  if (confirm("Eliminar producto?")) {
    products.splice(i,1);
    db.set("products", products);
    renderView();
  }
};

/* ======================
   VENTAS
====================== */
function renderSale(c) {
  if (!products.length) {
    c.innerHTML = `<p>No hay productos cargados</p>`;
    return;
  }

  c.innerHTML = `
    <h1>Nueva venta</h1>
    <div class="card">
      <select id="saleProduct">
        ${products.map((p,i)=>`<option value="${i}">${p.name} - $${p.price}</option>`).join("")}
      </select>

      <input id="saleQty" type="number" min="1" value="1">

      <select id="salePay">
        <option value="efectivo">Efectivo</option>
        <option value="transferencia">Transferencia</option>
      </select>

      <button class="action" onclick="makeSale()">Confirmar</button>
    </div>
  `;
}

window.makeSale = function () {
  const i = saleProduct.value;
  const qty = +saleQty.value;

  if (products[i].stock < qty) return alert("Stock insuficiente");

  products[i].stock -= qty;

  sales.push({
    product: products[i].name,
    qty,
    total: qty * products[i].price,
    cost: qty * products[i].cost,
    pay: salePay.value,
    date: new Date().toDateString()
  });

  db.set("products", products);
  db.set("sales", sales);
  go("dashboard");
};

/* ======================
   HISTORIAL
====================== */
function renderHistory(c) {
  c.innerHTML = `
    <h1>Ventas</h1>
    <table>
      <tr><th>Producto</th><th>Cant</th><th>Total</th><th>Pago</th><th></th></tr>
      ${sales.map((s,i)=>`
        <tr>
          <td>${s.product}</td>
          <td>${s.qty}</td>
          <td>$${s.total}</td>
          <td>${s.pay}</td>
          <td>
            <button class="danger" onclick="deleteSale(${i})">🗑️</button>
          </td>
        </tr>
      `).join("")}
    </table>
  `;
}

window.deleteSale = function (i) {
  if (confirm("Eliminar venta?")) {
    sales.splice(i,1);
    db.set("sales", sales);
    renderView();
  }
};

/* ======================
   HELPERS
====================== */
function sum(arr, k) {
  return arr.reduce((a,x)=>a+(typeof k==="function"?k(x):x[k]),0);
}

function card(t,v) {
  return `<div class="card"><small>${t}</small><b>${v}</b></div>`;
}

window.closeDay = function () {
  alert("Caja cerrada");
};

/* ======================
   PWA (SAFE)
====================== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .catch(() => {});
}
