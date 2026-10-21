/* The theme is shared by the child dashboard, graph and diagnostic views. */
(function () {
  'use strict';
  const themes = {
    blocks: { name: '方块世界', title: '把好奇心，<br>搭成大大的世界。', description: '带上你的想象力，和方块伙伴一起，<br>收集藏在知识里的小惊喜。', caption: '下一块宝藏，等你发现' },
    hero: { name: '光之英雄', title: '小小的你，<br>也有大大的能量。', description: '和光之伙伴一起踏上星际旅程，<br>每一次尝试，都是一束勇气的光。', caption: '勇气能量，正在集结' },
    snow: { name: '冰雪王国', title: '让每个发现，<br>像雪花一样闪亮。', description: '穿过闪闪发光的冰雪森林，<br>和雪精灵一起解开知识的小秘密。', caption: '冰雪里的秘密，等你解开' }
  };
  let current = 'blocks';
  try { const saved = localStorage.getItem('island.theme'); if (themes[saved]) current = saved; } catch (_) {}
  document.documentElement.dataset.theme = current;
  function apply(id) {
    if (!themes[id]) return;
    current = id;
    document.documentElement.dataset.theme = id;
    try { localStorage.setItem('island.theme', id); } catch (_) {}
    document.querySelectorAll('[data-theme-choice]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === id)));
    const theme = themes[id];
    const tag = document.getElementById('world-tag'); if (tag) tag.textContent = '0' + (Object.keys(themes).indexOf(id) + 1) + ' / ' + theme.name;
    const title = document.getElementById('hero-title'); if (title) title.innerHTML = theme.title;
    const desc = document.getElementById('hero-desc'); if (desc) desc.innerHTML = theme.description;
    const caption = document.getElementById('scene-caption'); if (caption) caption.textContent = theme.caption;
    const activeName = document.getElementById('active-world'); if (activeName) activeName.textContent = '已进入' + theme.name;
    document.dispatchEvent(new CustomEvent('island:theme', { detail: id }));
  }
  document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.createElement('dialog'); dialog.className = 'theme-dialog'; dialog.id = 'theme-dialog';
    dialog.setAttribute('aria-labelledby', 'theme-dialog-title');
    dialog.innerHTML = '<button class="dialog-close" type="button" aria-label="关闭主题选择">×</button><span class="eyebrow">PICK YOUR LITTLE WORLD</span><h2 id="theme-dialog-title">今天，想去哪个世界？</h2><p>换一个喜欢的世界，带着好奇心出发。</p><div class="theme-options">' + Object.entries(themes).map(([id, theme], i) => '<button type="button" data-theme-choice="' + id + '"><span>' + ['🌳', '🚀', '❄️'][i] + '</span><strong>' + theme.name + '</strong><small>' + ['自由搭建，快乐探索', '收集勇气，点亮星空', '冰雪奇遇，闪亮成长'][i] + '</small></button>').join('') + '</div><p id="active-world" role="status"></p>';
    document.body.append(dialog);
    dialog.querySelector('.dialog-close').onclick = () => dialog.close();
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    if (!document.querySelector('.theme-trigger')) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'theme-trigger'; button.textContent = '🎨 换个世界';
      document.querySelector('.site-header')?.append(button);
    }
    document.querySelectorAll('.theme-trigger').forEach(b => b.onclick = () => dialog.showModal());
    document.querySelectorAll('[data-theme-choice]').forEach(b => b.addEventListener('click', () => apply(b.dataset.themeChoice)));
    apply(current);
  });
  window.IslandThemes = { apply, themes };
})();
