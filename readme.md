# 📊 Finanças App - Gestão de Ciclos Quinzenais

Este é um projeto Fullstack de controle financeiro desenvolvido para oferecer previsibilidade e organização baseada em ciclos de vencimento (Dia 15 e Dia 30). O objetivo principal é substituir planilhas manuais por uma aplicação resiliente, segura e otimizada para uso mobile.

---

## 🚀 Demonstração em Produção
* **API (Backend):** https://seu-app.onrender.com/docs]/docs

---

## 🛠️ Stack Tecnológica

### **Backend (Cérebro)**
* **Python & FastAPI:** Alta performance e documentação automática via Swagger/OpenAPI.
* **SQLAlchemy:** ORM para manipulação eficiente de dados e abstração de banco de dados.
* **Uvicorn:** Servidor ASGI de produção.

### **Frontend (Interface)**
* **React.js:** UI reativa e modular.
* **Axios:** Gerenciamento de requisições assíncronas.
* **Capacitor:** Envelopamento para distribuição como aplicativo nativo Android.

### **Infraestrutura**
* **PostgreSQL (Neon.tech):** Banco de dados relacional serverless.
* **Render:** Hospedagem da API e deploy contínuo (CI/CD).

---

## 🏗️ Arquitetura e Decisões de Engenharia

O projeto foi estruturado seguindo o princípio **KISS (Keep It Simple, Stupid)**, priorizando a estabilidade sobre a complexidade desnecessária.

* **Resiliência de Dados:** Implementação de `pool_pre_ping` e `pool_recycle` no SQLAlchemy para evitar quedas de conexão SSL em ambientes de banco de dados serverless.
* **Segurança de Ambiente:** Separação rigorosa de variáveis de ambiente via arquivos `.env` e utilização de `.gitignore` para proteção de credenciais.
* **Gestão de Ciclos:** Lógica de negócio customizada para lidar com pagamentos recorrentes e parcelados, permitindo antecipação de faturas futuras para o fluxo de caixa atual.

---

## 📦 Como Rodar o Projeto Localmente

### 1. Clonar o Repositório
```bash
git clone (https://github.com/Verttoo/financas-app.git)
cd financas-app
