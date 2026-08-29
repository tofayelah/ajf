import { UserEntity } from '../entity/UserEntity';

/**
 * Interface representing the Data Access Object (DAO) for User entities.
 * In a real backend (e.g., TypeORM or Android Room), this would be annotated
 * with @Dao() or equivalent decorators.
 */
export interface UserDao {
  findAll(): Promise<UserEntity[]>;
  findById(id: number): Promise<UserEntity | null>;
  findByUserUuid(userUuid: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByMemberId(memberId: string): Promise<UserEntity | null>;
  insert(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity>;
  update(id: number, user: Partial<UserEntity>): Promise<UserEntity | null>;
  delete(id: number): Promise<boolean>;
}
