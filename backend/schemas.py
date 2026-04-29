from pydantic import BaseModel
from datetime import date
from typing import Optional

class LancamentoBase(BaseModel):
    nome: str
    valor: float
    parcela: str
    banco: str
    pagamento: str
    tipo: str
    data: date

class LancamentoCreate(LancamentoBase):
    pass

class LancamentoUpdate(BaseModel):
    nome: Optional[str] = None
    valor: Optional[float] = None
    parcela: Optional[str] = None
    banco: Optional[str] = None
    pagamento: Optional[str] = None
    tipo: Optional[str] = None
    data: Optional[date] = None

class LancamentoResponse(LancamentoBase):
    id: int
    class Config:
        from_attributes = True

class BancoCreate(BaseModel):
    nome: str

class BancoResponse(BancoCreate):
    id: int
    class Config:
        from_attributes = True