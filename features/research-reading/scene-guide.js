// Optional reading-only UI. Registry-rendered cards are the only direction map.
(() => {
const guide = document.getElementById('scene-guide');
if (guide) {
  const roles = [...guide.querySelectorAll('[data-scene-role]')];
  const panels = [...guide.querySelectorAll('[data-scene-panel]')];
  const positions = [...guide.querySelectorAll('[data-scene-position]')];
  const cards = [...document.querySelectorAll('.direction-card')];
  const status = document.getElementById('scene-status');
  const jump = document.getElementById('scene-jump');
  const prediction = guide.querySelector('[data-scene-prediction]');
  const pressed = (buttons, selected, key) => buttons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset[key] === selected));
  });
  function selectRole(role) {
    pressed(roles, role, 'sceneRole');
    panels.forEach(panel => { panel.hidden = Boolean(role) && panel.dataset.scenePanel !== role; });
  }
  function selectPosition(position) {
    pressed(positions, position, 'scenePosition');
    const matches = [];
    cards.forEach(card => {
      const match = Boolean(position) && (card.dataset.scenePositions || '').split(/\s+/).includes(position);
      card.classList.toggle('scene-selected', match);
      const badge = card.querySelector('.scene-match');
      if (badge) badge.hidden = !match;
      if (match) matches.push(card);
    });
    const chosen = positions.find(button => button.dataset.scenePosition === position);
    status.textContent = !position ? '' : matches.length
      ? `${chosen?.dataset.sceneLabel || '所选环节'}：已标出 ${matches.length} 个主要入口，全部方向仍可阅读。`
      : '此环节暂未标注对应方向；全部方向仍可阅读。';
    jump.hidden = matches.length === 0;
    if (matches.length) jump.setAttribute('href', '#' + matches[0].id);
    else jump.removeAttribute('href');
  }
  roles.forEach(button => button.addEventListener('click', () => selectRole(button.dataset.sceneRole)));
  positions.forEach(button => button.addEventListener('click', () => selectPosition(button.dataset.scenePosition)));
  document.getElementById('scene-reset').addEventListener('click', () => {
    selectRole('');
    selectPosition('');
    prediction.open = false;
  });
  selectRole('');
  selectPosition('');
  guide.querySelectorAll('[data-scene-controls]').forEach(control => { control.hidden = false; });
}
})();
