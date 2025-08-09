// assets/js/search.js
import { supabaseClient as supabase } from './supabaseClient.js';

let debounceTimer;
const DEBOUNCE_MS = 200;

export function setupSearchHandlers() {
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');

  if (!input || !results) {
    console.warn('Search: missing #searchInput or #searchResults');
    return;
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value.trim(), results), DEBOUNCE_MS);
  });

  // initial state
  results.innerHTML = '';
}

async function runSearch(query, container) {
  if (!query) {
    container.innerHTML = '';
    return;
  }

  // Search across name, role, and interests
  // Uses ilike OR logic via multiple RPCs collapsed in JS for clarity & speed
  const filters = [
    { col: 'name', val: `%${query}%` },
    { col: 'role', val: `%${query}%` },
    { col: 'interests', val: `%${query}%` },
  ];

  // Run in parallel
  const tasks = filters.map(f =>
    supabase.from('community')
      .select('id, name, role, interests, image_url')
      .ilike(f.col, f.val)
      .limit(15)
  );

  const settled = await Promise.allSettled(tasks);
  const rows = new Map();
  for (const s of settled) {
    if (s.status === 'fulfilled' && !s.value.error && s.value.data) {
      for (const r of s.value.data) rows.set(r.id, r);
    }
  }

  const data = Array.from(rows.values());

  if (data.length === 0) {
    container.innerHTML = `<div class="text-sm opacity-70 p-2">No matches</div>`;
    return;
  }

  container.innerHTML = data.map(renderResult).join('');
}

function renderResult(r) {
  const img = r.image_url || 'images/avatar-placeholder.png';
  const interests = Array.isArray(r.interests) ? r.interests.join(', ') : (r.interests || '');
  return `
    <button class="w-full flex gap-3 items-center p-2 rounded-xl border border-white/10 hover:bg-white/5 text-left"
            data-id="${r.id}">
      <img src="${img}" alt="${r.name}" class="w-10 h-10 rounded-full object-cover" />
      <div class="min-w-0">
        <div class="font-medium truncate">${r.name || 'Unnamed'}</div>
        <div class="text-xs opacity-70 truncate">${r.role || ''}</div>
        <div class="text-xs opacity-70 truncate">${interests}</div>
      </div>
    </button>
  `;
}
