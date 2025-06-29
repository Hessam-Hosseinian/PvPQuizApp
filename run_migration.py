#!/usr/bin/env python3
import psycopg2
import os
from config import Config

def run_migration():
    """Run the avatar migration"""
    conn = None
    cur = None
    try:
        # Get database configuration
        config = Config()
        
        # Build connection string
        DATABASE_URL = f"postgresql://{config.DB_USER}:{config.DB_PASSWORD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"
        
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Check if avatar column already exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'avatar'
        """)
        
        if cur.fetchone():
            print("Avatar column already exists!")
            return
        
        # Add avatar column
        cur.execute("ALTER TABLE users ADD COLUMN avatar VARCHAR(255)")
        
        # Create index for avatar lookups
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(avatar) WHERE avatar IS NOT NULL")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully! Avatar column added to users table.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration() 