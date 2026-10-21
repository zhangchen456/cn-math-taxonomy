(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const CN = ['', '一', '二', '三', '四', '五', '六'];
  const state = { subject: new URLSearchParams(location.search).get('subject') === 'english' ? 'english' : 'math', grade: 1, term: '上', search: '', shown: 8 };
  let topics = [], questions = [], selectedTopic, round = [], index = 0, correct = 0, results = [], progress = {};
  const storageKey = 'island.progress.v1';
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) progress = saved;
    const prefs = JSON.parse(localStorage.getItem('island.preferences'));
    if (prefs) {
      if ([1,2,3,4,5,6].includes(prefs.grade)) state.grade = prefs.grade;
      if (['上','下','all'].includes(prefs.term)) state.term = prefs.term;
    }
  } catch (_) {}
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const isEnglish = t => t.subject === 'english' || t.id.startsWith('cne_');
  const subjectQuery = () => state.subject === 'english' ? '?subject=english' : '';
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch (_) {} }
  function setPreferences() { try { localStorage.setItem('island.preferences', JSON.stringify({grade:state.grade,term:state.term})); } catch (_) {} }
  function updateStats() {
    const entries = Object.values(progress).filter(p => p && typeof p === 'object');
    $('completed-count').textContent = entries.filter(p => p.completed).length;
    $('attempt-count').textContent = entries.reduce((n,p) => n + (Number(p.attempts) || 0),0);
    const recent = Object.keys(progress).filter(id => topics.some(t => t.id === id)).sort((a,b) => (Number(progress[b].updated) || 0) - (Number(progress[a].updated) || 0))[0];
    if (recent) {
      const topic = topics.find(t => t.id === recent);
      $('badge-detail').textContent = '今天也向前走了一小步';
      $('continue-note').textContent = '上次探索：' + topic.name;
      $('continue-button').hidden = false;
      $('continue-button').onclick = () => openTopic(topic);
    }
  }
  function render() {
    const minGrade = state.subject === 'english' ? 3 : 1;
    if (state.grade < minGrade) state.grade = minGrade;
    $('grade').innerHTML = CN.slice(minGrade).map((name,i) => '<option value="' + (i+minGrade) + '">' + name + '年级</option>').join('');
    $('grade').value = state.grade;
    document.querySelectorAll('[data-subject]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.subject === state.subject)));
    document.querySelectorAll('[data-term]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.term === state.term)));
    ['map-link','advanced-map'].forEach(id => $(id).href = 'explore/' + subjectQuery());
    $('diagnose-link').href = 'diagnose/' + subjectQuery();
    const filtered = topics.filter(t => !t.external && isEnglish(t) === (state.subject === 'english') && t.grade === state.grade && (state.term === 'all' || t.semester === state.term || !t.semester) && (t.name + ' ' + t.chapter).toLowerCase().includes(state.search.toLowerCase()));
    $('topic-count').textContent = CN[state.grade] + '年级 · ' + filtered.length + ' 座学习小岛';
    const icons = { '数与代数':'🧩', '图形与几何':'📐', '统计与概率':'📊', '综合与实践':'🧭' };
    $('topic-grid').replaceChildren();
    filtered.slice(0,state.shown).forEach(t => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'topic-card'; button.dataset.topic = t.id;
      const record = progress[t.id];
      button.innerHTML = '<span class="topic-icon" aria-hidden="true">' + (isEnglish(t) ? '🔤' : icons[t.domain] || '🧩') + '</span><span class="topic-arrow" aria-hidden="true">↗</span><strong>' + escape(t.name) + '</strong><small>' + escape(t.chapter?.replace(/^[一二三四五六]年级[上下]册\s*/, '') || t.domain) + '</small><span class="topic-status">' + (record?.completed ? '⚑ 已探索 · 可以再练一练' : record?.draft ? '◔ 有未完成的探索' : '开始探索 →') + '</span>';
      button.onclick = () => openTopic(t); $('topic-grid').append(button);
    });
    if (!filtered.length) $('topic-grid').innerHTML = '<p class="topic-empty">没有找到这座小岛。换个关键词，或选择「全部」册次看看吧。</p>';
    $('topic-grid').setAttribute('aria-busy','false');
    $('show-more').hidden = filtered.length <= state.shown;
    setPreferences(); updateStats();
  }
  function recordDraft() {
    const previous = progress[selectedTopic.id] || {};
    progress[selectedTopic.id] = {...previous, updated:Date.now(), draft:{ids:round.map(q => q.id), index, correct, results}};
    save();
  }
  function openTopic(topic, restart = false) {
    selectedTopic = topic;
    const available = questions.filter(q => q.topicId === topic.id);
    const draft = !restart && progress[topic.id]?.draft;
    if (draft && Array.isArray(draft.ids) && Number.isInteger(draft.index) && draft.index >= 0 && draft.index < draft.ids.length && draft.ids.every(id => available.some(q => q.id === id))) {
      round = draft.ids.map(id => available.find(q => q.id === id)); index = draft.index; correct = Number(draft.correct) || 0; results = Array.isArray(draft.results) ? draft.results.slice(0,index) : [];
    } else { round = available.slice(0,4); index = 0; correct = 0; results = []; }
    const dialog = $('practice-dialog'); if (!dialog.open) dialog.showModal();
    if (!round.length) {
      $('practice-content').innerHTML = '<h2 id="practice-title">' + escape(topic.name) + '</h2><p>' + escape(topic.description) + '</p><p>这座小岛还没有短练习，可以先看看知识地图。</p><a class="practice-primary" href="explore/' + subjectQuery() + '#' + encodeURIComponent(topic.id) + '">打开知识地图 →</a>';
      return;
    }
    recordDraft(); renderQuestion();
  }
  function renderQuestion() {
    const q = round[index];
    $('practice-content').innerHTML = '<div class="practice-meta">' + escape(selectedTopic.name) + ' · 第 ' + (index+1) + ' / ' + round.length + ' 题</div><div class="practice-progress" aria-label="练习进度"><span style="width:' + (index/round.length*100) + '%"></span></div><h2 id="practice-title">' + escape(q.prompt) + '</h2><form id="practice-form">' + (q.type === 'choice' ? '<fieldset class="practice-choices"><legend class="practice-small">选一个你认为正确的答案</legend>' + q.choices.map(c => '<label><input type="radio" name="answer" value="' + escape(c.key) + '"><span>' + escape(c.key) + ' · ' + escape(c.text) + '</span></label>').join('') + '</fieldset>' : '<label class="practice-small" for="practice-answer">' + (q.type === 'self' ? '可以写下你的思路' : '把答案写在这里') + '</label><input class="practice-input" id="practice-answer" name="answer" autocomplete="off" placeholder="' + (q.type === 'numeric' ? '例如：4 或 1/2' : '你的答案') + '">') + '<div class="answer-notice" id="answer-notice" role="status"></div><div class="practice-actions"><button class="practice-primary" type="submit">' + (q.type === 'self' ? '看看参考思路' : '我答好了 ✓') + '</button><button class="practice-secondary" type="button" id="show-answer">还没想好，看看解析</button></div></form><div id="question-feedback" aria-live="polite"></div><p class="practice-small">没有倒计时，慢慢想就好。关闭后可以回来继续。</p>';
    $('practice-form').onsubmit = e => {
      e.preventDefault(); const answer = new FormData(e.target).get('answer')?.trim() || '';
      if (!answer && q.type !== 'self') { $('answer-notice').textContent = '先选一个选项，或写下答案吧。还没想好也可以看看解析。'; return; }
      const judgment = window.DiagEngine.judgeQuestion(q,answer);
      showFeedback(judgment.verdict);
    };
    $('show-answer').onclick = () => showFeedback('skip');
    if (q.type !== 'choice') $('practice-answer').focus();
  }
  function showFeedback(verdict) {
    const q = round[index];
    $('practice-form').querySelectorAll('button,input').forEach(el => el.disabled = true);
    const title = verdict === 'correct' ? '答对啦！又发现了一点新本领 ✦' : verdict === 'manual' ? '看看参考思路，给自己一个判断' : '一起看看，下一步怎么想 🌱';
    $('question-feedback').innerHTML = '<div class="feedback"><h3>' + title + '</h3><p>参考答案：' + escape(q.answer) + '</p><p>' + escape(q.explanation || '') + '</p></div>' + (verdict === 'manual' ? '<p class="practice-small">这道题需要你对照参考答案自己判断。</p><div class="practice-actions"><button class="practice-primary" id="self-correct">我的思路对了</button><button class="practice-secondary" id="self-learning">我还要练一练</button></div>' : '<button class="practice-primary" id="next-question">' + (index === round.length-1 ? '收下这次的探索印记 ⚑' : '继续下一题 →') + '</button>');
    const advance = result => {
      if (result === 'correct') correct++;
      results.push(result);
      const previous = progress[selectedTopic.id] || {};
      progress[selectedTopic.id] = {...previous, attempts:(Number(previous.attempts)||0)+1};
      index++;
      if (index === round.length) finish(); else { recordDraft(); renderQuestion(); }
    };
    if (verdict === 'manual') { $('self-correct').onclick = () => advance('correct'); $('self-learning').onclick = () => advance('learning'); }
    else $('next-question').onclick = () => advance(verdict);
    $('question-feedback').querySelector('button').focus();
  }
  function finish() {
    progress[selectedTopic.id] = {...progress[selectedTopic.id], completed:true, updated:Date.now(), lastCorrect:correct, lastTotal:round.length, draft:null};
    save(); render();
    const href = 'diagnose/?target=' + encodeURIComponent(selectedTopic.id) + (isEnglish(selectedTopic) ? '&subject=english' : '');
    $('practice-content').innerHTML = '<div class="celebration" aria-hidden="true">⚑ ✦</div><span class="eyebrow">ONE LITTLE STEP, ONE NEW DISCOVERY</span><h2 id="practice-title">又探索了一座小岛！</h2><p>你完成了「' + escape(selectedTopic.name) + '」的 ' + round.length + ' 道练习，其中 ' + correct + ' 道答对或自评正确。认真尝试的你，值得一枚探索印记。</p><p class="practice-small">完成练习不代表已经掌握。' + (correct < round.length ? '还有不明白的地方，可以让我们陪你往前找一找。' : '可以过一阵再来试试，看看是否记得牢。') + '</p><div class="practice-actions"><button class="practice-primary" id="back-island">回到我的小岛</button><a class="practice-secondary" href="' + href + '">陪我想一想 →</a><button class="practice-secondary" id="retry-topic">再练一次</button></div>';
    $('back-island').onclick = () => $('practice-dialog').close();
    $('retry-topic').onclick = () => openTopic(selectedTopic,true);
    $('back-island').focus();
  }
  document.querySelectorAll('.dialog-close').forEach(b => b.onclick = () => b.closest('dialog').close());
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if(e.target === d) d.close(); }));
  $('practice-dialog').addEventListener('close',render);
  $('parent-button').onclick = () => $('parent-dialog').showModal();
  document.querySelectorAll('[data-subject]').forEach(b => b.onclick = () => {
    state.subject = b.dataset.subject; state.search = ''; state.shown = 8; $('topic-search').value = '';
    history.replaceState(null,'',location.pathname + subjectQuery()); render();
  });
  document.querySelectorAll('[data-term]').forEach(b => b.onclick = () => { state.term = b.dataset.term; state.shown = 8; render(); });
  $('grade').onchange = e => { state.grade = Number(e.target.value); state.shown = 8; render(); };
  $('topic-search').oninput = e => { state.search = e.target.value.trim(); state.shown = 8; render(); };
  $('show-more').onclick = () => { state.shown += 8; render(); };
  Promise.all(['topics','questions'].map(name => fetch('data/' + name + '.json').then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }))).then(data => {
    if (!data.every(Array.isArray)) throw new Error('Unexpected data');
    [topics,questions] = data; render();
  }).catch(() => { $('load-error').hidden = false; $('topic-count').textContent = '暂时无法连接学习小岛'; $('topic-grid').setAttribute('aria-busy','false'); });
})();
