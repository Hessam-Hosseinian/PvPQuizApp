import psycopg2
from psycopg2.extras import RealDictCursor
from flask import current_app, g
import click
from flask.cli import with_appcontext

def get_db():
    
    """Get database connection"""
    if 'db' not in g:
        g.db = psycopg2.connect(
            host=current_app.config['DB_HOST'],
            port=current_app.config['DB_PORT'],
            dbname=current_app.config['DB_NAME'],
            user=current_app.config['DB_USER'],
            password=current_app.config['DB_PASSWORD'],
            cursor_factory=RealDictCursor
        )
        
        # print(g.db.info.dbname)
    return g.db

def close_db(e=None):
    """Close database connection"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize database with schema"""
    
    db = get_db()
    with current_app.open_resource('sql/schema.sql') as f:
        with db.cursor() as cur:
            cur.execute(f.read().decode('utf8'))
        db.commit()

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

def init_app(app):
    """Register database functions with the Flask app"""
    
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)

def query_db(query, args=(), one=False):
    """Query helper function"""
    cur = get_db().cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

def modify_db(query, args=()):

    db = get_db()
    cur = db.cursor()
    cur.execute(query, args)

  
    if cur.description:
 
        result = cur.fetchone()
        db.commit()
        cur.close()
        return result  
    else:
  
        affected_rows = cur.rowcount
        db.commit()
        cur.close()
        return affected_rows  

        