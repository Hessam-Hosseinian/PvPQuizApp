 #!/usr/bin/env python3
"""
Database Integrity Check for PvP Quiz App
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'dbname': os.getenv('DB_NAME', 'pvp_quiz_app'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

def check_database_integrity():
    """Check database integrity and data consistency"""
    issues = []
    
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        
        print("🔍 Checking Database Integrity...")
        
        # 1. Check for orphaned questions (invalid category_id)
        cur.execute("""
            SELECT COUNT(*) FROM questions q 
            LEFT JOIN categories c ON q.category_id = c.id 
            WHERE c.id IS NULL
        """)
        orphaned_questions = cur.fetchone()['count']
        if orphaned_questions > 0:
            issues.append(f"❌ {orphaned_questions} questions with invalid category_id")
        
        # 2. Check for orphaned question choices (invalid question_id)
        cur.execute("""
            SELECT COUNT(*) FROM question_choices qc 
            LEFT JOIN questions q ON qc.question_id = q.id 
            WHERE q.id IS NULL
        """)
        orphaned_choices = cur.fetchone()['count']
        if orphaned_choices > 0:
            issues.append(f"❌ {orphaned_choices} question choices with invalid question_id")
        
        # 3. Check for questions without exactly 4 choices
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT q.id FROM questions q 
                LEFT JOIN question_choices qc ON q.id = qc.question_id 
                GROUP BY q.id 
                HAVING COUNT(qc.id) != 4
            ) sub
        """)
        invalid_choice_counts = cur.fetchone()['count']
        if invalid_choice_counts > 0:
            issues.append(f"❌ {invalid_choice_counts} questions without exactly 4 choices")
        
        # 4. Check for questions without exactly one correct answer
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT q.id FROM questions q 
                JOIN question_choices qc ON q.id = qc.question_id 
                WHERE qc.is_correct = TRUE 
                GROUP BY q.id 
                HAVING COUNT(qc.id) != 1
            ) sub
        """)
        invalid_correct_answers = cur.fetchone()['count']
        if invalid_correct_answers > 0:
            issues.append(f"❌ {invalid_correct_answers} questions without exactly one correct answer")
        
        # 5. Check for duplicate usernames
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT username FROM users 
                GROUP BY username 
                HAVING COUNT(*) > 1
            ) sub
        """)
        duplicate_usernames = cur.fetchone()['count']
        if duplicate_usernames > 0:
            issues.append(f"❌ {duplicate_usernames} duplicate usernames found")
        
        # 6. Check for duplicate emails
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT email FROM users 
                GROUP BY email 
                HAVING COUNT(*) > 1
            ) sub
        """)
        duplicate_emails = cur.fetchone()['count']
        if duplicate_emails > 0:
            issues.append(f"❌ {duplicate_emails} duplicate emails found")
        
        # 7. Check for orphaned game participants (invalid user_id)
        cur.execute("""
            SELECT COUNT(*) FROM game_participants gp 
            LEFT JOIN users u ON gp.user_id = u.id 
            WHERE u.id IS NULL
        """)
        orphaned_participants = cur.fetchone()['count']
        if orphaned_participants > 0:
            issues.append(f"❌ {orphaned_participants} game participants with invalid user_id")
        
        # 8. Check for orphaned round answers (invalid user_id)
        cur.execute("""
            SELECT COUNT(*) FROM round_answers ra 
            LEFT JOIN users u ON ra.user_id = u.id 
            WHERE u.id IS NULL
        """)
        orphaned_answers = cur.fetchone()['count']
        if orphaned_answers > 0:
            issues.append(f"❌ {orphaned_answers} round answers with invalid user_id")
        
        # 9. Check for users without stats records
        cur.execute("""
            SELECT COUNT(*) FROM users u 
            LEFT JOIN user_stats us ON u.id = us.user_id 
            WHERE us.user_id IS NULL
        """)
        users_without_stats = cur.fetchone()['count']
        if users_without_stats > 0:
            issues.append(f"❌ {users_without_stats} users without stats records")
        
        # 10. Check for inconsistent user stats
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT us.user_id FROM user_stats us 
                LEFT JOIN round_answers ra ON us.user_id = ra.user_id 
                GROUP BY us.user_id, us.total_answers 
                HAVING us.total_answers != COUNT(ra.id)
            ) sub
        """)
        inconsistent_stats = cur.fetchone()['count']
        if inconsistent_stats > 0:
            issues.append(f"❌ {inconsistent_stats} users with inconsistent stats")
        
        # 11. Check for completed games without winner
        cur.execute("""
            SELECT COUNT(*) FROM games 
            WHERE status = 'completed' AND winner_id IS NULL
        """)
        games_without_winner = cur.fetchone()['count']
        if games_without_winner > 0:
            issues.append(f"⚠️ {games_without_winner} completed games without winner")
        
        # 12. Check for games without participants
        cur.execute("""
            SELECT COUNT(*) FROM games g 
            LEFT JOIN game_participants gp ON g.id = gp.game_id 
            WHERE gp.game_id IS NULL
        """)
        games_without_participants = cur.fetchone()['count']
        if games_without_participants > 0:
            issues.append(f"⚠️ {games_without_participants} games without participants")
        
        # 13. Check for orphaned chat messages
        cur.execute("""
            SELECT COUNT(*) FROM chat_messages cm 
            LEFT JOIN users u ON cm.sender_id = u.id 
            WHERE u.id IS NULL
        """)
        orphaned_messages = cur.fetchone()['count']
        if orphaned_messages > 0:
            issues.append(f"❌ {orphaned_messages} chat messages with invalid sender")
        
       
        
        cur.close()
        conn.close()
        
        # Generate report
        print("\n📊 DATABASE INTEGRITY REPORT")
        print("=" * 50)
        
        if not issues:
            print("✅ No integrity issues found! Database is consistent.")
        else:
            print(f"Found {len(issues)} issues:")
            for issue in issues:
                print(f"  {issue}")
        
        return len(issues) == 0
        
    except Exception as e:
        print(f"❌ Error checking database integrity: {e}")
        return False

if __name__ == "__main__":
    check_database_integrity()