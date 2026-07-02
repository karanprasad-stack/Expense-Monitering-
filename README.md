# 💸 Expense Monitoring & Budget Planning Application

A premium, full-stack personal finance and budget planning web application. Designed to offer real-time insights into your monthly budgets, categorized expenses, and spending habits with interactive charts and automated budget-limit alerts.

---

## 🌟 Key Features

### 📊 Dynamic Financial Dashboard
* **High-Level Statistics**: View your Total Budget, Allocated Budget, Total Spent, and Net Savings at a glance.
* **Smart Budget Alerts**: Get visual alerts when subcategory expenses exceed allocated budgets, showing the exact amount overspent.
* **Interactive Charting**:
  * **Category Budget Comparison**: Side-by-side bar charts (via Recharts) showing Allocated vs. Actual spent amounts.
  * **Subcategory Spending Breakdown**: Interactive pie/donut charts detailing exactly where your money goes.
* **Recent Transactions**: Quick access list of the latest transactions with automatic tags for category and subcategory.

### 📅 Advanced Budget Planning
* **Monthly Budgets**: Set and update a dedicated total budget limit for any month and year.
* **Two-Tier Category Management**:
  * Create, edit, and delete **Parent Categories** (e.g., *Monthly Expenses*, *Investment*).
  * Build specific **Subcategories** (e.g., *Groceries*, *Dining*, *Gas*) with individual budget allocations.
* **Allocation Breakdown**: Visual pie chart depicting the allocation of the parent category budget to its subcategories, ensuring you don't over-allocate.
* **Real-time Utilization Tracker**: See progress indicators (Safe, Warning, Overspent) showing the exact utilization percentage per subcategory.

### 🔒 Enterprise-Grade Security & Auth
* **JWT Authentication**: Secure user registration and login, with token validation handling on request/response interceptors.
* **CORS Origin Restricting**: Restricts cross-origin requests to trusted origins only.
* **NoSQL Injection Protection**: Automatic MongoDB query sanitization to prevent database-level attacks.
* **Multi-Layer Rate Limiting**:
  * Global rate limiter to protect API routes (100 requests / 15 mins).
  * Strict auth rate limiter to deter brute-force login attempts (10 attempts / 15 mins).
* **Security Headers**: Uses Helmet to secure Express headers (XSS, clickjacking protection).

---

## 🛠️ Technology Stack

### Frontend
* **Core**: React 19, JavaScript (ES6+)
* **Build Tool**: Vite 8
* **Routing**: React Router Dom v7
* **Charts**: Recharts (Pie, Bar, Cell, ResponsiveContainer)
* **Styling**: Tailwind CSS v4, PostCSS, Autoprefixer
* **Icons & Animation**: Lucide React, Framer Motion
* **API Client**: Axios (with custom auth interceptors)

### Backend
* **Runtime & Framework**: Node.js, Express 5
* **Database**: MongoDB (Object modeling via Mongoose)
* **Authentication**: JSON Web Token (JWT), Bcrypt.js
* **Security**: Helmet, Express-Rate-Limit, Express-Mongo-Sanitize, Cors
* **Scheduling**: Node-Cron (for recurring checks and maintenance)
* **Logging**: Morgan (development environment logger)

---

## 📂 Project Directory Structure

```text
Expense Monitoring/
│
├── backend/                  # Node.js Express Server
│   ├── config/               # Database Connection & Configs
│   ├── controllers/          # Business Logic per route
│   ├── middleware/           # Auth, Sanitization & Rate Limiters
│   ├── models/               # MongoDB Schemas (User, Budget, Category, Expense)
│   ├── routes/               # API Endpoints
│   ├── server.js             # Express app startup & configuration
│   ├── .env.example          # Environment Template
│   └── package.json          # Backend scripts & dependencies
│
├── frontend/                 # React SPA Client
│   ├── src/
│   │   ├── assets/           # Static images, styles & assets
│   │   ├── components/       # Reusable UI Components
│   │   ├── context/          # Context API for auth and global state
│   │   ├── pages/            # Application Pages (Dashboard, BudgetPlanning, Login, etc.)
│   │   ├── utils/            # Helper utilities, Axios instances
│   │   ├── main.jsx          # Application entry point
│   │   └── index.css         # Styling system configuration
│   ├── vite.config.js        # Vite configurations
│   ├── tailwind.config.js    # Tailwind layout customizations
│   └── package.json          # Frontend scripts & dependencies
│
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or higher recommended)
* [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas URI)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Update the variables in `.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/budget-app
   JWT_SECRET=your_super_secret_jwt_key
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=development
   ```
5. Start the backend server:
   ```bash
   npm start
   ```
   *The server should run on `http://localhost:5000`.*

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the frontend folder:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the frontend application:
   ```bash
   npm run dev
   ```
   *The app should open on `http://localhost:5173`.*

---

## 📌 API Endpoint Reference

| Endpoint | Method | Description | Auth Required |
| :--- | :---: | :--- | :---: |
| `/api/auth/register` | `POST` | Create a new user profile | No |
| `/api/auth/login` | `POST` | Authenticate user & receive token | No |
| `/api/budgets` | `GET` | Fetch user budget for specific month/year | Yes |
| `/api/budgets` | `POST` | Create or update total monthly budget | Yes |
| `/api/categories` | `GET` | Get all categories and subcategories | Yes |
| `/api/categories` | `POST` | Add a new parent category | Yes |
| `/api/categories/:id` | `PUT` | Edit a parent category name | Yes |
| `/api/categories/:id` | `DELETE` | Delete a category (cascades subcategories & expenses) | Yes |
| `/api/categories/:id/subcategories` | `POST` | Add subcategory with allocated budget | Yes |
| `/api/categories/subcategories/:subId` | `PUT` | Update subcategory name/allocation | Yes |
| `/api/categories/subcategories/:subId` | `DELETE`| Remove a subcategory and its expenses | Yes |
| `/api/expenses` | `POST` | Record a new expense | Yes |
| `/api/dashboard` | `GET` | Retrieve analytical dashboard data | Yes |

---

## 🔒 Security Best Practices Implemented
* **Data Sanitization**: All incoming requests are run through query sanitization middleware that cleanses field names starting with `$` or containing `.` to prevent NoSQL injection.
* **Express Rate Limiting**: Prevents denial of service (DoS) and automated attacks.
* **Password Hashing**: User passwords are securely salted and hashed using Bcrypt before being stored in the database.
* **Scoped Tokens**: JWT tokens are signed with a secret key and set to expire, preventing permanent session compromise.

---

## 📄 License

This project is licensed under the ISC License. Feel free to clone, modify, and distribute as desired.
