import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterId } from '../domain/types';
import { aplicar, type Alteracao, type EstadoPersonagem } from '../domain/bosses/estado';
import { juntar } from '../domain/bosses/fila';
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

const VAZIO: EstadoPersonagem = { bosses: {}, pontosJogo: null };

/**
 * O Bosstiary de um personagem (22/11/2026): lê `data/bosstiary/<id>.json` e
 * grava as alterações em fila, 2 s depois do último clique. Enquanto houver
 * alterações por gravar, sair da página pede confirmação; uma falha fica à
 * vista com «tentar outra vez» e as alterações continuam na fila.
 */
export function useBosstiary(id: CharacterId): Bosstiary {
  const [gravado, setGravado] = useState<EstadoPersonagem>(VAZIO);
  const [pendentes, setPendentes] = useState<Alteracao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [leitura, setLeitura] = useState(0);
  const [token, setToken] = useState<string | null>(() => getGithubToken());

  // A fila também num ref: a gravação e a saída da página precisam do valor
  // atual sem esperar por um render.
  const filaRef = useRef<Alteracao[]>([]);
  filaRef.current = pendentes;

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

  // Gravar: 2 s depois da última alteração, se não estiver já a gravar.
  useEffect(() => {
    if (pendentes.length === 0 || !token || aGravar || erroGravacao) return;
    const timer = setTimeout(() => {
      const lote = filaRef.current;
      if (lote.length === 0) return;
      setAGravar(true);
      gravarAlteracoes(id, lote, token)
        .then((novo) => {
          setGravado(novo);
          // Sai da fila só o que foi gravado; o que chegou entretanto fica.
          setPendentes((atual) => atual.slice(lote.length));
        })
        .catch((err: unknown) => setErroGravacao(err instanceof Error ? err.message : String(err)))
        .finally(() => setAGravar(false));
    }, ESPERA_MS);
    return () => clearTimeout(timer);
  }, [pendentes, token, aGravar, erroGravacao, id, tentativa]);

  // Sair da página com alterações por gravar pede confirmação.
  useEffect(() => {
    if (pendentes.length === 0) return;
    const aviso = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [pendentes.length]);

  // Trocar de personagem (o componente desmonta) com alterações na fila:
  // grava-as logo, sem esperar.
  useEffect(
    () => () => {
      const lote = filaRef.current;
      const chave = getGithubToken();
      if (lote.length > 0 && chave) void gravarAlteracoes(id, lote, chave).catch(() => undefined);
    },
    [id]
  );

  const mudar = useCallback((a: Alteracao) => setPendentes((atual) => juntar(atual, a)), []);
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
  if (!token && pendentes.length > 0) gravacao = 'sem chave';
  else if (erroGravacao) gravacao = 'falhou';
  else if (aGravar) gravacao = 'a gravar';
  else if (pendentes.length > 0) gravacao = 'pendente';

  return {
    estado: aplicar(gravado, pendentes),
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
