import os
import uuid
from datetime import datetime
from dateutil.relativedelta import relativedelta
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional, List
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env oculto na máquina local
load_dotenv()

# Configuração Segura do Banco de Dados
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    raise Exception("ERRO: Variável DATABASE_URL não encontrada no ambiente.")

engine = create_engine(DATABASE_URL) 
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelo da Tabela no Banco de Dados
class Lancamento(Base):
    __tablename__ = "lancamentos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    valor = Column(Float)
    parcela = Column(String)
    banco = Column(String)       # Banco ou Origem
    categoria = Column(String)   # Tag do gasto
    tipo = Column(String)        # 'Receita' ou 'Despesa'
    data = Column(String)        # YYYY-MM-DD
    vencimento = Column(Integer) # 15 ou 30
    pago = Column(Boolean, default=False)
    grupo_id = Column(String, nullable=True)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Esquema de Validação (Pydantic)
class LancamentoCreate(BaseModel):
    nome: str
    valor: float
    banco: str = "Geral"
    categoria: str = "Geral"
    tipo: str = "Despesa"
    mes_referencia: str # YYYY-MM
    vencimento: int # 15 ou 30
    modo_repeticao: str = "unico" 
    qtd_parcelas: int = 1
    pago: bool = False

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- ROTAS DA API ---

@app.get("/lancamentos/")
def listar_todos(db: Session = Depends(get_db)):
    return db.query(Lancamento).all()

@app.get("/lancamentos/grupo/{grupo_id}")
def listar_por_grupo(grupo_id: str, db: Session = Depends(get_db)):
    return db.query(Lancamento).filter(Lancamento.grupo_id == grupo_id).order_by(Lancamento.data).all()

@app.post("/lancamentos/")
def criar_lancamento(item: LancamentoCreate, db: Session = Depends(get_db)):
    grupo_uuid = str(uuid.uuid4()) if item.modo_repeticao != "unico" else None
    repeticoes = item.qtd_parcelas if item.modo_repeticao == "parcelado" else (12 if item.modo_repeticao == "fixo" else 1)
    data_base = datetime.strptime(f"{item.mes_referencia}-01", "%Y-%m-%d")
    
    for i in range(repeticoes):
        nova_data_mes = data_base + relativedelta(months=i)
        # Define um dia fixo apenas para ordenação interna no banco
        dia_interno = 10 if item.vencimento == 15 else 25
        data_final_str = nova_data_mes.replace(day=dia_interno).strftime("%Y-%m-%d")
        
        texto_parcela = "Única" if item.modo_repeticao == "unico" else (f"{i+1}/{repeticoes}" if item.modo_repeticao == "parcelado" else "Mensal")
        
        novo = Lancamento(
            nome=item.nome, valor=item.valor, parcela=texto_parcela,
            banco=item.banco, categoria=item.categoria, tipo=item.tipo, 
            data=data_final_str, vencimento=item.vencimento, 
            pago=item.pago, grupo_id=grupo_uuid
        )
        db.add(novo)
    db.commit()
    return {"status": "sucesso"}

@app.put("/lancamentos/{id}")
def atualizar_lancamento(id: int, item: LancamentoCreate, modo_edicao: str = "unico", db: Session = Depends(get_db)):
    db_item = db.query(Lancamento).filter(Lancamento.id == id).first()
    if not db_item: 
        return {"erro": "não encontrado"}
    
    if modo_edicao == "futuros" and db_item.grupo_id:
        futuros = db.query(Lancamento).filter(Lancamento.grupo_id == db_item.grupo_id, Lancamento.data >= db_item.data).all()
        for f in futuros:
            f.nome, f.valor, f.banco, f.categoria, f.tipo = item.nome, item.valor, item.banco, item.categoria, item.tipo
    else:
        db_item.nome, db_item.valor, db_item.pago = item.nome, item.valor, item.pago
        db_item.banco, db_item.categoria, db_item.tipo, db_item.vencimento = item.banco, item.categoria, item.tipo, item.vencimento
        db_item.data = f"{item.mes_referencia}-10" if item.vencimento == 15 else f"{item.mes_referencia}-25"

    db.commit()
    return {"status": "atualizado"}

@app.delete("/lancamentos/{id}")
def deletar_lancamento(id: int, modo: str = "unico", db: Session = Depends(get_db)):
    item = db.query(Lancamento).filter(Lancamento.id == id).first()
    if not item: 
        return {"erro": "404"}
    
    if modo == "todos" and item.grupo_id:
        db.query(Lancamento).filter(Lancamento.grupo_id == item.grupo_id).delete()
    elif modo == "futuros" and item.grupo_id:
        db.query(Lancamento).filter(Lancamento.grupo_id == item.grupo_id, Lancamento.data >= item.data).delete()
    else:
        db.delete(item)
        
    db.commit()
    return {"status": "removido"}