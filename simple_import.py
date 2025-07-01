#!/usr/bin/env python3
"""
Simple step-by-step question import script.
Run this script to import questions from opentdb_data2 folder.
"""

import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from config import Config
import html
import re
import random

def clean_text(text):
    """Clean HTML entities and normalize text"""
    # Decode HTML entities
    text = html.unescape(text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize quotes and apostrophes
    text = text.replace('&quot;', '"').replace('&#039;', "'").replace('&rsquo;', "'")
    # Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def connect_db():
    """Connect to database"""
    config = Config()
    try:
        db = psycopg2.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            dbname=config.DB_NAME,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            cursor_factory=RealDictCursor
        )
        print(f"✅ Connected to database: {config.DB_NAME}")
        return db
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

def get_or_create_category(db, category_name):
    """Get existing category ID or create new one"""
    with db.cursor() as cur:
        # Check if category exists
        cur.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
        result = cur.fetchone()
        
        if result:
            category_id = result['id']
        else:
            # Create new category
            cur.execute(
                "INSERT INTO categories (name, description) VALUES (%s, %s) RETURNING id",
                (category_name, f"Questions from {category_name}")
            )
            category_id = cur.fetchone()['id']
            print(f"📁 Created new category: {category_name} (ID: {category_id})")
        
        return category_id

def question_exists(db, question_text, category_id):
    """Check if question already exists"""
    with db.cursor() as cur:
        cur.execute(
            "SELECT id FROM questions WHERE text = %s AND category_id = %s",
            (question_text, category_id)
        )
        return cur.fetchone() is not None

def insert_question(db, question_data, category_id):
    """Insert a question with its choices"""
    # Clean question text
    question_text = clean_text(question_data['question'])
    
    # Check for duplicates
    if question_exists(db, question_text, category_id):
        return False
    
    try:
        with db.cursor() as cur:
            # Insert question
            cur.execute(
                """
                INSERT INTO questions (text, category_id, difficulty, is_verified)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (question_text, category_id, question_data['difficulty'], True)
            )
            question_id = cur.fetchone()['id']
            
            # Prepare choices
            correct_answer = clean_text(question_data['correct_answer'])
            incorrect_answers = [clean_text(ans) for ans in question_data['incorrect_answers']]
            
            # Combine all answers and shuffle them
            all_answers = [correct_answer] + incorrect_answers
            random.shuffle(all_answers)
            
            # Insert choices
            positions = ['A', 'B', 'C', 'D']
            for i, answer in enumerate(all_answers):
                is_correct = answer == correct_answer
                cur.execute(
                    """
                    INSERT INTO question_choices (question_id, choice_text, is_correct, position)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (question_id, answer, is_correct, positions[i])
                )
            
            return True
            
    except Exception as e:
        print(f"❌ Error inserting question: {e}")
        db.rollback()
        return False

def process_file(db, file_path):
    """Process a single question file"""
    print(f"📄 Processing: {os.path.basename(file_path)}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'results' not in data:
            print(f"⚠️  No results found in {file_path}")
            return 0, 0
        
        questions_processed = 0
        questions_imported = 0
        
        for question_data in data['results']:
            questions_processed += 1
            
            # Skip non-multiple choice questions
            if question_data.get('type') != 'multiple':
                continue
            
            # Get or create category
            category_name = question_data['category']
            category_id = get_or_create_category(db, category_name)
            
            # Insert question
            if insert_question(db, question_data, category_id):
                questions_imported += 1
        
        print(f"   ✅ Processed: {questions_processed}, Imported: {questions_imported}")
        return questions_processed, questions_imported
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return 0, 0

def import_questions(start_file=1, end_file=10, data_folder="opentdb_data2"):
    """Import questions from specified file range"""
    if not os.path.exists(data_folder):
        print(f"❌ Data folder not found: {data_folder}")
        return
    
    print(f"🚀 Starting import from files {start_file} to {end_file}")
    
    # Connect to database
    db = connect_db()
    
    try:
        total_processed = 0
        total_imported = 0
        
        # Process files in range
        for i in range(start_file, end_file + 1):
            filename = f"questions_{i}.json"
            file_path = os.path.join(data_folder, filename)
            
            if os.path.exists(file_path):
                processed, imported = process_file(db, file_path)
                total_processed += processed
                total_imported += imported
                
                # Commit after each file
                db.commit()
            else:
                print(f"⚠️  File not found: {filename}")
        
        print(f"\n🎉 Import completed!")
        print(f"📈 Total questions processed: {total_processed}")
        print(f"📈 Total questions imported: {total_imported}")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        db.rollback()
    finally:
        db.close()
        print("✅ Database connection closed")

def show_statistics():
    """Show database statistics"""
    db = connect_db()
    
    try:
        with db.cursor() as cur:
            # Count questions
            cur.execute("SELECT COUNT(*) as count FROM questions")
            questions_count = cur.fetchone()['count']
            
            # Count categories
            cur.execute("SELECT COUNT(*) as count FROM categories")
            categories_count = cur.fetchone()['count']
            
            # Count choices
            cur.execute("SELECT COUNT(*) as count FROM question_choices")
            choices_count = cur.fetchone()['count']
            
            # Questions by difficulty
            cur.execute("""
                SELECT difficulty, COUNT(*) as count 
                FROM questions 
                GROUP BY difficulty 
                ORDER BY difficulty
            """)
            difficulty_stats = cur.fetchall()
            
            # Top categories
            cur.execute("""
                SELECT c.name, COUNT(q.id) as count 
                FROM categories c 
                LEFT JOIN questions q ON c.id = q.category_id 
                GROUP BY c.id, c.name 
                ORDER BY count DESC 
                LIMIT 10
            """)
            top_categories = cur.fetchall()
        
        print("\n📊 Database Statistics:")
        print(f"   Questions: {questions_count}")
        print(f"   Categories: {categories_count}")
        print(f"   Choices: {choices_count}")
        
        print("\n📊 Questions by Difficulty:")
        for stat in difficulty_stats:
            print(f"   {stat['difficulty']}: {stat['count']}")
        
        print("\n📊 Top Categories:")
        for cat in top_categories:
            print(f"   {cat['name']}: {cat['count']} questions")
            
    finally:
        db.close()

if __name__ == '__main__':
    print("🎯 Simple Question Import Tool")
    print("=" * 50)
    
    # You can modify these parameters
    START_FILE = 1      # Start from file questions_1.json
    END_FILE = 10       # End at file questions_10.json
    
    # Import questions
    import_questions(START_FILE, END_FILE)
    
    # Show statistics
    show_statistics() 