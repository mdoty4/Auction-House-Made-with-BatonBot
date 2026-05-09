'use client';
import { useState } from 'react';
interface QA { id: string; q: string; a: string | null; author: string; date: string; }
const mock: QA[] = [{ id: '1', q: 'Is this item brand new or used?', a: 'Excellent condition with minimal signs of use.', author: 'Buyer123', date: '2024-01-15' }, { id: '2', q: 'Original packaging included?', a: 'Yes, box and all accessories included.', author: 'Collector99', date: '2024-01-14' }, { id: '3', q: 'How long is the warranty?', a: null, author: 'Shopper42', date: '2024-01-13' }];
export default function QAAccordion({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [items, setItems] = useState<QA[]>(mock);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!input.trim()) return; setItems([{ id: Date.now().toString(), q: input.trim(), a: null, author: 'You', date: new Date().toISOString().split('T')[0] }, ...items]); setInput(''); };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Questions & Answers</h3>
      <p className="mt-1 text-sm text-gray-500">{items.length} {items.length === 1 ? 'question' : 'questions'}</p>
      <form onSubmit={submit} className="mt-6 flex gap-3"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /><button type="submit" disabled={!input.trim()} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Ask</button></form>
      <div className="mt-6 space-y-3">{items.map((qa) => (<div key={qa.id} className="overflow-hidden rounded-xl border border-gray-200"><button onClick={() => setOpen(open === qa.id ? null : qa.id)} className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-gray-50"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">Q</div><div className="flex-1"><p className="text-sm font-medium text-gray-900">{qa.q}</p><p className="mt-1 text-xs text-gray-400">{qa.author} &bull; {new Date(qa.date).toLocaleDateString()}</p></div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`mt-1 h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${open === qa.id ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg></button>{open === qa.id && (<div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4">{qa.a ? (<div className="flex items-start gap-3"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-600">A</div><div><p className="text-sm text-gray-700">{qa.a}</p><p className="mt-1 text-xs text-gray-400">Answered by seller</p></div></div>) : (<div className="flex items-center gap-3"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400">?</div><p className="text-sm italic text-gray-400">No answer yet</p></div>)}</div>)}
</div>))}</div>
    </div>
  );
}
