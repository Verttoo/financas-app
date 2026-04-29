import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StatusBar } from '@capacitor/status-bar';

// URL da API: local ou produção (Render)
const API_URL = "https://financas-app-3h88.onrender.com";
const Meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function AppFinancasPremium() {
  const [abaAtual, setAbaAtual] = useState('home'); 
  const [lancamentos, setLancamentos] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(new Date());
  const [feedback, setFeedback] = useState(null);
  const [modalEdicao, setModalEdicao] = useState(false);
  const [modalParcelas, setModalParcelas] = useState({ aberto: false, grupo_id: null, nome: '', lista: [] });
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [isWaking, setIsWaking] = useState(false);

  const strMesFiltro = `${dataFiltro.getFullYear()}-${String(dataFiltro.getMonth() + 1).padStart(2, '0')}`;

  const [bancos, setBancos] = useState(() => JSON.parse(localStorage.getItem('bancos')) || ['Nubank', 'Itaú', 'Caixa', 'Mercado Pago']);
  const [categorias, setCategorias] = useState(() => JSON.parse(localStorage.getItem('categorias')) || ['Casa', 'Veículo', 'Mercado', 'Investimento']);
  
  const [novoBancoStr, setNovoBancoStr] = useState('');
  const [novaCatStr, setNovaCatStr] = useState('');

  const [form, setForm] = useState({ 
    id: null, nome: '', valor: '', banco: bancos[0] || 'Geral', categoria: categorias[0] || 'Geral', 
    tipo: 'Despesa', mes_referencia: strMesFiltro, vencimento: 15, modo_repeticao: 'unico', qtd_parcelas: 1, grupo_id: null, modo_edicao_put: 'unico'
  });

  useEffect(() => { carregar(); forcarTelaCheia(); }, [strMesFiltro]);
  useEffect(() => { localStorage.setItem('bancos', JSON.stringify(bancos)); }, [bancos]);
  useEffect(() => { localStorage.setItem('categorias', JSON.stringify(categorias)); }, [categorias]);

  const forcarTelaCheia = async () => { try { await StatusBar.hide(); } catch (e) { console.log("Status Bar ignorada"); } };

  const mudarMes = (delta) => {
    const novaData = new Date(dataFiltro);
    novaData.setMonth(novaData.getMonth() + delta);
    setDataFiltro(novaData);
  };

  const carregar = async () => {
    try {
      const res = await axios.get(`${API_URL}/lancamentos/`);
      setLancamentos(res.data);
    } catch (e) { console.log("Servidor em standby"); }
  };

  const acordarServidor = async () => {
    setIsWaking(true);
    showFeed("⏳ A ligar ao servidor... (Pode demorar até 50s)");
    try {
      const res = await axios.get(`${API_URL}/lancamentos/`);
      setLancamentos(res.data);
      showFeed("✅ Servidor Online!");
    } catch (e) { showFeed("❌ Falha ao conectar"); }
    finally { setIsWaking(false); }
  };

  const showFeed = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(null), 4000); };

  const salvar = async () => {
    if (!form.nome || !form.valor) return showFeed("⚠️ Preenche nome e valor");
    try {
      // Destruturação para remover campos de controle antes de enviar ao Pydantic/FastAPI
      const { modo_edicao_put, ...dadosLimpos } = form;

      if (form.id) { 
        const modo = form.modo_edicao_put || 'unico';
        await axios.put(`${API_URL}/lancamentos/${form.id}?modo_edicao=${modo}`, dadosLimpos); 
      } else { 
        await axios.post(`${API_URL}/lancamentos/`, dadosLimpos); 
      }
      setModalEdicao(false);
      showFeed("✅ Salvo com sucesso!");
      carregar();
    } catch (e) { 
      showFeed("❌ Erro ao guardar dados");
      console.error(e); 
    }
  };

  const adiantarParcela = async (p) => {
    try {
      await axios.put(`${API_URL}/lancamentos/${p.id}`, { ...p, mes_referencia: strMesFiltro });
      setModalParcelas({ ...modalParcelas, aberto: false });
      showFeed("🚀 Antecipada!");
      carregar();
    } catch (e) { showFeed("❌ Erro ao puxar parcela"); }
  };

  const excluir = async (id, modo) => {
    try {
      await axios.delete(`${API_URL}/lancamentos/${id}?modo=${modo}`);
      setConfirmarExclusao(null); setModalEdicao(false);
      showFeed("🗑️ Removido"); carregar();
    } catch (e) { showFeed("❌ Erro ao excluir"); }
  };

  // Lógica de Ciclos e Saldos Isolados
  const itensMes = lancamentos.filter(l => (l.data || '').startsWith(strMesFiltro));
  const ciclo15 = itensMes.filter(l => l.vencimento === 15);
  const ciclo30 = itensMes.filter(l => l.vencimento === 30);

  const saldo15 = ciclo15.reduce((acc, l) => l.tipo === 'Receita' ? acc + l.valor : acc - l.valor, 0);
  const saldo30 = ciclo30.reduce((acc, l) => acc + (l.tipo === 'Receita' ? l.valor : -l.valor), 0);

  if (abaAtual === 'config') return (
    <div style={s.body}>
      <div style={s.container}>
        <h2 style={s.pageTitle}>Ajustes</h2>
        <div style={s.configBlock}>
          <h4 style={s.configTitle}>Meus Bancos</h4>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input value={novoBancoStr} onChange={e => setNovoBancoStr(e.target.value)} placeholder="Novo banco..." style={s.input} />
            <button onClick={() => { if(novoBancoStr) setBancos([...bancos, novoBancoStr]); setNovoBancoStr(''); }} style={s.btnAddSmall}>+</button>
          </div>
          <div style={s.chipWrap}>
            {bancos.map(b => (
              <span key={b} style={s.chipDel}>{b} <b onClick={() => setBancos(bancos.filter(x => x !== b))}>&times;</b></span>
            ))}
          </div>
        </div>
        <div style={s.configBlock}>
          <h4 style={s.configTitle}>Categorias</h4>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input value={novaCatStr} onChange={e => setNovaCatStr(e.target.value)} placeholder="Nova categoria..." style={s.input} />
            <button onClick={() => { if(novaCatStr) setCategorias([...categorias, novaCatStr]); setNovaCatStr(''); }} style={s.btnAddSmall}>+</button>
          </div>
          <div style={s.chipWrap}>
            {categorias.map(c => (
              <span key={c} style={s.chipDel}>{c} <b onClick={() => setCategorias(categorias.filter(x => x !== c))}>&times;</b></span>
            ))}
          </div>
        </div>
      </div>
      <BottomNav aba={abaAtual} setAba={setAbaAtual} />
    </div>
  );

  return (
    <div style={s.body}>
      <div style={s.container}>
        <div style={s.monthSelector}>
          <button onClick={() => mudarMes(-1)} style={s.monthArrow}>&lt;</button>
          <span style={s.monthText}>{Meses[dataFiltro.getMonth()]} {dataFiltro.getFullYear()}</span>
          <button onClick={() => mudarMes(1)} style={s.monthArrow}>&gt;</button>
        </div>

        <button onClick={acordarServidor} disabled={isWaking} style={{...s.btnSync, opacity: isWaking ? 0.5 : 1}}>
          {isWaking ? '⏳ Conectando...' : '🔄 Sincronizar / Acordar Servidor'}
        </button>

        <div style={s.cardsGrid}>
          <div style={s.cardMini}>
            <p style={s.cardLabel}>SOBRA DIA 15</p>
            <h2 style={{ margin: '5px 0', fontSize: '22px', color: saldo15 >= 0 ? '#10b981' : '#f43f5e' }}>R$ {saldo15.toFixed(2)}</h2>
          </div>
          <div style={s.cardMini}>
            <p style={s.cardLabel}>SOBRA DIA 30</p>
            <h2 style={{ margin: '5px 0', fontSize: '22px', color: saldo30 >= 0 ? '#10b981' : '#f43f5e' }}>R$ {saldo30.toFixed(2)}</h2>
          </div>
        </div>

        <button onClick={() => { setForm({ id: null, nome: '', valor: '', banco: bancos[0] || 'Geral', categoria: categorias[0] || 'Geral', tipo: 'Despesa', mes_referencia: strMesFiltro, vencimento: 15, modo_repeticao: 'unico', qtd_parcelas: 1, modo_edicao_put: 'unico' }); setModalEdicao(true); }} style={s.btnPrimary}>
          + Novo Lançamento
        </button>

        <Section title="Ciclo Dia 15 (Pago c/ Salário 15)" itens={ciclo15} onEdit={(l) => { setForm({...l, modo_edicao_put: 'unico'}); setModalEdicao(true); }} onPago={async (l) => { await axios.put(`${API_URL}/lancamentos/${l.id}`, { ...l, pago: !l.pago }); carregar(); }} onParcelas={async (l) => { const res = await axios.get(`${API_URL}/lancamentos/grupo/${l.grupo_id}`); setModalParcelas({ aberto: true, nome: l.nome, lista: res.data }); }} />
        <Section title="Ciclo Dia 30 (Pago c/ Salário 30)" itens={ciclo30} onEdit={(l) => { setForm({...l, modo_edicao_put: 'unico'}); setModalEdicao(true); }} onPago={async (l) => { await axios.put(`${API_URL}/lancamentos/${l.id}`, { ...l, pago: !l.pago }); carregar(); }} onParcelas={async (l) => { const res = await axios.get(`${API_URL}/lancamentos/grupo/${l.grupo_id}`); setModalParcelas({ aberto: true, nome: l.nome, lista: res.data }); }} />

        {/* MODAL EDIÇÃO */}
        {modalEdicao && (
          <div style={s.overlay}>
            <div style={s.modal}>
              <h3 style={{ margin: '0 0 20px 0', color: '#f4f4f5' }}>{form.id ? 'Editar' : 'Novo'} Item</h3>
              <div style={s.flexGap}>
                <button onClick={() => setForm({...form, tipo: 'Despesa'})} style={chipToggle(form.tipo === 'Despesa', '#f43f5e')}>Saída</button>
                <button onClick={() => setForm({...form, tipo: 'Receita'})} style={chipToggle(form.tipo === 'Receita', '#10b981')}>Entrada</button>
              </div>
              <input placeholder="Descrição" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} style={s.input} />
              <input placeholder="Valor R$" type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} style={s.input} />
              <p style={s.subLabel}>Vencimento:</p>
              <div style={s.flexGap}>
                <button onClick={() => setForm({...form, vencimento: 15})} style={chipToggle(form.vencimento === 15, '#6366f1')}>Dia 15</button>
                <button onClick={() => setForm({...form, vencimento: 30})} style={chipToggle(form.vencimento === 30, '#6366f1')}>Dia 30</button>
              </div>
              
              {form.id && form.grupo_id && (
                <>
                  <p style={s.subLabel}>Aplicar em:</p>
                  <div style={s.flexGap}>
                    <button onClick={() => setForm({...form, modo_edicao_put: 'unico'})} style={chipToggle(form.modo_edicao_put === 'unico', '#6366f1')}>Só este</button>
                    <button onClick={() => setForm({...form, modo_edicao_put: 'futuros'})} style={chipToggle(form.modo_edicao_put === 'futuros', '#6366f1')}>Próximos</button>
                  </div>
                </>
              )}

              {!form.id && (
                <>
                  <p style={s.subLabel}>Repetição:</p>
                  <div style={s.flexGap}>
                    <button onClick={() => setForm({...form, modo_repeticao: 'unico'})} style={chipToggle(form.modo_repeticao === 'unico', '#a1a1aa')}>Único</button>
                    <button onClick={() => setForm({...form, modo_repeticao: 'parcelado'})} style={chipToggle(form.modo_repeticao === 'parcelado', '#a1a1aa')}>Parcelas</button>
                    <button onClick={() => setForm({...form, modo_repeticao: 'fixo'})} style={chipToggle(form.modo_repeticao === 'fixo', '#a1a1aa')}>Fixo</button>
                  </div>
                  {form.modo_repeticao === 'parcelado' && <input placeholder="Qtd Parcelas" type="number" onChange={e => setForm({...form, qtd_parcelas: e.target.value})} style={{...s.input, marginTop: '10px'}} />}
                </>
              )}
              <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                <button onClick={() => setModalEdicao(false)} style={s.btnCancel}>Sair</button>
                {form.id && <button onClick={() => setConfirmarExclusao(form)} style={s.btnDel}>Remover</button>}
                <button onClick={salvar} style={s.btnSave}>Gravar</button>
              </div>
            </div>
          </div>
        )}

        {modalParcelas.aberto && (
          <div style={s.overlay}>
            <div style={s.modal}>
              <h4 style={{ margin: '0 0 15px 0' }}>{modalParcelas.nome}</h4>
              {modalParcelas.lista.map(p => (
                <div key={p.id} style={s.parcelaRow}>
                  <span>{p.parcela} • {p.data.substring(0,7)}</span>
                  {!p.data.startsWith(strMesFiltro) && !p.pago && <button onClick={() => adiantarParcela(p)} style={s.btnPuxar}>Puxar</button>}
                </div>
              ))}
              <button onClick={() => setModalParcelas({ ...modalParcelas, aberto: false })} style={{...s.btnCancel, width: '100%', marginTop: '15px'}}>Fechar</button>
            </div>
          </div>
        )}

        {confirmarExclusao && (
          <div style={s.overlay}>
            <div style={s.modal}>
              <h3 style={{ color: '#f43f5e', margin: '0 0 15px 0' }}>Confirmar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => excluir(confirmarExclusao.id, 'unico')} style={s.btnSec}>Só este mês</button>
                {confirmarExclusao.grupo_id && <button onClick={() => excluir(confirmarExclusao.id, 'futuros')} style={s.btnSec}>Este e próximos</button>}
                {confirmarExclusao.grupo_id && <button onClick={() => excluir(confirmarExclusao.id, 'todos')} style={s.btnDel}>TUDO (Limpar)</button>}
                <button onClick={() => setConfirmarExclusao(null)} style={s.btnCancel}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {feedback && <div style={s.toast}>{feedback}</div>}
      </div>
      <BottomNav aba={abaAtual} setAba={setAbaAtual} />
    </div>
  );
}

// Componentes Auxiliares
function Section({ title, itens, onEdit, onPago, onParcelas }) {
  if(itens.length === 0) return null;
  return (
    <div style={{ marginBottom: '25px', width: '100%' }}>
      <p style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>{title}</p>
      {itens.map(l => (
        <div key={l.id} style={{ ...s.itemCard, opacity: l.pago ? 0.4 : 1 }}>
          <div style={{ flex: 1 }} onClick={() => onEdit(l)}>
            <div style={{ fontWeight: '600', color: '#f4f4f5' }}>{l.nome}</div>
            <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>{l.banco} • {l.parcela}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: l.tipo === 'Despesa' ? '#f43f5e' : '#10b981', fontWeight: 'bold' }}>R$ {l.valor.toFixed(2)}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {l.grupo_id && <button onClick={(e) => { e.stopPropagation(); onParcelas(l); }} style={s.btnSmallAction}>📑</button>}
              <button onClick={(e) => { e.stopPropagation(); onPago(l); }} style={l.pago ? s.btnCheckOn : s.btnCheckOff}>{l.pago ? '✅' : 'Pagar'}</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BottomNav({ aba, setAba }) {
  return (
    <div style={s.bottomNav}>
      <button onClick={() => setAba('home')} style={aba === 'home' ? s.navBtnActive : s.navBtn}>📊 Início</button>
      <button onClick={() => setAba('config')} style={aba === 'config' ? s.navBtnActive : s.navBtn}>⚙️ Ajustes</button>
    </div>
  );
}

// Estilos
const s = {
  body: { backgroundColor: '#09090b', color: '#f4f4f5', minHeight: '100vh', width: '100vw', padding: '20px 20px 90px 20px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' },
  container: { width: '100%', maxWidth: '500px', margin: '0 auto' },
  monthSelector: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#18181b', padding: '15px', borderRadius: '16px', border: '1px solid #27272a', marginBottom: '15px' },
  monthArrow: { background: 'none', border: 'none', color: '#6366f1', fontSize: '20px', fontWeight: 'bold' },
  monthText: { fontSize: '16px', fontWeight: 'bold' },
  btnSync: { width: '100%', padding: '12px', background: 'transparent', color: '#a1a1aa', border: '1px dashed #3f3f46', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px', marginBottom: '20px' },
  cardsGrid: { display: 'flex', gap: '12px', marginBottom: '20px' },
  cardMini: { flex: 1, background: '#18181b', padding: '15px', borderRadius: '16px', border: '1px solid #27272a' },
  cardLabel: { margin: 0, fontSize: '10px', color: '#a1a1aa', fontWeight: 'bold' },
  btnPrimary: { width: '100%', padding: '16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold', marginBottom: '25px' },
  itemCard: { background: '#18181b', padding: '15px', borderRadius: '12px', marginBottom: '10px', display: 'flex', border: '1px solid #27272a', alignItems: 'center' },
  btnCheckOff: { background: '#27272a', border: 'none', color: '#a1a1aa', padding: '5px 10px', borderRadius: '6px', fontSize: '11px' },
  btnCheckOn: { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '5px 10px', borderRadius: '6px', fontSize: '11px' },
  btnSmallAction: { background: '#27272a', border: 'none', padding: '5px', borderRadius: '6px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', padding: '20px', zIndex: 1000, display: 'flex', alignItems: 'flex-end' },
  modal: { background: '#18181b', padding: '20px', borderRadius: '20px 20px 0 0', width: '100%', borderTop: '1px solid #27272a' },
  input: { width: '100%', padding: '14px', marginBottom: '12px', borderRadius: '10px', background: '#09090b', color: '#f4f4f5', border: '1px solid #27272a', boxSizing: 'border-box' },
  subLabel: { fontSize: '12px', color: '#a1a1aa', marginBottom: '8px', display: 'block' },
  flexGap: { display: 'flex', gap: '10px', marginBottom: '12px' },
  btnSave: { flex: 2, padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  btnDel: { flex: 1, padding: '14px', background: '#f43f5e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  btnCancel: { flex: 1, padding: '14px', background: '#27272a', color: '#f4f4f5', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  btnSec: { width: '100%', padding: '14px', background: '#27272a', color: '#f4f4f5', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#18181b', borderTop: '1px solid #27272a', display: 'flex', padding: '10px 20px 25px 20px' },
  navBtn: { flex: 1, background: 'none', border: 'none', color: '#71717a', fontWeight: 'bold' },
  navBtnActive: { flex: 1, background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#6366f1', borderRadius: '10px', padding: '10px', fontWeight: 'bold' },
  toast: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', padding: '10px 20px', borderRadius: '20px', zIndex: 2000, fontWeight: 'bold' },
  pageTitle: { margin: '0 0 20px 0' },
  configBlock: { background: '#18181b', padding: '15px', borderRadius: '16px', border: '1px solid #27272a', marginBottom: '15px' },
  configTitle: { margin: '0 0 10px 0', fontSize: '12px', color: '#a1a1aa' },
  btnAddSmall: { background: '#6366f1', border: 'none', color: '#fff', padding: '0 15px', borderRadius: '10px' },
  chipWrap: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chipDel: { background: '#27272a', padding: '6px 12px', borderRadius: '15px', fontSize: '12px' },
  parcelaRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #27272a' },
  btnPuxar: { background: '#6366f1', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '5px', fontSize: '10px' }
};

const chipToggle = (active, color) => ({ flex: 1, padding: '12px', borderRadius: '10px', border: active ? `2px solid ${color}` : '1px solid #27272a', background: active ? `${color}15` : '#18181b', color: active ? color : '#a1a1aa', fontWeight: 'bold', fontSize: '12px' });