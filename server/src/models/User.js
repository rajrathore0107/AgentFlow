import db from '../db/setup.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export default class User {
  static async create({ email, username, password }) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    
    await db.query(`
      INSERT INTO users (id, email, username, password_hash)
      VALUES (?, ?, ?, ?)
    `, [id, email.toLowerCase(), username, passwordHash]);
    
    return this.findById(id);
  }

  static async findById(id) {
    return db.queryOne('SELECT id, email, username, created_at FROM users WHERE id = ?', [id]);
  }

  static async findByEmail(email) {
    return db.queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  }

  static async findByUsername(username) {
    return db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }
}
