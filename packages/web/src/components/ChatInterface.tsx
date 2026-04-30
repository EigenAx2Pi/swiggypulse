import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import type { ChatTurn } from '../types';
import { Spinner } from './common/Spinner';

const SUGGESTIONS = [
  'Why did orders drop last Tuesday?',
  'Which item should I promote?',
  'How are my coupons performing?',
  'When are my peak hours?',
];

export function ChatInterface() {
  const [history, setHistory] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m SwiggyPulse — your growth copilot. Ask me about orders, coupons, weather impact, or peak-hour patterns.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, loading]);

  const send = async (msg: string) => {
    if (!msg.trim() || loading) return;
    const newHistory: ChatTurn[] = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    setInput('');
    setLoading(true);
    try {
      const res = await api.chat(msg, newHistory.slice(-6));
      setHistory((h) => [...h, { role: 'assistant', content: res.answer, source: res.source }]);
    } catch (e) {
      setHistory((h) => [...h, { role: 'assistant', content: `Error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold text-slate-100">Chat Copilot</h1>
        <p className="text-sm text-slate-400 mt-0.5">Ask anything about your restaurant performance</p>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin px-6 py-6" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-5">
          {history.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={
                t.role === 'user'
                  ? 'max-w-xl bg-accent/10 border border-accent/20 text-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 text-sm'
                  : 'max-w-xl bg-slate-850 border border-slate-800 text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed'
              }>
                {t.content}
                {t.source === 'precanned' && t.role === 'assistant' && (
                  <div className="mt-2 text-[10px] text-slate-500">demo response · set ANTHROPIC_API_KEY for live answers</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-850 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <Spinner size="sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-4 max-w-3xl mx-auto w-full">
        {history.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-850 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your restaurant…"
            className="flex-1 bg-slate-850 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-lg bg-accent text-slate-950 text-sm font-semibold hover:bg-accent/90 disabled:bg-slate-700 disabled:text-slate-500"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
