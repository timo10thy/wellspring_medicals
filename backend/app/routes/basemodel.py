from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os


DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_DATABASE = os.getenv('DB_DATABASE')

SQLALCHEMY_DB_URL = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}?charset=utf8mb4'
engine = create_engine(SQLALCHEMY_DB_URL, echo=True)

Session = sessionmaker(
    autocommit=False,
    autoflush =False,
    bind=engine
)

def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()
