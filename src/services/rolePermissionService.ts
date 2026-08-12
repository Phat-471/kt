export type UserRole = 
  | 'ADMIN'             // Admin toàn quyền
  | 'CHIEF_ACCOUNTANT'  // Kế toán trưởng (Duyệt/Khóa sổ/BCTC)
  | 'ACCOUNTANT'        // Kế toán viên (Nhập liệu/Sửa nháp)
  | 'VIEWER'            // Người xem (CEO/Sếp - Readonly)
  | 'AUDITOR';          // Kiểm toán/Tư vấn thuế (Readonly + Audit log)

export interface RolePermission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  canBackupRestore: boolean;
  canManageUsers: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermission> = {
  ADMIN: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canApprove: true,
    canExport: true,
    canBackupRestore: true,
    canManageUsers: true,
  },
  CHIEF_ACCOUNTANT: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canApprove: true,
    canExport: true,
    canBackupRestore: false,
    canManageUsers: false,
  },
  ACCOUNTANT: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canApprove: false,
    canExport: true,
    canBackupRestore: false,
    canManageUsers: false,
  },
  VIEWER: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canExport: true,
    canBackupRestore: false,
    canManageUsers: false,
  },
  AUDITOR: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canExport: true,
    canBackupRestore: false,
    canManageUsers: false,
  },
};

export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN': return '👑 Quản Trị Hệ Thống (Admin)';
    case 'CHIEF_ACCOUNTANT': return '📑 Kế Toán Trưởng';
    case 'ACCOUNTANT': return '✍️ Kế Toán Viên';
    case 'VIEWER': return '👁 Người Xem Báo Cáo (CEO)';
    case 'AUDITOR': return '🔍 Kiểm Toán / Tư Vấn Thuế';
  }
};

export const checkPermission = (role: UserRole, action: keyof RolePermission): boolean => {
  return ROLE_PERMISSIONS[role][action];
};
