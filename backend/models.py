from sqlalchemy import Column, Integer, String, Float, Boolean
from .database import Base

class Lancamento(Base):
    __tablename__ = "lancamentos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    valor = Column(Float)
    parcela = Column(String)
    banco = Column(String)
    categoria = Column(String)   
    tipo = Column(String)     
    data = Column(String)        
    vencimento = Column(Integer)  
    pago = Column(Boolean, default=False)   
    grupo_id = Column(String, nullable=True) 