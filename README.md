# 🚀 Trust Digital Admin System

A modern admin system for managing Netflix accounts with Vercel PostgreSQL database integration.

## 🌟 Features

### 💾 **Database Integration**
- **Vercel PostgreSQL** with Prisma ORM
- **Real-time data sync** every 5 minutes
- **Auto-save functionality** with error handling
- **Offline detection** and connection status

### 🛡️ **Account Management**
- **Main Stock Management** - Regular account inventory
- **Garansi Database** - Separate warranty account tracking
- **Profile Management** - Individual profile usage tracking
- **Account Reporting** - Report and resolve account issues

### 📊 **Analytics & Statistics**
- **Customer Statistics** - Track customer assignments
- **Operator Performance** - Monitor operator activities
- **Real-time Counters** - Available profiles and accounts
- **Date-based Filtering** - Filter accounts by creation date

### 🔐 **User Management**
- **Role-based Access** - Admin and Operator roles
- **Secure Authentication** - Username/password login
- **Session Management** - Auto-save before logout

## 🛠️ **Tech Stack**

- **Frontend**: Next.js 14, React, TypeScript
- **Database**: Vercel PostgreSQL
- **ORM**: Prisma
- **UI**: Tailwind CSS, Radix UI, shadcn/ui
- **Styling**: Zenith-inspired design with purple gradients

## 🚀 **Quick Start**

### 1. **Environment Setup**

\`\`\`bash
# Copy environment variables
cp .env.example .env.local

# Add your Vercel PostgreSQL credentials
# Get these from your Vercel dashboard
\`\`\`

### 2. **Database Setup**

\`\`\`bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed database with sample data
npm run db:seed
\`\`\`

### 3. **Development**

\`\`\`bash
# Start development server
npm run dev

# Open Prisma Studio (optional)
npm run db:studio
\`\`\`

### 4. **Default Login Credentials**

- **Admin**: `admin` / `admin123`
- **Operator**: `operator` / `operator123`

## 📁 **Project Structure**

\`\`\`
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts               # Database seeding
├── lib/
│   ├── prisma.ts             # Prisma client
│   ├── database-service.ts   # Database operations
│   └── auth.ts               # Authentication logic
├── contexts/
│   └── account-context.tsx   # Global state management
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── dashboard-header.tsx  # Header with save/logout
│   ├── account-list.tsx      # Account management
│   ├── garansi.tsx          # Warranty accounts
│   └── ...                  # Other components
└── app/
    ├── page.tsx             # Login page
    └── dashboard/           # Dashboard pages
\`\`\`

## 🔧 **Database Schema**

### **Main Tables**
- `accounts` - Main stock accounts
- `garansi_accounts` - Warranty accounts (separate)
- `reported_accounts` - Account reports
- `customer_assignments` - Customer-account assignments
- `operator_activities` - Activity logs
- `users` - System users

### **Key Features**
- **Automatic timestamps** with `createdAt` and `updatedAt`
- **JSON profiles** for flexible profile storage
- **Cascade deletes** for data integrity
- **Unique constraints** for email validation

## 🎯 **Key Improvements**

### **✅ Fixed Issues**
1. **Data Persistence** - All data now saved to Vercel PostgreSQL
2. **Garansi Separation** - Warranty accounts don't affect main stock (8/20 counter)
3. **Auto-save Logout** - Data automatically saved before logout
4. **Real-time Sync** - Data refreshed every 5 minutes
5. **Connection Status** - Online/offline detection

### **🚀 New Features**
- **Database Integration** with Prisma ORM
- **Connection Status** indicator
- **Manual Save/Refresh** buttons
- **Error Handling** for database operations
- **User Management** with roles
- **Activity Logging** for audit trails

## 📊 **Database Operations**

### **Account Management**
\`\`\`typescript
// Add account to main stock
await DatabaseService.addAccount({
  email: "netflix@example.com",
  password: "password123",
  type: "private"
})

// Add garansi accounts (separate from main stock)
await DatabaseService.addGaransiAccounts([
  { email: "garansi@example.com", password: "pass123", type: "private" }
], new Date())
\`\`\`

### **Statistics & Analytics**
\`\`\`typescript
// Get customer statistics
const stats = await DatabaseService.getCustomerStatistics()

// Get operator performance
const operatorStats = await DatabaseService.getOperatorStatistics()
\`\`\`

## 🔐 **Security Features**

- **Role-based access control** (Admin/Operator)
- **Secure password storage** (ready for hashing)
- **Session management** with auto-logout
- **Data validation** with Prisma schema
- **Error handling** for all database operations

## 🌐 **Deployment**

### **Vercel Deployment**
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Database Migration**
\`\`\`bash
# Create migration
npx prisma migrate dev --name init

# Deploy to production
npx prisma migrate deploy
\`\`\`

## 📈 **Monitoring**

- **Connection Status** - Real-time online/offline detection
- **Auto-sync** - Data refreshed every 5 minutes
- **Error Logging** - All database errors logged to console
- **Activity Tracking** - All user actions logged

## 🎨 **UI/UX Features**

- **Zenith Design** - Modern purple gradient theme
- **Responsive Layout** - Works on all screen sizes
- **Loading States** - Visual feedback for all operations
- **Toast Notifications** - Success/error messages
- **Confirmation Dialogs** - Prevent accidental actions

---

## 🚀 **Ready to Use!**

Your admin system is now fully integrated with Vercel PostgreSQL database. All data is automatically saved and synchronized in real-time. The garansi feature is completely separated from main stock, and the system includes comprehensive error handling and user management.

**Start managing your Netflix accounts with confidence!** 🎉

## Deployment Instructions

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- A Vercel account

### Setting Up the Database

1. Create a new Vercel PostgreSQL database at [vercel.com](https://vercel.com)
2. Go to the SQL Editor in your Vercel dashboard
3. Run the SQL commands from `schema.prisma` to create the necessary tables

### Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`
NEXT_PUBLIC_VERCEL_POSTGRES_URL=your-vercel-postgres-url
NEXT_PUBLIC_VERCEL_POSTGRES_KEY=your-vercel-postgres-key
NEXT_PUBLIC_APP_URL=your-app-url
\`\`\`

Replace the placeholders with your actual Vercel PostgreSQL URL and key.

### Local Development

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`
   npm run dev
   \`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Deployment

#### Option 1: Deploy to Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add your environment variables in the Vercel dashboard
4. Deploy

#### Option 2: Deploy to a Traditional Hosting Service

1. Build the application:
   \`\`\`
   npm run build
   \`\`\`

2. Run the deployment script to create a deployment package:
   \`\`\`
   chmod +x deploy.sh
   ./deploy.sh
   \`\`\`

3. Upload the `deployment.zip` file to your hosting service
4. Extract the zip file on your server
5. Install production dependencies:
   \`\`\`
   npm install --production
   \`\`\`

6. Start the application:
   \`\`\`
   npm start
   \`\`\`

### Backup and Restore

To backup your database:
\`\`\`
chmod +x backup.sh
./backup.sh
\`\`\`

To restore from a backup:
\`\`\`
chmod +x restore.sh
./restore.sh backups/your-backup-file.sql
\`\`\`

## Login Credentials

Default admin login:
- Username: admin
- Password: admin123

Default operator login:
- Username: operator
- Password: operator123

Make sure to change these credentials in a production environment.
