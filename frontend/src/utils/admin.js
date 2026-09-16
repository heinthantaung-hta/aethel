export function adminStats({ posts, users, reports }) {
  return {
    users: users.length,
    published: posts.filter(p => p.status === 'published').length,
    flagged: posts.filter(p => p.status === 'flagged').length,
    pending: reports.filter(r => r.status === 'pending').length,
  };
}

export function filterAdminItems(items, tab, search = '', status = '') {
  const query = search.trim().toLowerCase();
  return items.filter(item => {
    const matchesStatus = !status || (tab === 'users'
      ? (status === 'banned' ? item.is_banned : !item.is_banned)
      : item.status === status);
    const target = item.target_details || {};
    const fields = tab === 'reports'
      ? [item.reason, item.details, item.reporter_username, item.report_type, target.title, target.body, target.username]
      : tab === 'users' ? [item.username, item.display_name, item.email] : [item.title, item.username, item.media_title];
    return matchesStatus && fields.some(value => String(value || '').toLowerCase().includes(query));
  });
}

export function paginate(items, requestedPage, pageSize = 12) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pages));
  return { page, pages, items: items.slice((page - 1) * pageSize, page * pageSize) };
}
