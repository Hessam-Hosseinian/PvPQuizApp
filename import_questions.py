
"""
Script to import questions from opentdb_data2 folder into the database.
This script will:
1. Import categories from question files
2. Import questions with their choices
3. Prevent duplicate questions
4. Handle data in chunks
"""


import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from config import Config
import html
import re
from typing import Dict, List, Set, Tuple
import click

class QuestionImporter:
    def __init__(self, config: Config):
        self.config = config
        self.db = None
        self.categories_cache = {}  # name -> id
        self.imported_questions = set()  # to track duplicates
        
    def connect_db(self):
        """Establish database connection"""
        try:
            self.db = psycopg2.connect(
                host=self.config.DB_HOST,
                port=self.config.DB_PORT,
                dbname=self.config.DB_NAME,
                user=self.config.DB_USER,
                password=self.config.DB_PASSWORD,
                cursor_factory=RealDictCursor
            )
            print(f"✅ Connected to database: {self.config.DB_NAME}")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            sys.exit(1)
    
    def close_db(self):
        """Close database connection"""
        if self.db:
            self.db.close()
            print("✅ Database connection closed")
    
    def clean_text(self, text: str) -> str:
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
    
    def get_or_create_category(self, category_name: str) -> int:
        """Get existing category ID or create new one"""
        if category_name in self.categories_cache:
            return self.categories_cache[category_name]
        
        with self.db.cursor() as cur:
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
            
            self.categories_cache[category_name] = category_id
            return category_id
    
    def question_exists(self, question_text: str, category_id: int) -> bool:
        """Check if question already exists in database"""
        question_hash = f"{question_text[:100]}_{category_id}"
        if question_hash in self.imported_questions:
            return True
        
        with self.db.cursor() as cur:
            cur.execute(
                "SELECT id FROM questions WHERE text = %s AND category_id = %s",
                (question_text, category_id)
            )
            return cur.fetchone() is not None
    
    def insert_question_with_choices(self, question_data: dict, category_id: int) -> bool:
        """Insert a question with its choices"""
        # Clean question text
        question_text = self.clean_text(question_data['question'])
        
        # Check for duplicates
        if self.question_exists(question_text, category_id):
            return False
        
        try:
            with self.db.cursor() as cur:
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
                correct_answer = self.clean_text(question_data['correct_answer'])
                incorrect_answers = [self.clean_text(ans) for ans in question_data['incorrect_answers']]
                
                # Combine all answers and shuffle them
                all_answers = [correct_answer] + incorrect_answers
                import random
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
                
                # Mark as imported
                question_hash = f"{question_text[:100]}_{category_id}"
                self.imported_questions.add(question_hash)
                
                return True
                
        except Exception as e:
            print(f"❌ Error inserting question: {e}")
            self.db.rollback()
            return False
    
    def process_question_file(self, file_path: str) -> Tuple[int, int]:
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
                category_id = self.get_or_create_category(category_name)
                
                # Insert question
                if self.insert_question_with_choices(question_data, category_id):
                    questions_imported += 1
            
            print(f"   ✅ Processed: {questions_processed}, Imported: {questions_imported}")
            return questions_processed, questions_imported
            
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            return 0, 0
    
    def import_all_questions(self, data_folder: str = "opentdb_data2"):
        """Import all questions from the data folder"""
        if not os.path.exists(data_folder):
            print(f"❌ Data folder not found: {data_folder}")
            return
        
        print(f"🚀 Starting import from: {data_folder}")
        
        # Get all JSON files
        json_files = [f for f in os.listdir(data_folder) if f.endswith('.json')]
        json_files.sort()  # Process in order
        
        if not json_files:
            print("❌ No JSON files found in data folder")
            return
        
        print(f"📊 Found {len(json_files)} files to process")
        
        total_processed = 0
        total_imported = 0
        
        # Process files in batches
        batch_size = 10
        for i in range(0, len(json_files), batch_size):
            batch = json_files[i:i + batch_size]
            print(f"\n📦 Processing batch {i//batch_size + 1}/{(len(json_files) + batch_size - 1)//batch_size}")
            
            for filename in batch:
                file_path = os.path.join(data_folder, filename)
                processed, imported = self.process_question_file(file_path)
                total_processed += processed
                total_imported += imported
            
            # Commit after each batch
            self.db.commit()
            print(f"💾 Committed batch {i//batch_size + 1}")
        
        print(f"\n🎉 Import completed!")
        print(f"📈 Total questions processed: {total_processed}")
        print(f"📈 Total questions imported: {total_imported}")
        print(f"📈 Categories created: {len(self.categories_cache)}")
    
    def show_statistics(self):
        """Show database statistics"""
        with self.db.cursor() as cur:
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

@click.command()
@click.option('--data-folder', default='opentdb_data2', help='Folder containing question JSON files')
@click.option('--show-stats', is_flag=True, help='Show database statistics after import')
def main(data_folder, show_stats):
    """Import questions from JSON files into the database"""
    print("🎯 Question Import Tool")
    print("=" * 50)
    
    # Initialize importer
    importer = QuestionImporter(Config())
    
    try:
        # Connect to database
        importer.connect_db()
        
        # Import questions
        importer.import_all_questions(data_folder)
        
        # Show statistics if requested
        if show_stats:
            importer.show_statistics()
        
    except KeyboardInterrupt:
        print("\n⚠️  Import interrupted by user")
    except Exception as e:
        print(f"❌ Import failed: {e}")
    finally:
        importer.close_db()

if __name__ == '__main__':
    main() 