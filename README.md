# Project Management Application

A comprehensive full-stack project management application with timesheet tracking, built with React, Node.js, and PostgreSQL.

## ✨ Features

- 🔐 **User Authentication**: JWT-based authentication with role-based access (Admin, Manager, Employee)
- 📋 **Project & Task Management**: Create, edit, delete projects and assign tasks to team members
- ⏰ **Daily Timesheet Tracking**: Log hours spent on tasks with auto-calculation and validation
- 📊 **Report Generation**: Export reports in CSV, Excel, and PDF formats
- 📈 **Dashboard & Analytics**: Summary statistics and visual charts
- 📱 **Mobile-Friendly**: Responsive design for all devices
- 🎨 **Beautiful UI**: Modern design with TailwindCSS and shadcn/ui components

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **shadcn/ui** components
- **React Router** for navigation
- **Zustand** for state management
- **React Hook Form** with Zod validation
- **Chart.js** for analytics
- **Lucide React** for icons

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **Sequelize** ORM
- **JWT** authentication
- **bcrypt** for password hashing
- **PDFKit** for PDF reports
- **ExcelJS** for Excel reports

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

1. **Clone the repository:**
```bash
git clone https://github.com/ashish9731/project-management-app.git
cd project-management-app
```

2. **Run the setup script:**
```bash
chmod +x setup.sh
./setup.sh
```

3. **Configure your database:**
   - Update `server/.env` with your PostgreSQL credentials
   - Make sure PostgreSQL is running

4. **Set up the database:**
```bash
cd server
npm run db:setup
```

5. **Start the application:**
```bash
cd ..
npm run dev
```

### Option 2: Manual Setup

1. **Install dependencies:**
```bash
npm run install-all
```

2. **Set up environment variables:**
```bash
cp server/env.example server/.env
cp client/env.example client/.env.local
```

3. **Configure database in `server/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_management
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
```

4. **Set up the database:**
```bash
cd server
npm run db:setup
```

5. **Start development servers:**
```bash
npm run dev
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Manager | manager@example.com | manager123 |
| Employee | employee@example.com | employee123 |

## Project Structure

```
project-management-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   └── public/
├── server/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
└── docs/                   # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Timesheets
- `GET /api/timesheets` - Get timesheets
- `POST /api/timesheets` - Log time entry
- `PUT /api/timesheets/:id` - Update time entry
- `DELETE /api/timesheets/:id` - Delete time entry

### Reports
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/weekly` - Weekly report
- `GET /api/reports/monthly` - Monthly report

## 🚀 Deployment

### Frontend Deployment (Vercel)

1. **Connect to Vercel:**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Select the `client` folder as the root directory

2. **Configure Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables:**
   - Add `VITE_API_URL` with your backend URL
   - Example: `https://your-backend.herokuapp.com/api`

4. **Deploy:**
   - Click "Deploy" and wait for the build to complete
   - Your frontend will be available at `https://your-app.vercel.app`

### Backend Deployment (Render/Heroku)

#### Option 1: Render (Recommended)

1. **Create a new Web Service:**
   - Connect your GitHub repository
   - Select the `server` folder as the root directory

2. **Configure Build Settings:**
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables:**
   ```env
   NODE_ENV=production
   DB_HOST=your-postgres-host
   DB_PORT=5432
   DB_NAME=your-database-name
   DB_USER=your-username
   DB_PASSWORD=your-password
   JWT_SECRET=your-super-secret-jwt-key
   CLIENT_URL=https://your-frontend.vercel.app
   ```

4. **Database Setup:**
   - Create a PostgreSQL database on Render
   - Update the environment variables with your database credentials

#### Option 2: Heroku

1. **Create Heroku App:**
   ```bash
   heroku create your-app-name
   ```

2. **Add PostgreSQL Add-on:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-super-secret-jwt-key
   heroku config:set CLIENT_URL=https://your-frontend.vercel.app
   ```

4. **Deploy:**
   ```bash
   git subtree push --prefix server heroku main
   ```

### Database Setup for Production

1. **Run Database Setup:**
   ```bash
   cd server
   npm run db:setup
   ```

2. **Verify Tables:**
   - Check that all tables are created
   - Verify default users are created

### Environment Variables Reference

#### Server (.env)
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_management
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CLIENT_URL=http://localhost:3000
```

#### Client (.env.local)
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=Project Management App
VITE_APP_VERSION=1.0.0
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Ashish Tiwari - [@touchwithashi](https://twitter.com/touchwithashi)
Project Link: [https://github.com/ashish9731/project-management-app](https://github.com/ashish9731/project-management-app)
