# 💸 FinTrack — Personal Expense Monitoring, Budget Planning & Udhar Ledger

A modern, full-stack personal finance platform built with React 19, Node.js, Express, and MongoDB. **FinTrack** provides real-time monthly budget tracking, multi-tier expense categorization, interactive charts, automated overspending alerts, an end-to-end **Lending & Borrowing (Udhar)** ledger, and a polished **Dark & Light Mode** theme system.

---

## 🌟 Key Features

### 📊 1. Financial Dashboard
* **Real-time Overview Cards**: Track **Total Budget**, **Allocated Budget**, **Total Spent**, and **Net Savings** for any month/year.
* **Smart Overspending Alerts**: Highlights exceeded subcategories with exact overspent amounts (+₹).
* **Interactive Visual Analytics (Recharts)**:
  * **Category Budget Comparison**: Side-by-side bar charts comparing allocated budgets vs. actual spending.
  * **Subcategory Spending Breakdown**: Interactive donut chart detailing spending distribution.
* **Recent Activity**: Quick snapshot of recent expenses with categorized badges and a dedicated **View All Transactions** modal.

### 📅 2. Advanced Budget Planning
* **Monthly Budgeting**: Define and update overall budget ceilings for any month and year.
* **Two-Tier Category Hierarchy**:
  * Organize finances into **Parent Categories** (e.g., *Living Expenses*, *Entertainment*, *Investments*).
  * Break down parents into **Subcategories** (e.g., *Groceries*, *Electricity*, *Dining*) with dedicated spending limits.
* **Interactive Subcategory Transactions Panel**: Click any subcategory card or chart slice to view, edit, or delete transactions recorded under that specific subcategory.
* **Real-Time Utilization Badges**: Dynamic visual indicators (Normal, Warning at 70%, and Overspent alerts) with utilization percentages.

### 🤝 3. Lending & Borrowing ("Udhar") Management
* **Independent Debt Ledger**: Track money given to others (lent / repaid) and money received from others (borrowed / returned).
* **Automated Net Balance & Status Tracking**:
  * `THEY_OWE_YOU` (Positive Net Balance — Green)
  * `YOU_OWE_THEM` (Negative Net Balance — Red)
  * `SETTLED` (Zero Balance — Gray)
* **Contact Directory**: Manage people with names, phone numbers, and notes.
* **Per-Person Ledger History**: View full chronological transaction history for each person with edit, delete, and "Settle Up" actions.
* **Live Search & Status Filtering**: Filter contacts instantly by name or status (`All`, `They Owe Me`, `I Owe Them`, `Settled`).

### 💳 4. Comprehensive Transactions Management
* **Record Expenses**: Add transactions with date, category, subcategory, payment method (*UPI, Credit Card, Debit Card, Cash, Net Banking*), amount, and notes.
* **Double-Submit & Idempotency Guard**: Client and server-side idempotency keys (`X-Idempotency-Key`) eliminate duplicate transactions on rapid clicks.
* **Search & Filter Controls**: Live filtering by search query, parent category, and subcategory.
* **Edit & Safe Delete**: In-place editing and modal-based delete confirmations that automatically synchronize budget limits.

### 🌓 5. Dark Mode & Light Mode
* **Instant Theme Switching**: Animated Sun/Moon toggle button in the header.
* **Theme Persistence**: Preserves user preference in `localStorage` with fallback to OS `prefers-color-scheme`.
* **Eye-Pleasing Dark Aesthetics**: Tailored high-contrast dark theme with softened matte chart palettes (`#60a5fa`, `#34d399`, `#a78bfa`, `#f472b6`, `#38bdf8`, `#fbbf24`), dark calendar pickers, and glassmorphic cards without visual glare.

### 🔒 6. Security & Data Integrity
* **JWT Authentication**: Secure user registration and login with token validation interceptors.
* **NoSQL Injection Defense**: Automated query sanitization via `mongoSanitize` middleware.
* **Production Rate Limiting**: Multi-tier API rate limiting with strict auth protection against brute-force attacks.
* **Security Headers**: Helmet integration for XSS, MIME-sniffing, and clickjacking protection.
* **CORS Whitelisting**: Restricted origin access with local LAN and development environment support.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, JavaScript (ES6+), Vite 8, React Router v7 |
| **Styling & UI** | Tailwind CSS v4, Vanilla CSS Design System, Lucide React, Framer Motion |
| **Data Visualization** | Recharts (Pie, Bar, Cell, Tooltip, ResponsiveContainer) |
| **Backend API** | Node.js, Express 5 |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication & Security** | JSON Web Token (JWT), Bcrypt.js, Helmet, Express-Rate-Limit, Mongo-Sanitize, CORS |
| **HTTP Client** | Axios (with request/response interceptors & idempotency headers) |

---

## 📂 Project Structure

```text
Expense Monitoring/
├── backend/
│   ├── config/
│   │   └── db.js                         # MongoDB connection logic
│   ├── controllers/
│   │   ├── authController.js             # User register, login & profile
│   │   ├── budgetController.js           # Budget creation & retrieval
│   │   ├── categoryController.js         # Categories & subcategories CRUD
│   │   ├── expenseController.js          # Expense tracking & idempotency
│   │   ├── dashboardController.js        # Analytics & summary aggregation
│   │   └── udharController.js            # People & Udhar transactions CRUD
│   ├── middleware/
│   │   ├── authMiddleware.js             # JWT bearer verification
│   │   └── mongoSanitizeMiddleware.js    # NoSQL injection protection
│   ├── models/
│   │   ├── User.js                       # User schema & password hashing
│   │   ├── Budget.js                     # Monthly budget schema
│   │   ├── Category.js                   # Parent category & subcategory schema
│   │   ├── Expense.js                    # Expense transaction schema
│   │   ├── UdharPerson.js                # Udhar contact schema
│   │   └── UdharTransaction.js           # Udhar transaction schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── udharRoutes.js
│   ├── server.js                         # Express server configuration
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.jsx            # Main app shell, header & theme toggle
│   │   │   │   └── Sidebar.jsx           # Responsive sidebar navigation
│   │   │   └── WelcomeScreen.jsx         # Animated login greeting
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # Authentication state & actions
│   │   │   └── ThemeContext.jsx          # Dark/Light mode theme state
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx             # Financial summary & analytics
│   │   │   ├── BudgetPlanning.jsx        # Category budgets & subcategory panel
│   │   │   ├── Transactions.jsx          # Expense history & form
│   │   │   ├── LendingBorrowing.jsx      # Udhar contacts & ledger
│   │   │   ├── Login.jsx                 # User sign in
│   │   │   └── Register.jsx              # User registration
│   │   ├── utils/
│   │   │   └── axios.js                  # Axios instance with auth interceptors
│   │   ├── App.jsx                       # Routing configuration
│   │   ├── main.jsx                      # React DOM root & providers
│   │   └── index.css                     # Tailwind & global theme styling
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.x or higher)
* **MongoDB** (Local instance or MongoDB Atlas connection string)
* **npm** or **yarn**

---

### 1. Backend Setup

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=development
   ```
4. Start the backend server:
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```
   *Backend will run at `http://localhost:5000`.*

---

### 2. Frontend Setup

1. In a new terminal, navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` folder:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend will open at `http://localhost:5173`.*

---

## 📌 API Endpoint Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login and receive JWT | ❌ |

### 📊 Dashboard & Analytics (`/api/dashboard`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/dashboard?month=M&year=YYYY` | Get monthly budget summary, chart metrics & recent expenses | ✅ |

### 💰 Budget Planning (`/api/budgets`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/budgets?month=M&year=YYYY` | Fetch budget for specific month and year | ✅ |
| `POST` | `/api/budgets` | Set or update monthly budget ceiling | ✅ |

### 🏷️ Categories & Subcategories (`/api/categories`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/categories?budgetId=ID` | Fetch all categories and subcategories | ✅ |
| `POST` | `/api/categories` | Create a parent category | ✅ |
| `PUT` | `/api/categories/:id` | Update parent category name | ✅ |
| `DELETE` | `/api/categories/:id` | Delete parent category and cascade delete children | ✅ |
| `POST` | `/api/categories/:id/subcategories` | Add a subcategory with allocated budget | ✅ |
| `PUT` | `/api/categories/subcategories/:subId` | Update subcategory name or allocation | ✅ |
| `DELETE` | `/api/categories/subcategories/:subId` | Remove subcategory and associated expenses | ✅ |

### 💳 Expense Transactions (`/api/expenses`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/expenses` | Get all expenses (supports `subcategoryId`, `month`, `year` filters) | ✅ |
| `POST` | `/api/expenses` | Record a new expense (supports `X-Idempotency-Key`) | ✅ |
| `PUT` | `/api/expenses/:id` | Update an existing expense | ✅ |
| `DELETE` | `/api/expenses/:id` | Delete an expense and restore budget | ✅ |

### 🤝 Lending & Borrowing / Udhar (`/api/udhar`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/udhar/overview` | Fetch total to receive, total to pay, and net balance | ✅ |
| `GET` | `/api/udhar/people` | List all contacts (supports `search` & `status` filters) | ✅ |
| `POST` | `/api/udhar/people` | Add a new contact | ✅ |
| `PUT` | `/api/udhar/people/:id` | Update contact details | ✅ |
| `DELETE` | `/api/udhar/people/:id` | Delete contact and cascade remove transactions | ✅ |
| `GET` | `/api/udhar/people/:id/transactions` | Get chronological transaction history for a person | ✅ |
| `POST` | `/api/udhar/transactions` | Record a gave/received transaction (supports `X-Idempotency-Key`) | ✅ |
| `PUT` | `/api/udhar/transactions/:id` | Edit an existing Udhar transaction | ✅ |
| `DELETE` | `/api/udhar/transactions/:id` | Delete an Udhar transaction | ✅ |

---

## 🧪 Testing & Validation

The project includes an end-to-end integration test suite verifying:
1. Contact lifecycle & ledger transactions
2. Automated balance calculation & status transitions (`THEY_OWE_YOU`, `YOU_OWE_THEM`, `SETTLED`)
3. Double-submission idempotency protection
4. Search & status filtering accuracy
5. Overview statistic mathematical totals

To run tests:
```bash
node scratch/test_udhar.js
```

---

## 📄 License

This project is licensed under the **ISC License**. Feel free to use, modify, and distribute.
