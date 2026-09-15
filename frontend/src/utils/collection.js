export function filterCollection(items, { search = '', status = '', genre = '', sort = 'newest' } = {}) {
  const query = search.trim().toLocaleLowerCase();
  const filtered = items.filter(item =>
    item.title.toLocaleLowerCase().includes(query) &&
    (!status || item.completion_status === status) &&
    (!genre || item.genres?.some(g => g.genre_name === genre))
  );
  const byTitle = (a, b) => a.title.localeCompare(b.title) || a.item_id - b.item_id;
  const byDate = (a, b) => (Date.parse(a.date_logged) || 0) - (Date.parse(b.date_logged) || 0);
  const comparators = {
    newest: (a, b) => byDate(b, a) || byTitle(a, b),
    oldest: (a, b) => byDate(a, b) || byTitle(a, b),
    title: byTitle,
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byTitle(a, b),
    year: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0) || byTitle(a, b),
  };
  return filtered.sort(comparators[sort] || comparators.newest);
}

export function collectionStats(items) {
  return {
    total: items.length,
    completed: items.filter(item => item.completion_status === 'Completed').length,
    in_progress: items.filter(item => item.completion_status === 'Watching').length,
    backlog: items.filter(item => item.completion_status === 'Want to Watch').length,
  };
}
