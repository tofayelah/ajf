export interface UserEntity {
  id: number;
  userUuid: string;
  memberId?: string | null;
  username: string;
  passwordHash?: string | null;
  pinHash?: string | null;
  roleId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'SUSPENDED';
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}
