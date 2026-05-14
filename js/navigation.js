function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * Renders top pills (workspace routes only) and full sidebar scroll content.
 */
export function mountApplicationNavigation(
  { workspaceRoutes, savedViewItems, accountRoutes },
  sidebarScrollEl,
  topNavEl
) {
  if (!sidebarScrollEl || !topNavEl) return;

  const primaryHtml = workspaceRoutes
    .map((r) => {
      const count =
        r.count != null && r.count !== ''
          ? `<span class="nav-count">${escAttr(r.count)}</span>`
          : '';
      return `<a class="nav-item" href="#/${encodeURIComponent(r.id)}" data-nav="${escAttr(r.id)}" data-label="${escAttr(r.label)}">
          <span class="nav-icon"><span class="material-symbols-rounded">${r.icon}</span></span>
          <span class="nav-label">${escAttr(r.label)}</span>
          ${count}
        </a>`;
    })
    .join('');

  const savedHtml = savedViewItems
    .map(
      (s) => `<a class="nav-item" data-label="${escAttr(s.label)}" data-action="saved-view" data-view="${escAttr(s.view)}">
          <span class="nav-icon"><span class="material-symbols-rounded">bookmark</span></span>
          <span class="nav-label">${escAttr(s.label)}</span>
        </a>`
    )
    .join('');

  const accountHtml = accountRoutes
    .map(
      (r) => `<a class="nav-item" href="#/${encodeURIComponent(r.id)}" data-nav="${escAttr(r.id)}" data-label="${escAttr(r.label)}">
          <span class="nav-icon"><span class="material-symbols-rounded">${r.icon}</span></span>
          <span class="nav-label">${escAttr(r.label)}</span>
        </a>`
    )
    .join('');

  sidebarScrollEl.innerHTML = `
    <div class="sidebar-section">Workspaces</div>
    ${primaryHtml}
    <div class="sidebar-section" style="margin-top:6px;">Saved Views</div>
    ${savedHtml}
    <div class="sidebar-section" style="margin-top:6px;">Account</div>
    ${accountHtml}
  `;

  topNavEl.innerHTML = workspaceRoutes
    .map(
      (r) => `<a class="topnav-pill" href="#/${encodeURIComponent(r.id)}" data-top="${escAttr(r.id)}">
          <span class="material-symbols-rounded">${r.icon}</span>
          <span class="topnav-pill-label">${escAttr(r.label)}</span>
        </a>`
    )
    .join('');
}
