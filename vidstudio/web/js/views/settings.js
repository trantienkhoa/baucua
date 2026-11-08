// Trang "Cài đặt": AI dịch & API key, dịch, giọng đọc, xoá sub, xuất video, công thức, kiểm tra máy.
import { api, icon, esc, $, $$, toast, confirmBox, promptBox } from '../ui.js';
import { state, voices as voiceList } from '../main.js';

let root, s, keys, isDefault;

export async function mount(el) {
  root = el;
  const data = await api('/api/settings');
  s = data.settings; keys = data.keys; isDefault = data.is_default;
  render();
  loadSystem();
}

function keyRow(prov, label, url) {
  const href = url || state.meta.tts_providers?.[prov]?.key_url || '';
  return `<div class="field"><span class="small muted">${esc(label)}${href ? ` · <a href="${href}" target="_blank" rel="noopener">lấy key</a>` : ''}</span>
    <div class="row" style="margin-top:6px"><input type="password" id="key-${prov}" class="grow" style="width:auto" placeholder="${keys[prov] ? 'Đã lưu: ' + esc(keys[prov]) : 'Dán key'}">
    <button class="btn sm" data-save-key="${prov}">${keys[prov] ? 'Đổi' : 'Lưu'}</button></div></div>`;
}

function sw(id, on) { return `<label class="switch"><input type="checkbox" data-k="${id}" ${on ? 'checked' : ''}><i></i></label>`; }
function trow(id, title, desc) { return `<div class="toggle-row"><div class="grow"><b>${title}</b>${desc ? `<span>${desc}</span>` : ''}</div>${sw(id, s[id])}</div>`; }

function render() {
  const free = s.free_only !== false;
  const P = Object.fromEntries(Object.entries(state.meta.providers).filter(([, v]) => !free || v.free));
  if (!P[s.translator]) s.translator = 'google'; // chế độ miễn phí: bỏ lựa chọn trả phí
  const cur = s.translator; const pv = P[cur];
  const usingKey = pv.key ? (keys[cur] ? `Đang dùng ${pv.label}` : `Chưa có key ${pv.label}`) : `Đang dùng ${pv.label}`;
  root.innerHTML = `
  <div class="page page-narrow">
    <div class="eyebrow">Cài đặt</div><h1>Thiết lập VieDub</h1>
    <p class="lead">Áp dụng cho mọi video mới. Từng video vẫn có thể chỉnh riêng trong Studio.</p>

    <div class="card">
      <div class="toggle-row" style="margin:-4px 0 14px;padding:12px 14px;border-radius:12px;background:${free ? 'rgba(76,195,138,.1)' : 'var(--bg2)'}">
        <div class="grow"><b>Chế độ miễn phí 100%</b><span>${free ? 'Chỉ dùng dịch vụ không tốn tiền: Google dịch, Gemini gói miễn phí, Ollama, dịch offline, giọng Edge và giọng offline. App không bao giờ gọi dịch vụ trả phí.' : 'Đang hiện cả dịch vụ trả phí (Claude, OpenAI, DeepSeek, FPT.AI, ElevenLabs) — có thể phát sinh chi phí theo tài khoản của bạn.'}</span></div>
        <label class="switch"><input type="checkbox" id="free-only" ${free ? 'checked' : ''}><i></i></label></div>
      <div class="card-head">${icon('key')}<h2>Kết nối AI dịch</h2><span class="pill ${pv.key && !keys[cur] ? 'red' : 'green'} right">${usingKey}</span></div>
      <div class="option-grid">${Object.entries(P).map(([k, v]) => `<button class="option ${k === cur ? 'active' : ''}" data-prov="${k}"><b>${esc(v.label)} ${v.free ? '<span class="pill green" style="font-size:10px">miễn phí</span>' : '<span class="pill red" style="font-size:10px">trả phí</span>'} ${keys[k] ? '<span class="pill blue" style="font-size:10px">có key</span>' : ''}</b><span>${esc(v.desc)}</span></button>`).join('')}</div>
      ${pv.key ? `<div class="row" style="margin-top:14px"><input type="password" id="key" class="grow" style="width:auto" placeholder="${keys[cur] ? 'Đã lưu: ' + esc(keys[cur]) + ' — dán key mới để thay' : 'Dán API key vào đây'}">
        <button class="btn primary" id="save-key">${icon('key', 16)} Lưu key</button><button class="btn" id="test">${icon('send', 16)} Dịch thử</button>
        ${keys[cur] ? `<button class="btn ghost danger" id="del-key">Xoá key</button>` : ''}</div>
        <p class="small dim" style="margin-bottom:0">Lấy key tại <a href="${pv.key_url}" target="_blank" rel="noopener">${pv.key_url.replace('https://', '')}</a>. Key chỉ lưu trên máy này (keys.json) và chỉ gửi tới chính nhà cung cấp đó.</p>`
      : `<div class="row" style="margin-top:14px">${cur === 'ollama' ? `<input type="text" data-k="ollama_url" value="${esc(s.ollama_url)}" class="grow" style="width:auto">` : '<span class="grow small muted">Không cần key.</span>'}<button class="btn" id="test">${icon('send', 16)} Dịch thử</button></div>`}
      <div id="test-out" class="small" style="margin-top:8px"></div>
    </div>

    <div class="grid2" style="margin-top:16px;align-items:start">
      <div>
        <div class="card">
          <div class="card-head">${icon('globe')}<h2>Dịch</h2></div>
          ${pv.model !== '' ? `<label class="field"><span>Model ${esc(pv.label)}</span><input type="text" data-model="${cur}" value="${esc(s.models[cur] || pv.model)}"></label>` : ''}
          ${cur === 'claude' ? `<label class="field"><span>Mức suy nghĩ (effort) — cao hơn dịch kỹ hơn nhưng chậm và tốn hơn</span><select data-k="claude_effort">${['low', 'medium', 'high'].map(v => `<option ${s.claude_effort === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}
          <label class="field"><span>Văn phong</span><input type="text" data-k="style_prompt" value="${esc(s.style_prompt)}"></label>
          <label class="field"><span>Bảng thuật ngữ (mỗi dòng: gốc = dịch)</span><textarea data-k="glossary" rows="4" placeholder="老板 = sếp&#10;卢比 = rupee">${esc(s.glossary)}</textarea></label>
          <div class="grid2" style="gap:10px">
            <label class="field"><span>Ngôn ngữ gốc</span><select data-k="source_lang">${[['zh', 'Tiếng Trung'], ['en', 'Tiếng Anh'], ['ja', 'Tiếng Nhật'], ['ko', 'Tiếng Hàn'], ['th', 'Tiếng Thái'], ['auto', 'Tự nhận']].map(([v, l]) => `<option value="${v}" ${s.source_lang === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span>Nhận dạng theo lô (nhanh hơn trên GPU)</span><select data-k="asr_batched">${[['auto', 'Tự động (bật khi có GPU)'], ['on', 'Luôn bật'], ['off', 'Tắt']].map(([v, l]) => `<option value="${v}" ${s.asr_batched === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span>Số lô dịch gửi cùng lúc</span><input type="number" data-k="parallel_translate" min="1" max="8" value="${s.parallel_translate}"></label>
            <label class="field"><span>Nhận dạng giọng (Whisper)</span><select data-k="asr_model">${[['tiny', 'tiny — rất nhanh'], ['base', 'base'], ['small', 'small — cân bằng'], ['medium', 'medium — chính xác'], ['large-v3-turbo', 'large-v3-turbo — tốt nhất (GPU)'], ['large-v3', 'large-v3']].map(([v, l]) => `<option value="${v}" ${s.asr_model === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          </div>
        </div>
        <div class="card">
          <div class="card-head">${icon('mic')}<h2>Giọng đọc</h2></div>
          ${trow('dub', 'Lồng tiếng Việt', 'Tắt: chỉ làm phụ đề, giữ tiếng gốc')}
          <label class="field"><span>Giọng mặc định</span><select data-k="voice_default"><option value="auto" ${s.voice_default === 'auto' ? 'selected' : ''}>Tự theo người nói (Nam/Nữ)</option>${voiceList().map(v => `<option value="${v.id}" ${s.voice_default === v.id ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
          <div class="kv"><span>Tiếng gốc lúc có giọng Việt</span><b class="mono">${Math.round(s.orig_volume * 100)}%</b></div>
          <input type="range" data-k="orig_volume" min="0" max="1" step="0.01" value="${s.orig_volume}">
          <div class="kv" style="margin-top:10px"><span>Tự tăng tốc tối đa</span><b class="mono">${(+s.max_speed).toFixed(2)}x</b></div>
          <input type="range" data-k="max_speed" min="1" max="2" step="0.05" value="${s.max_speed}">
          ${trow('separate_music', 'Tách nhạc nền', 'Giữ nhạc, bỏ giọng gốc (cài audio-separator)')}
          ${trow('ducking', 'Tiếng gốc to lại lúc không có lời', 'Thanh phía trên là âm lượng lúc đang có giọng Việt')}
          ${trow('loudnorm', 'Chuẩn âm lượng mạng xã hội (-14 LUFS)')}
          ${trow('auto_shorten', 'Tự rút gọn câu đọc không kịp', 'Gemini/Ollama: AI viết lại câu. Google dịch/offline: bỏ từ đệm theo luật (miễn phí)')}
          <div class="sep"></div>
          <h3>Giọng offline (miễn phí, không cần mạng)</h3>
          ${trow('tts_offline_fallback', 'Tự đọc bằng giọng offline khi Edge lỗi / mất mạng')}
          <div class="row" style="margin-bottom:8px"><span class="grow small muted" id="piper-status">Đang kiểm tra…</span>
            <button class="btn sm" id="dl-voice">${icon('download', 14)} Tải giọng offline (~60 MB)</button></div>
          ${free ? '' : `<div class="sep"></div>
          <h3>Giọng trả phí (tuỳ chọn)</h3>
          ${keyRow('fpt', 'FPT.AI — 9 giọng Việt ba miền')}
          ${keyRow('eleven', 'ElevenLabs — giọng clone của bạn')}
          <label class="field"><span>Giọng ElevenLabs (mỗi dòng: Tên = voice_id)</span><textarea data-k="eleven_voices" rows="2" placeholder="Giọng tôi = 21m00Tcm4TlvDq8ikWAM">${esc(s.eleven_voices)}</textarea></label>
          <p class="small dim">Giọng OpenAI dùng chung key OpenAI ở phần AI dịch. Sau khi thêm giọng, tải lại trang để thấy trong danh sách.</p>`}
          <div class="sep"></div>
          ${trow('diarize', 'Phân biệt người nói (pyannote)', 'Mỗi người một nhãn A, B… để gán giọng riêng. Cần pip install pyannote.audio')}
          ${keyRow('huggingface', 'Token Hugging Face cho pyannote', 'https://huggingface.co/pyannote/speaker-diarization-3.1')}
        </div>
        <div class="card">
          <div class="card-head">${icon('image')}<h2>Xoá sub gốc & xuất video</h2></div>
          <label class="field"><span>Cách xoá sub gốc</span><select data-k="hardsub">${[['none', 'Giữ nguyên'], ['blur', 'Làm mờ'], ['inpaint', 'Vẽ lại nền (sạch nhất)'], ['box', 'Che hộp đen'], ['crop', 'Cắt bỏ phần dưới']].map(([v, l]) => `<option value="${v}" ${s.hardsub === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          ${trow('auto_detect_region', 'Tự dò vùng sub bằng OCR', 'Cần rapidocr-onnxruntime')}
          <div class="toggle-row"><div class="grow"><b>Chỉ làm mờ lúc có sub gốc</b><span>Dò bằng OCR; tắt để làm mờ suốt video</span></div>
            <label class="switch"><input type="checkbox" id="timing" ${s.hardsub_timing !== 'always' ? 'checked' : ''}><i></i></label></div>
          ${trow('burn_subs', 'Chèn phụ đề tiếng Việt')}
          <label class="field"><span>Khung hình</span><select data-k="output_ratio">${[['source', 'Như gốc'], ['9:16', '9:16'], ['1:1', '1:1'], ['16:9', '16:9'], ['4:5', '4:5']].map(([v, l]) => `<option value="${v}" ${s.output_ratio === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Bộ mã hoá</span><select data-k="encoder"><option value="auto" ${s.encoder === 'auto' ? 'selected' : ''}>Tự chọn (GPU nếu có)</option><option value="h264_nvenc" ${s.encoder === 'h264_nvenc' ? 'selected' : ''}>GPU NVIDIA</option><option value="libx264" ${s.encoder === 'libx264' ? 'selected' : ''}>CPU</option></select></label>
          ${trow('flip', 'Lật ngang video', 'Hạn chế bị quét trùng nội dung')}
          <label class="field"><span>File cookies (tuỳ chọn, giúp tải Douyin / video cần đăng nhập)</span><input type="text" data-k="cookies_file" value="${esc(s.cookies_file)}" placeholder="C:\\cookies.txt"></label>
        </div>
      </div>
      <div>
        <div class="card"><div class="card-head">${icon('cpu')}<h2>Máy của bạn</h2><button class="icon-btn right" id="recheck" title="Kiểm tra lại">${icon('refresh', 16)}</button></div><div id="sys"><span class="spinner"></span></div></div>
        <div class="card">
          <div class="card-head">${icon('sparkle')}<h2>Công thức</h2></div>
          <p class="small muted" style="margin-top:0">Lưu bộ cài đặt hiện tại (dịch, giọng, kiểu phụ đề, khung hình…) để chọn nhanh khi tạo video.</p>
          ${Object.keys(s.recipes || {}).map(r => `<div class="row" style="margin-bottom:6px"><span class="grow">${esc(r)}</span><button class="btn sm ghost danger" data-del-recipe="${esc(r)}">Xoá</button></div>`).join('') || '<p class="small dim">Chưa có công thức.</p>'}
          <button class="btn sm" id="add-recipe">${icon('plus', 14)} Lưu thành công thức</button>
        </div>
        <div class="card">
          <div class="card-head">${icon('sliders')}<h2>Khác</h2></div>
          <div class="about">${icon('sparkle', 16)}<div><b>VieDub Studio ${esc(state.meta.version)}</b><span>Tác giả: <b>${esc(state.meta.author)}</b></span></div></div>
          ${trow('notify', 'Chuông báo khi video xong')}
          <p class="small dim">Dữ liệu: <span class="mono">${esc(state.meta.data_dir)}</span><br>Video đã xuất: <span class="mono">${esc(state.meta.exports_dir)}</span><br>File cấu hình: <span class="mono">${esc(state.meta.config_file)}</span></p>
          <button class="btn sm" id="open-exports">${icon('folder', 14)} Mở thư mục video</button>
        </div>
      </div>
    </div>
    <div class="row" style="position:sticky;bottom:0;background:var(--bg);padding:14px 0;margin-top:16px;border-top:1px solid var(--line)">
      <span class="muted small" id="state">${isDefault ? 'Đang dùng giá trị mặc định' : 'Đã có cài đặt riêng'}</span>
      <button class="btn ghost right" id="reset">${icon('undo', 16)} Về mặc định</button>
      <button class="btn primary" id="save">${icon('save', 16)} Lưu cài đặt</button>
    </div>
  </div>`;
  bind();
}

function bind() {
  root.oninput = e => {
    const k = e.target.dataset.k; const m = e.target.dataset.model;
    if (m) s.models[m] = e.target.value;
    if (!k) return;
    s[k] = e.target.type === 'checkbox' ? e.target.checked : ['range', 'number'].includes(e.target.type) ? +e.target.value : e.target.value;
    if (e.target.type === 'range') { const b = e.target.previousElementSibling?.querySelector('b'); if (b) b.textContent = k === 'orig_volume' ? Math.round(s[k] * 100) + '%' : s[k].toFixed(2) + 'x'; }
    $('#state', root).innerHTML = '<span style="color:var(--yellow)">● Chưa lưu</span>';
  };
  root.onchange = async e => {
    if (e.target.id === 'free-only') {
      s.free_only = e.target.checked;
      await saveAll(true); render(); loadSystem();
      toast(s.free_only ? 'Đã bật chế độ miễn phí 100%' : 'Đã hiện cả dịch vụ trả phí', 'ok');
      return;
    }
    if (e.target.id === 'timing') { s.hardsub_timing = e.target.checked ? 'auto' : 'always'; $('#state', root).innerHTML = '<span style="color:var(--yellow)">● Chưa lưu</span>'; return; }
    root.oninput(e);
  };
  root.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.prov) { s.translator = b.dataset.prov; render(); loadSystem(); $('#state', root).innerHTML = '<span style="color:var(--yellow)">● Chưa lưu</span>'; return; }
    if (b.dataset.delRecipe) { const r = await api('/api/recipes/' + encodeURIComponent(b.dataset.delRecipe), { method: 'DELETE' }); s.recipes = r.recipes; state.settings.recipes = r.recipes; render(); loadSystem(); return; }
    if (b.dataset.saveKey) {
      const prov = b.dataset.saveKey; const v = $(`#key-${prov}`, root).value.trim();
      keys = (await api('/api/keys', { method: 'POST', body: { provider: prov, key: v } })).keys;
      toast(v ? 'Đã lưu key' : 'Đã xoá key', 'ok'); render(); loadSystem(); return;
    }
    switch (b.id) {
      case 'dl-voice': {
        b.disabled = true; b.innerHTML = '<span class="spinner"></span> Đang tải…';
        try { await api('/api/voices/download', { method: 'POST', body: {} }); toast('Đã tải giọng offline', 'ok'); } catch (err) { toast(err.message, 'error'); }
        loadVoices(); break;
      }
      case 'save-key': {
        const v = $('#key', root).value.trim(); if (!v) return toast('Dán key trước đã', 'error');
        keys = (await api('/api/keys', { method: 'POST', body: { provider: s.translator, key: v } })).keys;
        await saveAll(true); toast('Đã lưu key', 'ok'); render(); loadSystem(); break;
      }
      case 'del-key': if (await confirmBox('Xoá key?', 'Key sẽ bị xoá khỏi máy này.', 'Xoá', true)) { keys = (await api('/api/keys', { method: 'POST', body: { provider: s.translator, key: '' } })).keys; render(); loadSystem(); } break;
      case 'test': {
        const out = $('#test-out', root); out.innerHTML = '<span class="spinner"></span> Đang dịch thử “你好，今天我们来尝尝这家店。”…';
        const r = await api('/api/test-translate', { method: 'POST', body: { provider: s.translator, model: s.models[s.translator] } });
        out.innerHTML = r.ok ? `<span style="color:var(--green)">✓ ${esc(r.text)}</span>` : `<span style="color:var(--red)">✗ ${esc(r.error)}</span>`; break;
      }
      case 'save': await saveAll(); break;
      case 'reset': if (await confirmBox('Về mặc định?', 'Toàn bộ cài đặt (trừ API key) trở về mặc định.', 'Đồng ý')) { s = (await api('/api/settings/reset', { method: 'POST' })).settings; state.settings = s; isDefault = true; render(); loadSystem(); toast('Đã về mặc định'); } break;
      case 'recheck': loadSystem(); break;
      case 'open-exports': { const r = await api('/api/open-folder', { method: 'POST', body: {} }); if (!r.ok) toast('Thư mục: ' + r.path); break; }
      case 'add-recipe': {
        const name = await promptBox('Tên công thức', '', 'Ví dụ: Ẩm thực — giọng nữ, 9:16'); if (!name) return;
        await saveAll(true);
        const r = await api('/api/recipes', { method: 'POST', body: { name } }); s.recipes = r.recipes; state.settings.recipes = r.recipes; render(); loadSystem(); toast('Đã lưu công thức', 'ok'); break;
      }
    }
  };
}

async function saveAll(quiet) {
  const r = await api('/api/settings', { method: 'PUT', body: s });
  s = r.settings; state.settings = s; isDefault = false;
  const el = $('#state', root); if (el) el.textContent = 'Đã lưu';
  if (!quiet) toast('Đã lưu cài đặt', 'ok');
}

async function loadVoices() {
  const el = $('#piper-status', root); if (!el) return;
  try {
    const r = await api('/api/voices/status');
    const btn = $('#dl-voice', root);
    if (!r.piper) { el.textContent = 'Chưa cài: pip install piper-tts'; if (btn) btn.hidden = true; return; }
    el.textContent = r.downloaded.length ? `Đã có giọng: ${r.downloaded.join(', ')}` : 'Chưa tải giọng nào (app sẽ tự tải khi cần lần đầu)';
    if (btn) { btn.hidden = r.downloaded.length > 0; btn.disabled = false; }
  } catch { el.textContent = ''; }
}

async function loadSystem() {
  loadVoices();
  const box = $('#sys', root); if (!box) return;
  box.innerHTML = '<span class="spinner"></span>';
  const items = await api('/api/system');
  if (!box.isConnected) return;
  box.innerHTML = items.map(i => `<div class="sys-item"><span class="dot ${i.ok ? 'ok' : i.optional ? 'no' : 'bad'}">${i.ok ? '✓' : i.optional ? '–' : '!'}</span>
    <div><div>${esc(i.name)}</div>${!i.ok && i.hint ? `<div class="small dim">${i.optional ? 'Không bắt buộc. ' : ''}${esc(i.hint)}</div>` : ''}</div></div>`).join('');
}
