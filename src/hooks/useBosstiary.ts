import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterId } from '../domain/types';
import { aplicar, limparEstado, type Alteracao, type EstadoPersonagem } from '../domain/bosses/estado';
import { devolver, juntar, tirar } from '../domain/bosses/fila';
import { carregarBosstiary, gravarAlteracoes } from '../storage/bosstiaryStore';
import { getGithubToken, setGithubToken } from '../storage/githubToken';
import { historyErrorText } from '../storage/sharedHistory';

/** Grava-se este tempo depois do último clique, num commit só. */
const ESPERA_MS = 2000;

export type EstadoGravacao = 'gravado' | 'pendente' | 'a gravar' | 'falhou' | 'sem chave';

export interface Bosstiary {
  /** O que está gravado mais o que ainda está na fila — o que a página mostra. */
  estado: EstadoPersonagem;
  carregando: boolean;
  /** Falha a LER. */
  erro: string | null;
  gravacao: EstadoGravacao;
  /** A razão da última falha a gravar. */
  erroGravacao: string | null;
  mudar: (alteracao: Alteracao) => void;
  tentarOutraVez: () => void;
  recarregar: () => void;
  temChave: boolean;
  definirChave: (token: string | null) => void;
}

const VAZIO: EstadoPersonagem = { bosses: {}, pontosJogo: null, aplicadas: [] };

// A fila por gravar fica também no aparelho (22/11/2026, revisão final): no
// telemóvel o «tens alterações por gravar» não aparece ao fechar o separador,
// e trocar de personagem ou de página desmonta isto. Ao voltar, a fila é lida
// daqui e gravada; os `uid` impedem que o que já tinha entrado conte duas vezes.
const chaveFila = (id: CharacterId) => `tibiavault:bosses-fila:${id}`;

function lerFila(id: CharacterId): Alteracao[] {
  try {
    const raw = JSON.parse(localStorage.getItem(chaveFila(id)) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    // Só passa o que o `aplicar` reconhece (o mesmo filtro do ficheiro).
    return raw.filter((a): a is Alteracao => typeof a === 'object' && a !== null && typeof (a as Alteracao).tipo === 'string');
  } catch {
    return [];
  }
}

function guardarFila(id: CharacterId, fila: Alteracao[]): void {
  try {
    if (fila.length === 0) localStorage.removeItem(chaveFila(id));
    else localStorage.setItem(chaveFila(id), JSON.stringify(fila));
  } catch {
    // sem armazenamento: a fila vive só nesta página
  }
}

function novoUid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * O Bosstiary de um personagem (22/11/2026): lê `data/bosstiary/<id>.json` e
 * grava as alterações em fila, 2 s depois do último clique. O lote em gravação
 * fica à parte da fila: o que chega entretanto não se mistura com ele, e no fim
 * sai da fila só o que foi gravado (pelo `uid`). Uma falha deixa o lote de
 * volta na fila, à vista com «tentar outra vez».
 */
export function useBosstiary(id: CharacterId): Bosstiary {
  const [gravado, setGravado] = useState<EstadoPersonagem>(VAZIO);
  const [fila, setFila] = useState<Alteracao[]>(() => lerFila(id));
  const [emVoo, setEmVoo] = useState<Alteracao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [leitura, setLeitura] = useState(0);
  const [token, setToken] = useState<string | null>(() => getGithubToken());

  const filaRef = useRef<Alteracao[]>(fila);
  useEffect(() => {
    filaRef.current = fila;
  }, [fila]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    carregarBosstiary(id, token)
      .then((e) => {
        if (cancelado) return;
        setGravado(e);
        setErro(null);
      })
      .catch((err: unknown) => {
        if (!cancelado) setErro(historyErrorText(err));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id, token, leitura]);

  // O que falta gravar fica no aparelho até estar gravado.
  useEffect(() => {
    guardarFila(id, [...emVoo, ...fila]);
  }, [id, emVoo, fila]);

  // Gravar: 2 s depois da última alteração, um lote de cada vez.
  const aGravar = emVoo.length > 0;
  useEffect(() => {
    if (fila.length === 0 || !token || aGravar || erroGravacao) return;
    const timer = setTimeout(() => {
      const lote = filaRef.current;
      if (lote.length === 0) return;
      setEmVoo(lote);
      setFila((atual) => tirar(atual, lote));
      gravarAlteracoes(id, lote, token)
        .then((novo) => {
          setGravado(novo);
          setEmVoo([]);
        })
        .catch((err: unknown) => {
          setFila((atual) => devolver(lote, atual));
          setEmVoo([]);
          setErroGravacao(err instanceof Error ? err.message : String(err));
        });
    }, ESPERA_MS);
    return () => clearTimeout(timer);
  }, [fila, token, aGravar, erroGravacao, id, tentativa]);

  // Sair da página com alterações por gravar pede confirmação (no computador;
  // no telemóvel vale a fila guardada no aparelho).
  const pendentes = emVoo.length + fila.length;
  useEffect(() => {
    if (pendentes === 0) return;
    const aviso = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [pendentes]);

  const mudar = useCallback((a: Alteracao) => setFila((atual) => juntar(atual, { ...a, uid: novoUid() })), []);
  const tentarOutraVez = useCallback(() => {
    setErroGravacao(null);
    setTentativa((n) => n + 1);
  }, []);
  const recarregar = useCallback(() => setLeitura((n) => n + 1), []);
  const definirChave = useCallback((valor: string | null) => {
    setGithubToken(valor);
    setToken(getGithubToken());
    setErroGravacao(null);
  }, []);

  let gravacao: EstadoGravacao = 'gravado';
  if (!token && pendentes > 0) gravacao = 'sem chave';
  else if (erroGravacao) gravacao = 'falhou';
  else if (aGravar) gravacao = 'a gravar';
  else if (pendentes > 0) gravacao = 'pendente';

  return {
    // Os `uid` já gravados não contam duas vezes (ver `aplicadas`).
    estado: aplicar(limparEstado(gravado), [...emVoo, ...fila]),
    carregando,
    erro,
    gravacao,
    erroGravacao,
    mudar,
    tentarOutraVez,
    recarregar,
    temChave: token !== null,
    definirChave,
  };
}
