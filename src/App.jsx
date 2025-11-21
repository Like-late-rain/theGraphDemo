import { useCallback, useEffect, useMemo, useState } from 'react';

const API_KEY = '145bc964febd7e6d01967b593ea8340e';
const ENDPOINT = `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`;

const GRAPHQL_QUERY = `
  {
    pools(first: 5, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      feeTier
      token0 {
        symbol
      }
      token1 {
        symbol
      }
      totalValueLockedUSD
      volumeUSD
    }
  }
`;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

function formatUsd(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '—';
  }
  return currencyFormatter.format(number);
}

function formatVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '—';
  }
  return compactFormatter.format(number);
}

function formatFee(feeTier) {
  const tier = Number(feeTier);
  if (!Number.isFinite(tier)) {
    return '—';
  }
  const percent = tier / 10000;
  return `${percent.toFixed(2)}%`;
}

export default function App() {
  const [pools, setPools] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPools = useCallback(async () => {
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: GRAPHQL_QUERY })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const json = await response.json();

      if (json.errors) {
        throw new Error(json.errors.map((item) => item.message).join(' | '));
      }

      setPools(json.data?.pools ?? []);
      setLastUpdated(new Date());
      setStatus('success');
    } catch (err) {
      console.error(err);
      setPools([]);
      setError(err instanceof Error ? err.message : '请求失败');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const statusCopy = useMemo(() => {
    if (status === 'loading') {
      return '数据加载中…';
    }
    if (status === 'success') {
      return '数据已就绪';
    }
    if (status === 'error') {
      return '请求出错；请重试';
    }
    return '准备加载数据';
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">The Graph + Uniswap V3</p>
          <h1 className="text-3xl font-semibold leading-tight text-white">
            链上实时热度池：资产、TVL 与交易量一览
          </h1>
          <p className="text-slate-400">
            使用 Uniswap V3 主网子图，对 TVL 排名前五的资金池进行可视化，数字自动格式化并保留当前加载状态。
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-900/40">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">状态</p>
            <p className="text-lg font-medium text-white">{statusCopy}</p>
            {lastUpdated && (
              <p className="text-xs text-slate-400">
                最新更新：{dateFormatter.format(lastUpdated)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={fetchPools}
            disabled={status === 'loading'}
            className="ml-auto rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-50"
          >
            {status === 'loading' ? '刷新中…' : '重新加载数据'}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {pools.map((pool) => (
            <article
              key={pool.id}
              className="flex flex-col rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-6 shadow-2xl shadow-slate-950/50 transition hover:-translate-y-1 hover:shadow-white/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Pool</p>
                  <h2 className="text-xl font-semibold text-white">
                    {pool.token0.symbol} / {pool.token1.symbol}
                  </h2>
                </div>
                <span className="rounded-full border border-indigo-500/60 px-3 py-1 text-xs font-semibold text-indigo-200">
                  {formatFee(pool.feeTier)} 费率
                </span>
              </div>

              <p className="my-3 text-xs text-slate-500">{pool.id.slice(0, 8)}…{pool.id.slice(-6)}</p>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">TVL</span>
                  <span className="text-base font-medium text-white">{formatUsd(pool.totalValueLockedUSD)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">24h 交易量</span>
                  <span className="text-base font-medium text-white">{formatVolume(pool.volumeUSD)} USD</span>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-end text-xs text-slate-500">
                数据来自 Uniswap V3 主网子图
              </div>
            </article>
          ))}

          {!pools.length && status !== 'loading' && (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-800/60 bg-slate-900/60 p-6 text-sm text-slate-400">
              当前暂未加载到数据。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
