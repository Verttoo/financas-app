from dotenv import load_dotenv
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("⚠️ AVISO: DATABASE_URL não encontrada. Verifique o arquivo .env")
else:
    print(f"✅ Conectando em: {DATABASE_URL[:20]}...")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True, 
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)