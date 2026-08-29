import { UserDao } from '../db/dao/UserDao';
import { UserEntity } from '../db/entity/UserEntity';

const STORAGE_KEY = 'aj_welfare_users_table';

/**
 * Implementation of the UserRepository acting as the DAO over LocalStorage.
 * In a real backend, this would use a database connection (e.g., PostgreSQL).
 */
export class UserRepository implements UserDao {
  
  private getTable(): UserEntity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read users from localStorage', e);
      return [];
    }
  }

  private saveTable(users: UserEntity[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to localStorage', e);
    }
  }

  async findAll(): Promise<UserEntity[]> {
    return this.getTable();
  }

  async findById(id: number): Promise<UserEntity | null> {
    const users = this.getTable();
    return users.find(u => u.id === id) || null;
  }

  async findByUserUuid(userUuid: string): Promise<UserEntity | null> {
    const users = this.getTable();
    return users.find(u => u.userUuid === userUuid) || null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const users = this.getTable();
    return users.find(u => u.username === username) || null;
  }

  async findByMemberId(memberId: string): Promise<UserEntity | null> {
    const users = this.getTable();
    return users.find(u => u.memberId === memberId) || null;
  }

  async insert(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const users = this.getTable();
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const now = new Date().toISOString();
    
    const newUser: UserEntity = {
      ...user,
      id: newId,
      createdAt: now,
      updatedAt: now
    };
    
    users.push(newUser);
    this.saveTable(users);
    
    return newUser;
  }

  async update(id: number, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    const users = this.getTable();
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedUser = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    users[index] = updatedUser;
    this.saveTable(users);
    
    return updatedUser;
  }

  async delete(id: number): Promise<boolean> {
    const users = this.getTable();
    const filteredUsers = users.filter(u => u.id !== id);
    
    if (filteredUsers.length === users.length) {
      return false; // Not found
    }
    
    this.saveTable(filteredUsers);
    return true;
  }
}

// Export a singleton instance for easy use in the React app
export const userRepository = new UserRepository();
