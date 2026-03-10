import React, { useState, useMemo, useEffect } from 'react';

const COLORS = {
  bg: '#0A0C10',
  surface: '#111318',
  card: '#161A22',
  border: '#1E2530',
  accent: '#00C2FF',
  accentDim: '#00C2FF22',
  accentGlow: '#00C2FF44',
  green: '#00E5A0',
  yellow: '#FFB800',
  red: '#FF4D6A',
  purple: '#A855F7',
  text: '#E8ECF4',
  textMuted: '#6B7A99',
  textDim: '#3D4A66',
};
const FONT = "'DM Mono', 'Courier New', monospace";
const FONT_DISPLAY = "'Space Grotesk', sans-serif";

const STAGES = [
  { key: 'contacto', label: 'Contacto', color: COLORS.textMuted },
  { key: 'propuesta', label: 'Propuesta', color: COLORS.yellow },
  { key: 'negociacion', label: 'Negociación', color: COLORS.accent },
  { key: 'cerrado', label: 'Cerrado', color: COLORS.green },
];
const STATUS_CONFIG = {
  cliente: { label: 'Cliente', color: COLORS.green },
  prospecto: { label: 'Prospecto', color: COLORS.yellow },
  lead: { label: 'Lead', color: COLORS.accent },
};
const PRIORITY_CONFIG = {
  alta: { label: 'Alta', color: COLORS.red },
  media: { label: 'Media', color: COLORS.yellow },
  baja: { label: 'Baja', color: COLORS.textMuted },
};
const TYPE_ICONS = { llamada: '📞', email: '✉️', reunion: '🤝', tarea: '✅' };

const fmt = (n) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
const fmtDate = (d) =>
  d
    ? new Date(d + 'T00:00').toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
      })
    : '—';
const isOverdue = (d) => d && new Date(d + 'T00:00') < new Date();
const uid = () => Date.now() + Math.random().toString(36).slice(2);

const formatRut = (raw) => {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const num = clean.slice(0, -1);
  const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
};

function loadData(key, fallback) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
}
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const Badge = ({ color, children }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontFamily: FONT,
      fontWeight: 600,
      letterSpacing: '0.06em',
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </span>
);
const Stat = ({ label, value, sub, color }) => (
  <div
    style={{
      padding: '20px 24px',
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      flex: 1,
      minWidth: 140,
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 11,
        color: COLORS.textMuted,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 26,
        fontWeight: 700,
        color: color || COLORS.text,
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontFamily: FONT,
          fontSize: 12,
          color: COLORS.textMuted,
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);
const Tag = ({ label, color }) => (
  <span
    style={{
      padding: '1px 8px',
      borderRadius: 3,
      fontSize: 11,
      fontFamily: FONT,
      background: color + '15',
      color,
      border: `1px solid ${color}30`,
    }}
  >
    {label}
  </span>
);
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          color: COLORS.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
    )}
    <input
      {...props}
      style={{
        width: '100%',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        padding: '9px 12px',
        fontFamily: FONT,
        fontSize: 13,
        color: COLORS.text,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  </div>
);
const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          color: COLORS.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
    )}
    <select
      {...props}
      style={{
        width: '100%',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        padding: '9px 12px',
        fontFamily: FONT,
        fontSize: 13,
        color: COLORS.text,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </select>
  </div>
);
const Modal = ({ title, onClose, onSubmit, children }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: '#000A',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 32,
        width: 480,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 17,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {title}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: COLORS.textMuted,
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ✕
        </button>
      </div>
      {children}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '10px 0',
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.textMuted,
            fontFamily: FONT_DISPLAY,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          style={{
            flex: 2,
            padding: '10px 0',
            background: COLORS.accent,
            border: 'none',
            borderRadius: 6,
            color: COLORS.bg,
            fontFamily: FONT_DISPLAY,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Guardar
        </button>
      </div>
    </div>
  </div>
);
const AddBtn = ({ onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 18px',
      background: COLORS.accent,
      border: 'none',
      borderRadius: 7,
      color: COLORS.bg,
      fontFamily: FONT_DISPLAY,
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
    {label}
  </button>
);

function Dashboard({ contacts, deals, tasks }) {
  const totalRevenue = deals
    .filter((d) => d.stage === 'cerrado')
    .reduce((s, d) => s + Number(d.value), 0);
  const pipeline = deals
    .filter((d) => d.stage !== 'cerrado')
    .reduce((s, d) => s + (Number(d.value) * Number(d.probability)) / 100, 0);
  const pendingTasks = tasks.filter((t) => !t.done).length;
  const overdueTasks = tasks.filter(
    (t) => !t.done && isOverdue(t.dueDate)
  ).length;
  const stageData = STAGES.map((s) => ({
    ...s,
    count: deals.filter((d) => d.stage === s.key).length,
    value: deals
      .filter((d) => d.stage === s.key)
      .reduce((a, d) => a + Number(d.value), 0),
  }));
  const maxVal = Math.max(...stageData.map((s) => s.value), 1);
  const recentTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 4);
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 11,
            color: COLORS.textMuted,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Vista general
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          Dashboard B2B
        </div>
      </div>
      <div
        style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}
      >
        <Stat
          label="Ingresos cerrados"
          value={fmt(totalRevenue)}
          sub="acumulado"
          color={COLORS.green}
        />
        <Stat
          label="Pipeline esperado"
          value={fmt(pipeline)}
          sub="ponderado"
          color={COLORS.accent}
        />
        <Stat
          label="Clientes activos"
          value={contacts.filter((c) => c.status === 'cliente').length}
          color={COLORS.text}
        />
        <Stat
          label="Tareas pendientes"
          value={pendingTasks}
          sub={overdueTasks > 0 ? `${overdueTasks} vencida(s)` : 'al día'}
          color={overdueTasks > 0 ? COLORS.red : COLORS.text}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 24,
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              color: COLORS.text,
              marginBottom: 18,
              fontSize: 15,
            }}
          >
            Embudo de ventas
          </div>
          {stageData.map((s) => (
            <div key={s.key} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{ fontFamily: FONT, fontSize: 12, color: s.color }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 12,
                    color: COLORS.textMuted,
                  }}
                >
                  {s.count} · {fmt(s.value)}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: COLORS.border,
                  borderRadius: 3,
                }}
              >
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: s.color,
                    width: `${(s.value / maxVal) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 24,
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              color: COLORS.text,
              marginBottom: 18,
              fontSize: 15,
            }}
          >
            Próximas tareas
          </div>
          {recentTasks.length === 0 && (
            <div
              style={{
                fontFamily: FONT,
                fontSize: 13,
                color: COLORS.textMuted,
              }}
            >
              Sin tareas pendientes 🎉
            </div>
          )}
          {recentTasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <span style={{ fontSize: 16 }}>{TYPE_ICONS[t.type] || '✅'}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontFamily: FONT, fontSize: 13, color: COLORS.text }}
                >
                  {t.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 11,
                    color: COLORS.textMuted,
                  }}
                >
                  {t.company}
                </div>
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  color: isOverdue(t.dueDate) ? COLORS.red : COLORS.textMuted,
                }}
              >
                {fmtDate(t.dueDate)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: 24,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            color: COLORS.text,
            marginBottom: 18,
            fontSize: 15,
          }}
        >
          Deals activos — mayor valor
        </div>
        {deals.filter((d) => d.stage !== 'cerrado').length === 0 && (
          <div
            style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted }}
          >
            Sin deals activos aún.
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {deals
              .filter((d) => d.stage !== 'cerrado')
              .sort((a, b) => Number(b.value) - Number(a.value))
              .slice(0, 5)
              .map((d) => {
                const stage = STAGES.find((s) => s.key === d.stage);
                return (
                  <tr
                    key={d.id}
                    style={{ borderBottom: `1px solid ${COLORS.border}` }}
                  >
                    <td
                      style={{
                        fontFamily: FONT,
                        fontSize: 13,
                        color: COLORS.text,
                        padding: '12px 0',
                      }}
                    >
                      {d.title}
                    </td>
                    <td
                      style={{
                        fontFamily: FONT,
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: '12px 16px 12px 0',
                      }}
                    >
                      {d.company}
                    </td>
                    <td style={{ padding: '12px 16px 12px 0' }}>
                      <Badge color={stage.color}>{stage.label}</Badge>
                    </td>
                    <td
                      style={{
                        fontFamily: FONT,
                        fontSize: 13,
                        color: COLORS.accent,
                      }}
                    >
                      {fmt(d.value)}
                    </td>
                    <td
                      style={{
                        fontFamily: FONT,
                        fontSize: 12,
                        color: COLORS.textMuted,
                      }}
                    >
                      {fmtDate(d.closeDate)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactsView({ contacts, setContacts }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    rut: '',
    status: 'lead',
    value: '',
    lastContact: '',
  });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      (filterStatus === 'todos' || c.status === filterStatus) &&
      (c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        (c.rut || '').toLowerCase().includes(q))
    );
  });

  const openNew = () => {
    setEditingContact(null);
    setForm({
      name: '',
      company: '',
      role: '',
      email: '',
      phone: '',
      rut: '',
      status: 'lead',
      value: '',
      lastContact: '',
    });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingContact(c.id);
    setForm({
      name: c.name,
      company: c.company,
      role: c.role || '',
      email: c.email || '',
      phone: c.phone || '',
      rut: c.rut || '',
      status: c.status,
      value: String(c.value || 0),
      lastContact: c.lastContact || '',
    });
    setShowModal(true);
  };

  const save = () => {
    if (!form.name || !form.company) return;
    let updated;
    if (editingContact) {
      updated = contacts.map((c) =>
        c.id === editingContact
          ? { ...c, ...form, value: Number(form.value) || 0 }
          : c
      );
      if (selected?.id === editingContact)
        setSelected({ ...selected, ...form, value: Number(form.value) || 0 });
    } else {
      updated = [
        ...contacts,
        {
          ...form,
          id: uid(),
          value: Number(form.value) || 0,
          lastContact:
            form.lastContact || new Date().toISOString().slice(0, 10),
        },
      ];
    }
    setContacts(updated);
    saveData('crm_contacts', updated);
    setShowModal(false);
    setEditingContact(null);
    setForm({
      name: '',
      company: '',
      role: '',
      email: '',
      phone: '',
      rut: '',
      status: 'lead',
      value: '',
      lastContact: '',
    });
  };

  const del = (id) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveData('crm_contacts', updated);
    setSelected(null);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              color: COLORS.textMuted,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Directorio
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Contactos B2B
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, empresa o RUT…"
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: '8px 14px 8px 36px',
                fontFamily: FONT,
                fontSize: 13,
                color: COLORS.text,
                outline: 'none',
                width: 280,
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                color: COLORS.textMuted,
              }}
            >
              🔍
            </span>
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: COLORS.textMuted,
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
          {['todos', 'cliente', 'prospecto', 'lead'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                fontFamily: FONT,
                fontSize: 12,
                cursor: 'pointer',
                background: filterStatus === s ? COLORS.accent : COLORS.card,
                color: filterStatus === s ? COLORS.bg : COLORS.textMuted,
                border: `1px solid ${
                  filterStatus === s ? COLORS.accent : COLORS.border
                }`,
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <AddBtn onClick={openNew} label="Nuevo contacto" />
        </div>
      </div>

      {search && (
        <div
          style={{
            fontFamily: FONT,
            fontSize: 12,
            color: COLORS.textMuted,
            marginBottom: 16,
          }}
        >
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para{' '}
          <span style={{ color: COLORS.accent }}>"{search}"</span>
        </div>
      )}

      {filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            fontFamily: FONT,
            color: COLORS.textMuted,
          }}
        >
          {search
            ? `Sin resultados para "${search}"`
            : 'Sin contactos. ¡Agrega el primero!'}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))',
          gap: 16,
        }}
      >
        {filtered.map((c) => {
          const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.lead;
          return (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                background: COLORS.card,
                border: `1px solid ${
                  selected?.id === c.id ? COLORS.accent : COLORS.border
                }`,
                borderRadius: 10,
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 600,
                      fontSize: 15,
                      color: COLORS.text,
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 12,
                      color: COLORS.accent,
                      marginTop: 2,
                    }}
                  >
                    {c.company}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 11,
                      color: COLORS.textMuted,
                    }}
                  >
                    {c.role}
                  </div>
                  {c.rut && (
                    <div
                      style={{
                        fontFamily: FONT,
                        fontSize: 11,
                        color: COLORS.textDim,
                        marginTop: 2,
                      }}
                    >
                      RUT: {c.rut}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(c);
                    }}
                    style={{
                      background: 'none',
                      border: `1px solid ${COLORS.accent}44`,
                      borderRadius: 4,
                      color: COLORS.accent,
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '2px 7px',
                    }}
                  >
                    ✏️
                  </button>
                  <Badge color={sc.color}>{sc.label}</Badge>
                </div>
              </div>
              <div
                style={{
                  borderTop: `1px solid ${COLORS.border}`,
                  paddingTop: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 11,
                    color: COLORS.textMuted,
                  }}
                >
                  {c.email}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 13,
                    color: COLORS.green,
                    fontWeight: 600,
                  }}
                >
                  {fmt(c.value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 360,
            height: '100%',
            background: COLORS.surface,
            borderLeft: `1px solid ${COLORS.border}`,
            padding: 32,
            overflowY: 'auto',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => setSelected(null)}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.textMuted,
              cursor: 'pointer',
              fontFamily: FONT,
              fontSize: 12,
              marginBottom: 24,
            }}
          >
            ← Cerrar
          </button>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              {selected.name}
            </div>
            <button
              onClick={() => openEdit(selected)}
              style={{
                background: 'none',
                border: `1px solid ${COLORS.accent}44`,
                borderRadius: 6,
                color: COLORS.accent,
                cursor: 'pointer',
                fontSize: 12,
                padding: '4px 10px',
              }}
            >
              ✏️ Editar
            </button>
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 13,
              color: COLORS.accent,
              marginBottom: 16,
            }}
          >
            {selected.role} — {selected.company}
          </div>
          <Badge
            color={(STATUS_CONFIG[selected.status] || STATUS_CONFIG.lead).color}
          >
            {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.lead).label}
          </Badge>
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {[
              ['RUT', selected.rut || '—'],
              ['Email', selected.email],
              ['Teléfono', selected.phone],
              ['Último contacto', fmtDate(selected.lastContact)],
              ['Valor total', fmt(selected.value)],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  background: COLORS.card,
                  borderRadius: 8,
                  padding: '12px 16px',
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 10,
                    color: COLORS.textMuted,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  {k}
                </div>
                <div
                  style={{ fontFamily: FONT, fontSize: 13, color: COLORS.text }}
                >
                  {v || '—'}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => del(selected.id)}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '10px 0',
              background: 'transparent',
              border: `1px solid ${COLORS.red}44`,
              borderRadius: 6,
              color: COLORS.red,
              fontFamily: FONT,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Eliminar contacto
          </button>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
          onClose={() => setShowModal(false)}
          onSubmit={save}
        >
          <Input
            label="Nombre *"
            value={form.name}
            onChange={(e) => f('name', e.target.value)}
            placeholder="Ej: Valentina Rojas"
          />
          <Input
            label="Empresa *"
            value={form.company}
            onChange={(e) => f('company', e.target.value)}
            placeholder="Ej: Nexum Corp"
          />
          <Input
            label="Cargo"
            value={form.role}
            onChange={(e) => f('role', e.target.value)}
            placeholder="Ej: CTO"
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => f('email', e.target.value)}
            placeholder="correo@empresa.com"
            type="email"
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) => f('phone', e.target.value)}
            placeholder="+56 9 ..."
          />
          <Input
            label="RUT"
            value={form.rut}
            onChange={(e) => f('rut', formatRut(e.target.value))}
            placeholder="12.345.678-9"
            maxLength={12}
          />
          <Select
            label="Estado"
            value={form.status}
            onChange={(e) => f('status', e.target.value)}
          >
            <option value="lead">Lead</option>
            <option value="prospecto">Prospecto</option>
            <option value="cliente">Cliente</option>
          </Select>
          <Input
            label="Valor estimado (CLP)"
            value={form.value}
            onChange={(e) => f('value', e.target.value)}
            placeholder="0"
            type="number"
          />
          <Input
            label="Último contacto"
            value={form.lastContact}
            onChange={(e) => f('lastContact', e.target.value)}
            type="date"
          />
        </Modal>
      )}
    </div>
  );
}

function PipelineView({ deals, setDeals, contacts }) {
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [form, setForm] = useState({
    title: '',
    company: '',
    contactId: '',
    rut: '',
    value: '',
    stage: 'contacto',
    probability: '20',
    closeDate: '',
  });
  const grouped = useMemo(() => {
    const g = {};
    STAGES.forEach((s) => {
      g[s.key] = deals.filter((d) => d.stage === s.key);
    });
    return g;
  }, [deals]);
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleCollapse = (id) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const openNew = () => {
    setEditingDeal(null);
    setForm({
      title: '',
      company: '',
      contactId: '',
      rut: '',
      value: '',
      stage: 'contacto',
      probability: '20',
      closeDate: '',
    });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditingDeal(d.id);
    setForm({
      title: d.title,
      company: d.company,
      contactId: d.contactId || '',
      rut: d.rut || '',
      value: String(d.value),
      stage: d.stage,
      probability: String(d.probability),
      closeDate: d.closeDate || '',
    });
    setShowModal(true);
  };

  const save = () => {
    if (!form.title || !form.company) return;
    let updated;
    if (editingDeal) {
      updated = deals.map((d) =>
        d.id === editingDeal
          ? {
              ...d,
              ...form,
              value: Number(form.value) || 0,
              probability: Number(form.probability) || 20,
            }
          : d
      );
    } else {
      updated = [
        ...deals,
        {
          ...form,
          id: uid(),
          value: Number(form.value) || 0,
          probability: Number(form.probability) || 20,
        },
      ];
    }
    setDeals(updated);
    saveData('crm_deals', updated);
    setShowModal(false);
    setEditingDeal(null);
    setForm({
      title: '',
      company: '',
      contactId: '',
      rut: '',
      value: '',
      stage: 'contacto',
      probability: '20',
      closeDate: '',
    });
  };

  const moveDeal = (id, stage) => {
    const updated = deals.map((d) => (d.id === id ? { ...d, stage } : d));
    setDeals(updated);
    saveData('crm_deals', updated);
  };

  const del = (id) => {
    const updated = deals.filter((d) => d.id !== id);
    setDeals(updated);
    saveData('crm_deals', updated);
  };

  // Toggle all cards at once
  const allCollapsed =
    Object.values(collapsed).filter(Boolean).length >= deals.length / 2;
  const toggleAll = () => {
    const next = {};
    deals.forEach((d) => {
      next[d.id] = !allCollapsed;
    });
    setCollapsed(next);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              color: COLORS.textMuted,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Kanban
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Pipeline de Ventas
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={toggleAll}
            style={{
              padding: '9px 16px',
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 7,
              color: COLORS.textMuted,
              fontFamily: FONT_DISPLAY,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {allCollapsed ? '⊞ Expandir todo' : '⊟ Comprimir todo'}
          </button>
          <AddBtn onClick={openNew} label="Nuevo deal" />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 16,
        }}
      >
        {STAGES.map((stage) => {
          const stageDeals = grouped[stage.key] || [];
          const total = stageDeals.reduce((s, d) => s + Number(d.value), 0);
          return (
            <div key={stage.key}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  padding: '10px 14px',
                  background: COLORS.card,
                  borderRadius: 8,
                  border: `1px solid ${stage.color}33`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 11,
                      color: stage.color,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {stage.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 11,
                      color: COLORS.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {fmt(total)}
                  </div>
                </div>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: stage.color + '22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT,
                    fontSize: 12,
                    color: stage.color,
                    fontWeight: 700,
                  }}
                >
                  {stageDeals.length}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stageDeals.map((d) => {
                  const isCollapsed = collapsed[d.id];
                  return (
                    <div
                      key={d.id}
                      style={{
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        borderLeft: `3px solid ${stage.color}`,
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* ── HEADER (always visible) ── */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: isCollapsed ? '10px 12px' : '12px 16px 8px',
                        }}
                      >
                        <button
                          onClick={() => toggleCollapse(d.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: 0,
                            flexShrink: 0,
                            lineHeight: 1,
                          }}
                        >
                          {isCollapsed ? '▶' : '▼'}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: FONT_DISPLAY,
                              fontSize: 13,
                              fontWeight: 600,
                              color: COLORS.text,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {d.title}
                          </div>
                          {isCollapsed && (
                            <div
                              style={{
                                fontFamily: FONT,
                                fontSize: 11,
                                color: COLORS.textMuted,
                              }}
                            >
                              {d.company}
                            </div>
                          )}
                        </div>
                        {isCollapsed && (
                          <div
                            style={{
                              fontFamily: FONT,
                              fontSize: 12,
                              color: COLORS.green,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {fmt(d.value)}
                          </div>
                        )}
                        <button
                          onClick={() => openEdit(d)}
                          style={{
                            background: 'none',
                            border: `1px solid ${COLORS.accent}44`,
                            borderRadius: 4,
                            color: COLORS.accent,
                            cursor: 'pointer',
                            fontSize: 11,
                            padding: '2px 6px',
                            flexShrink: 0,
                          }}
                        >
                          ✏️
                        </button>
                      </div>

                      {/* ── EXPANDED CONTENT ── */}
                      {!isCollapsed && (
                        <div style={{ padding: '0 16px 14px' }}>
                          <div
                            style={{
                              fontFamily: FONT,
                              fontSize: 11,
                              color: COLORS.textMuted,
                              marginBottom: d.rut ? 2 : 10,
                            }}
                          >
                            {d.company}
                          </div>
                          {d.rut && (
                            <div
                              style={{
                                fontFamily: FONT,
                                fontSize: 11,
                                color: COLORS.textDim,
                                marginBottom: 10,
                              }}
                            >
                              RUT: {d.rut}
                            </div>
                          )}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: FONT,
                                fontSize: 14,
                                color: COLORS.green,
                                fontWeight: 700,
                              }}
                            >
                              {fmt(d.value)}
                            </div>
                            <div
                              style={{
                                fontFamily: FONT,
                                fontSize: 11,
                                color: COLORS.textMuted,
                              }}
                            >
                              {fmtDate(d.closeDate)}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: FONT,
                                fontSize: 10,
                                color: COLORS.textMuted,
                              }}
                            >
                              Probabilidad
                            </span>
                            <span
                              style={{
                                fontFamily: FONT,
                                fontSize: 10,
                                color: stage.color,
                              }}
                            >
                              {d.probability}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 4,
                              background: COLORS.border,
                              borderRadius: 2,
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                height: 4,
                                borderRadius: 2,
                                background: stage.color,
                                width: `${d.probability}%`,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: 4,
                              flexWrap: 'wrap',
                            }}
                          >
                            {STAGES.filter((s) => s.key !== stage.key).map(
                              (s) => (
                                <button
                                  key={s.key}
                                  onClick={() => moveDeal(d.id, s.key)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    fontFamily: FONT,
                                    fontSize: 10,
                                    cursor: 'pointer',
                                    background: 'transparent',
                                    border: `1px solid ${s.color}44`,
                                    color: s.color,
                                  }}
                                >
                                  → {s.label}
                                </button>
                              )
                            )}
                            <button
                              onClick={() => del(d.id)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontFamily: FONT,
                                fontSize: 10,
                                cursor: 'pointer',
                                background: 'transparent',
                                border: `1px solid ${COLORS.red}44`,
                                color: COLORS.red,
                                marginLeft: 'auto',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageDeals.length === 0 && (
                  <div
                    style={{
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: 8,
                      padding: '24px 0',
                      textAlign: 'center',
                      fontFamily: FONT,
                      fontSize: 12,
                      color: COLORS.textDim,
                    }}
                  >
                    Sin deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <Modal
          title={editingDeal ? 'Editar Deal' : 'Nuevo Deal'}
          onClose={() => setShowModal(false)}
          onSubmit={save}
        >
          <Input
            label="Título *"
            value={form.title}
            onChange={(e) => f('title', e.target.value)}
            placeholder="Ej: Licencia Enterprise"
          />
          <Input
            label="Empresa *"
            value={form.company}
            onChange={(e) => f('company', e.target.value)}
            placeholder="Ej: Nexum Corp"
          />
          <Select
            label="Contacto"
            value={form.contactId}
            onChange={(e) => f('contactId', e.target.value)}
          >
            <option value="">— Sin contacto —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.company})
              </option>
            ))}
          </Select>
          <Input
            label="RUT empresa"
            value={form.rut}
            onChange={(e) => f('rut', formatRut(e.target.value))}
            placeholder="12.345.678-9"
            maxLength={12}
          />
          <Input
            label="Valor"
            value={form.value}
            onChange={(e) => f('value', e.target.value)}
            placeholder="0"
            type="number"
          />
          <Select
            label="Etapa"
            value={form.stage}
            onChange={(e) => f('stage', e.target.value)}
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input
            label="Probabilidad %"
            value={form.probability}
            onChange={(e) => f('probability', e.target.value)}
            type="number"
            placeholder="0-100"
          />
          <Input
            label="Fecha de cierre estimada"
            value={form.closeDate}
            onChange={(e) => f('closeDate', e.target.value)}
            type="date"
          />
        </Modal>
      )}
    </div>
  );
}

function TasksView({ tasks, setTasks, contacts }) {
  const [filter, setFilter] = useState('pendientes');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    contactId: '',
    company: '',
    dueDate: '',
    priority: 'media',
    type: 'tarea',
  });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const filtered = tasks
    .filter((t) => {
      if (filter === 'pendientes') return !t.done;
      if (filter === 'completadas') return t.done;
      if (filter === 'vencidas') return !t.done && isOverdue(t.dueDate);
      return true;
    })
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const toggle = (id) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setTasks(updated);
    saveData('crm_tasks', updated);
  };
  const del = (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveData('crm_tasks', updated);
  };
  const save = () => {
    if (!form.title) return;
    const contact = contacts.find((c) => c.id === form.contactId);
    const updated = [
      ...tasks,
      {
        ...form,
        id: uid(),
        done: false,
        company: form.company || contact?.company || '',
      },
    ];
    setTasks(updated);
    saveData('crm_tasks', updated);
    setShowModal(false);
    setForm({
      title: '',
      contactId: '',
      company: '',
      dueDate: '',
      priority: 'media',
      type: 'tarea',
    });
  };
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              color: COLORS.textMuted,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Seguimiento
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Tareas
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {['todas', 'pendientes', 'vencidas', 'completadas'].map((flt) => (
            <button
              key={flt}
              onClick={() => setFilter(flt)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                fontFamily: FONT,
                fontSize: 12,
                cursor: 'pointer',
                background: filter === flt ? COLORS.accent : COLORS.card,
                color: filter === flt ? COLORS.bg : COLORS.textMuted,
                border: `1px solid ${
                  filter === flt ? COLORS.accent : COLORS.border
                }`,
              }}
            >
              {flt.charAt(0).toUpperCase() + flt.slice(1)}
            </button>
          ))}
          <AddBtn onClick={() => setShowModal(true)} label="Nueva tarea" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((t) => {
          const pc = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.media;
          const overdue = !t.done && isOverdue(t.dueDate);
          return (
            <div
              key={t.id}
              style={{
                background: COLORS.card,
                border: `1px solid ${
                  overdue ? COLORS.red + '44' : COLORS.border
                }`,
                borderRadius: 8,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                opacity: t.done ? 0.5 : 1,
              }}
            >
              <div
                onClick={() => toggle(t.id)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: t.done ? COLORS.green : 'transparent',
                  border: `2px solid ${t.done ? COLORS.green : COLORS.border}`,
                }}
              >
                {t.done && (
                  <span
                    style={{ color: COLORS.bg, fontSize: 12, fontWeight: 700 }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <div style={{ fontSize: 18 }}>{TYPE_ICONS[t.type] || '✅'}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 14,
                    color: COLORS.text,
                    textDecoration: t.done ? 'line-through' : 'none',
                  }}
                >
                  {t.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 11,
                    color: COLORS.textMuted,
                    marginTop: 2,
                  }}
                >
                  {t.company}
                </div>
              </div>
              <Tag label={pc.label} color={pc.color} />
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 12,
                  color: overdue ? COLORS.red : COLORS.textMuted,
                  minWidth: 60,
                  textAlign: 'right',
                }}
              >
                {overdue && '⚠ '}
                {fmtDate(t.dueDate)}
              </div>
              <button
                onClick={() => del(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.textDim,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              fontFamily: FONT,
              color: COLORS.textMuted,
            }}
          >
            Sin tareas en esta categoría
          </div>
        )}
      </div>
      {showModal && (
        <Modal
          title="Nueva Tarea"
          onClose={() => setShowModal(false)}
          onSubmit={save}
        >
          <Input
            label="Título *"
            value={form.title}
            onChange={(e) => f('title', e.target.value)}
            placeholder="Ej: Llamada de seguimiento"
          />
          <Select
            label="Contacto"
            value={form.contactId}
            onChange={(e) => {
              const c = contacts.find((x) => x.id === e.target.value);
              f('contactId', e.target.value);
              if (c) f('company', c.company);
            }}
          >
            <option value="">— Sin contacto —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.company})
              </option>
            ))}
          </Select>
          <Input
            label="Empresa"
            value={form.company}
            onChange={(e) => f('company', e.target.value)}
            placeholder="Ej: DataFlow SA"
          />
          <Input
            label="Fecha límite"
            value={form.dueDate}
            onChange={(e) => f('dueDate', e.target.value)}
            type="date"
          />
          <Select
            label="Prioridad"
            value={form.priority}
            onChange={(e) => f('priority', e.target.value)}
          >
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </Select>
          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => f('type', e.target.value)}
          >
            <option value="llamada">📞 Llamada</option>
            <option value="email">✉️ Email</option>
            <option value="reunion">🤝 Reunión</option>
            <option value="tarea">✅ Tarea</option>
          </Select>
        </Modal>
      )}
    </div>
  );
}

function ReportsView({ contacts, deals, tasks }) {
  const totalRevenue = deals
    .filter((d) => d.stage === 'cerrado')
    .reduce((s, d) => s + Number(d.value), 0);
  const wonRate =
    deals.length > 0
      ? Math.round(
          (deals.filter((d) => d.stage === 'cerrado').length / deals.length) *
            100
        )
      : 0;
  const avgDeal =
    deals.length > 0
      ? Math.round(
          deals.reduce((s, d) => s + Number(d.value), 0) / deals.length
        )
      : 0;
  const taskCompletion =
    tasks.length > 0
      ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)
      : 0;
  const totalPipeline = deals.reduce((s, d) => s + Number(d.value), 0);
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 11,
            color: COLORS.textMuted,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Análisis
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          Reportes y Estadísticas
        </div>
      </div>
      <div
        style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}
      >
        <Stat
          label="Ingresos cerrados"
          value={fmt(totalRevenue)}
          color={COLORS.green}
        />
        <Stat
          label="Tasa de cierre"
          value={`${wonRate}%`}
          color={wonRate > 50 ? COLORS.green : COLORS.yellow}
        />
        <Stat
          label="Valor promedio deal"
          value={fmt(avgDeal)}
          color={COLORS.accent}
        />
        <Stat
          label="Tareas completadas"
          value={`${taskCompletion}%`}
          color={COLORS.text}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 24,
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              color: COLORS.text,
              marginBottom: 18,
              fontSize: 15,
            }}
          >
            Pipeline por etapa
          </div>
          {STAGES.map((s) => {
            const val = deals
              .filter((d) => d.stage === s.key)
              .reduce((a, d) => a + Number(d.value), 0);
            return (
              <div key={s.key} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{ fontFamily: FONT, fontSize: 12, color: s.color }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 12,
                      color: COLORS.textMuted,
                    }}
                  >
                    {deals.filter((d) => d.stage === s.key).length} deals ·{' '}
                    {fmt(val)}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: COLORS.border,
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: s.color,
                      width: `${
                        totalPipeline > 0 ? (val / totalPipeline) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 24,
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              color: COLORS.text,
              marginBottom: 18,
              fontSize: 15,
            }}
          >
            Contactos por estado
          </div>
          {Object.entries(STATUS_CONFIG).map(([key, sc]) => {
            const count = contacts.filter((c) => c.status === key).length;
            const pct =
              contacts.length > 0
                ? Math.round((count / contacts.length) * 100)
                : 0;
            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{ fontFamily: FONT, fontSize: 12, color: sc.color }}
                  >
                    {sc.label}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 12,
                      color: COLORS.textMuted,
                    }}
                  >
                    {count} ({pct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: COLORS.border,
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: sc.color,
                      width: `${pct}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: 24,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            color: COLORS.text,
            marginBottom: 18,
            fontSize: 15,
          }}
        >
          Top empresas por valor
        </div>
        {contacts.length === 0 && (
          <div
            style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted }}
          >
            Sin datos aún. Agrega contactos.
          </div>
        )}
        {[...contacts]
          .sort((a, b) => Number(b.value) - Number(a.value))
          .slice(0, 6)
          .map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 0',
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  color: COLORS.textDim,
                  width: 20,
                }}
              >
                #{i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 13,
                    color: COLORS.text,
                  }}
                >
                  {c.company}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 11,
                    color: COLORS.textMuted,
                  }}
                >
                  {c.name}
                </div>
              </div>
              <Badge
                color={(STATUS_CONFIG[c.status] || STATUS_CONFIG.lead).color}
              >
                {(STATUS_CONFIG[c.status] || STATUS_CONFIG.lead).label}
              </Badge>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  color: COLORS.green,
                  fontWeight: 600,
                }}
              >
                {fmt(c.value)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '◈' },
  { key: 'contacts', label: 'Contactos', icon: '◎' },
  { key: 'pipeline', label: 'Pipeline', icon: '◧' },
  { key: 'tasks', label: 'Tareas', icon: '◉' },
  { key: 'reports', label: 'Reportes', icon: '◌' },
];

export default function CRM() {
  const [view, setView] = useState('dashboard');
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const c = loadData('crm_contacts', []);
    const d = loadData('crm_deals', []);
    const t = loadData('crm_tasks', []);
    setContacts(c);
    setDeals(d);
    setTasks(t);
    setLoading(false);
  }, []);

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: COLORS.bg,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            color: COLORS.accent,
            fontSize: 14,
            letterSpacing: '0.1em',
          }}
        >
          Cargando NexusCRM…
        </div>
      </div>
    );

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: COLORS.bg,
        fontFamily: FONT_DISPLAY,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <aside
        style={{
          width: 220,
          background: COLORS.surface,
          borderRight: `1px solid ${COLORS.border}`,
          padding: '28px 0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '0 24px 28px',
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 10,
              color: COLORS.accent,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            B2B SALES
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Polygonos SpA
          </div>
        </div>
        <nav style={{ padding: '20px 12px', flex: 1 }}>
          {NAV.map((n) => {
            const active = view === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 7,
                  marginBottom: 4,
                  background: active ? COLORS.accentDim : 'transparent',
                  border: `1px solid ${
                    active ? COLORS.accentGlow : 'transparent'
                  }`,
                  cursor: 'pointer',
                  color: active ? COLORS.accent : COLORS.textMuted,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav>
        <div
          style={{
            padding: '20px 24px',
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              color: COLORS.textMuted,
              marginBottom: 8,
            }}
          >
            <span style={{ color: COLORS.green }}>●</span> {contacts.length}{' '}
            contactos · {deals.length} deals
          </div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 13,
              color: COLORS.text,
              fontWeight: 600,
            }}
          >
            Tu CRM
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.green }}>
            Datos guardados ✓
          </div>
        </div>
      </aside>
      <main
        style={{
          flex: 1,
          padding: 32,
          overflowY: 'auto',
          maxWidth: 'calc(100vw - 220px)',
        }}
      >
        {view === 'dashboard' && (
          <Dashboard contacts={contacts} deals={deals} tasks={tasks} />
        )}
        {view === 'contacts' && (
          <ContactsView contacts={contacts} setContacts={setContacts} />
        )}
        {view === 'pipeline' && (
          <PipelineView deals={deals} setDeals={setDeals} contacts={contacts} />
        )}
        {view === 'tasks' && (
          <TasksView tasks={tasks} setTasks={setTasks} contacts={contacts} />
        )}
        {view === 'reports' && (
          <ReportsView contacts={contacts} deals={deals} tasks={tasks} />
        )}
      </main>
    </div>
  );
}
