#!/usr/bin/env python3
import psycopg2
import os
import sys  # Import the sys module
from config import Config

def run_migration(sql_file_path):
    """Run a given SQL migration file"""
    conn = None
    cur = None
    try:
        # Check if the file exists
        if not os.path.exists(sql_file_path):
            print(f"Error: Migration file not found at '{sql_file_path}'")
            return

        # Read the SQL from the file
        with open(sql_file_path, 'r') as f:
            sql_script = f.read()
        
        if not sql_script.strip():
            print("Warning: Migration file is empty. No action taken.")
            return

        # Get database configuration
        config = Config()
        
        # Build connection string
        DATABASE_URL = f"postgresql://{config.DB_USER}:{config.DB_PASSWORD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"
        
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Execute the SQL script
        cur.execute(sql_script)
        
        # Commit changes
        conn.commit()
        print(f"Migration from '{sql_file_path}' completed successfully!")
        
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
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <path_to_sql_file>")
        sys.exit(1)
        
    sql_file = sys.argv[1]
    run_migration(sql_file) 