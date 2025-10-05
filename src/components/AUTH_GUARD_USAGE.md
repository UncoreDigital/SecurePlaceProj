# AuthGuard Usage Guide

The `AuthGuard` component provides localStorage-based authentication for all dashboard pages without server calls.

## Location
`src/components/AuthGuard.tsx`

## Basic Usage

### 1. SuperAdmin Only Pages
```tsx
import { SuperAdminGuard } from "@/components/AuthGuard";

export default function SuperAdminPage() {
  return (
    <SuperAdminGuard>
      <div>Super Admin Content</div>
    </SuperAdminGuard>
  );
}
```

### 2. Firm Admin Only Pages
```tsx
import { FirmAdminGuard } from "@/components/AuthGuard";

export default function FirmAdminPage() {
  return (
    <FirmAdminGuard>
      <div>Firm Admin Content</div>
    </FirmAdminGuard>
  );
}
```

### 3. Any Admin (Super Admin OR Firm Admin)
```tsx
import { AdminGuard } from "@/components/AuthGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <div>Any Admin Content</div>
    </AdminGuard>
  );
}
```

### 4. Employee Only Pages
```tsx
import { EmployeeGuard } from "@/components/AuthGuard";

export default function EmployeePage() {
  return (
    <EmployeeGuard>
      <div>Employee Content</div>
    </EmployeeGuard>
  );
}
```

### 5. Any Authenticated User
```tsx
import { AnyUserGuard } from "@/components/AuthGuard";

export default function DashboardPage() {
  return (
    <AnyUserGuard>
      <div>Any User Content</div>
    </AnyUserGuard>
  );
}
```

## Advanced Usage

### Custom Roles and Options
```tsx
import AuthGuard from "@/components/AuthGuard";

export default function CustomPage() {
  return (
    <AuthGuard 
      requiredRole={["super_admin", "custom_role"]}
      redirectTo="/unauthorized"
      loadingMessage="Verifying access..."
      showLoading={true}
    >
      <div>Custom Protected Content</div>
    </AuthGuard>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `requiredRole` | `string \| string[]` | `"super_admin"` | Required role(s) to access the page |
| `redirectTo` | `string` | `"/"` | Where to redirect unauthorized users |
| `showLoading` | `boolean` | `true` | Show loading spinner while checking auth |
| `loadingMessage` | `string` | `"Checking permissions..."` | Custom loading message |

## How It Works

1. **No Server Calls**: Uses `loadUserDetailLocalStorage()` from localStorage
2. **Fast Checks**: Immediate authentication from browser storage
3. **Role-Based**: Supports single or multiple role requirements
4. **Automatic Redirect**: Unauthorized users redirected automatically
5. **Loading States**: Shows spinner while checking (optional)

## Pages That Should Use AuthGuard

### Super Admin Only:
- `/dashboard/super-admin/firm-management` → `<SuperAdminGuard>`
- `/dashboard/super-admin/firm-admin-management` → `<SuperAdminGuard>`

### Firm Admin Only:
- `/dashboard/firm-admin-dashboard` → `<FirmAdminGuard>`

### Any Admin:
- `/dashboard/locations` → `<AdminGuard>`
- `/dashboard/employees` → `<AdminGuard>`
- `/dashboard/safety-classes` → `<AdminGuard>`

### Any User:
- `/dashboard/drills` → `<AnyUserGuard>`
- `/dashboard/emergencies` → `<AnyUserGuard>`

## Benefits

✅ **No Server Calls** - Uses localStorage as requested  
✅ **Fast Authentication** - Immediate check from browser  
✅ **Reusable** - One component for all pages  
✅ **Type Safe** - Full TypeScript support  
✅ **Customizable** - Flexible props for different needs  
✅ **Loading States** - Professional user experience  