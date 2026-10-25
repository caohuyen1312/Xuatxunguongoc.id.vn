/* XuatXu FINAL: render only sourced retail profiles; cover previews are not passports. */
const main = document.querySelector('#main');
const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modal-body');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr = esc;
const safeUrl = value => /^https:\/\//.test(value || '') || /^\/static\//.test(value || '') ? esc(value) : '';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').toLowerCase();
const names = {'P-ENVY-VICHI-01':'Táo ENVY · túi 1 kg','P-ZESPRI-VICHI-01':'Kiwi vàng Zespri · hộp 4 quả'};
const sourceScope = scope => /OTHER_RETAILER/.test(scope) ? 'Thông tin từ đơn vị khác' : /RETAIL|PACKAGING|VARIANT/.test(scope) ? 'Ghi nhận tại điểm bán' : /ORGANIC/.test(scope) ? 'Chỉ áp dụng cho dòng Organic' : /STANDARD/.test(scope) ? 'Nguồn giải thích tiêu chuẩn' : 'Nguồn tham khảo cấp thương hiệu';
let state, profile, routeVersion = 0, demoRecords = [], demoEdited = false;
let activeSources = new Map();
let catalogQuery = '', catalogFilter = 'all';
let dialogTrigger;

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Không tải được dữ liệu. Vui lòng thử lại.');
  return data;
}
function openModal(title, body) {
  dialogTrigger = document.activeElement;
  document.querySelector('#modal-title').textContent = title;
  modalBody.innerHTML = body;
  if (!modal.open) modal.showModal();
  document.body.style.overflow = 'hidden';
}
function closeModal() { modal.close(); }
modal.addEventListener('close', () => { document.body.style.overflow = ''; dialogTrigger?.focus(); });
document.querySelector('#close-modal').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) {const r = modal.getBoundingClientRect();if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal();} });
document.querySelector('.menu-button').addEventListener('click', event => {
  const open = event.currentTarget.getAttribute('aria-expanded') !== 'true';
  event.currentTarget.setAttribute('aria-expanded', String(open)); document.querySelector('nav').classList.toggle('open', open);
});

function profileCard(p) {
  const apple = p.product_id === 'P-ENVY-VICHI-01';
  return `<article class="product-card"><a class="card-image" href="#detail/${attr(p.product_id)}" aria-label="Mở hồ sơ ${attr(names[p.product_id])}"><img src="${safeUrl(p.image_url)}" alt="${attr(p.image_alt)}" loading="lazy" width="560" height="285"><span class="image-pill">Ghi nhận tại VICHI MARKET</span></a><div class="card-body"><div class="card-brand">${esc(p.brand)} · HỒ SƠ CÓ NGUỒN</div><h3><a href="#detail/${attr(p.product_id)}">${esc(names[p.product_id])}</a></h3><p>${apple ? 'Từ nhãn túi tại điểm bán đến câu chuyện thương hiệu. Đọc rõ thông tin nào đã có nguồn.' : 'Thông tin trên hộp 4 quả, nguồn Zespri và cách phân biệt với dòng Organic.'}</p><div class="card-bottom"><span>Ảnh điểm bán · Nguồn thương hiệu</span><a href="#detail/${attr(p.product_id)}">Xem hồ sơ <span aria-hidden="true">↗</span></a></div></div></article>`;
}
function galleryCard(p) {
  return `<button class="gallery-card" data-preview="${attr(p.id)}" aria-label="Xem ảnh minh họa ${attr(p.name)}"><img src="${safeUrl(p.image_url)}" alt="Ảnh ${attr(p.name)} do người dùng cung cấp" loading="lazy" width="280" height="205"><span>${esc(p.name)}<b aria-hidden="true">↗</b></span><small>Ảnh minh họa · Chưa có hồ sơ</small></button>`;
}
function searchForm() {
  return '<form class="search-form" role="search"><span aria-hidden="true">⌕</span><label class="sr-only" for="search">Tìm tên hoặc mã hồ sơ sản phẩm</label><input id="search" name="search" placeholder="Tìm sản phẩm bạn quan tâm…" maxlength="150" autocomplete="off"><button class="button small" type="submit">Tìm kiếm <span aria-hidden="true">→</span></button></form>';
}
function home() {
  return `<section class="hero"><div class="container hero-grid"><div class="hero-copy"><p class="eyebrow">TRA CỨU NÔNG SẢN · ĐỐI CHIẾU NGUỒN</p><h1>Biết nguồn.<br><em>Hiểu bằng chứng.</em></h1><p>Một sản phẩm, nhiều nguồn thông tin. XuatXu giúp bạn đọc nhãn, xem tài liệu và hiểu mỗi bằng chứng nói được điều gì.</p><div class="actions"><a class="button" href="#catalog">Khám phá sản phẩm <span aria-hidden="true">↗</span></a><a class="button secondary" href="#about">Câu chuyện XuatXu</a></div><div class="hero-note">Từ ảnh tại điểm bán VICHI MARKET và nguồn tham khảo công khai.</div></div><div class="hero-visual"><img class="hero-photo" src="/static/images/vichi_envy_bag.jpg" alt="Túi táo ENVY được ghi nhận tại VICHI MARKET" width="430" height="405" fetchpriority="high"><img class="hero-photo-small" src="/static/images/vichi_zespri_gold_4.jpg" alt="Hộp kiwi vàng Zespri 4 quả tại VICHI" width="220" height="225"><div class="photo-label">Thông tin có nguồn để đọc<span>Ảnh điểm bán → Phạm vi bằng chứng</span></div><span class="hero-marker">TỪ ĐIỂM BÁN ĐẾN NGUỒN THAM KHẢO</span></div></div></section>
  <div class="container value-row"><div><span class="value-number">01</span><div><strong>Tra cứu từ sản phẩm</strong><small>Mở hồ sơ qua tên hoặc mã QR</small></div></div><div><span class="value-number">02</span><div><strong>Đọc nguồn bằng chứng</strong><small>Phân biệt ảnh, công bố và chứng từ</small></div></div><div><span class="value-number">03</span><div><strong>Hiểu đúng phạm vi</strong><small>Giải thích rõ điều chưa thể kết luận</small></div></div></div>
  <section class="container section"><div class="section-head"><div><p class="eyebrow">BẮT ĐẦU TỪ ĐIỀU BẠN QUAN TÂM</p><h2>Mỗi sản phẩm, một câu chuyện.</h2><p>Hai hồ sơ điểm bán để khám phá thông tin và nguồn tham khảo theo từng lớp.</p></div><a class="link" href="#catalog">Tất cả sản phẩm <span aria-hidden="true">↗</span></a></div><div class="featured-grid">${state.products.map(profileCard).join('')}</div><div class="gallery-heading"><h3>Thêm những sắc màu nông sản</h3><p>Bộ sưu tập ảnh minh họa cho hướng mở rộng. Các sản phẩm dưới đây chưa có hồ sơ nguồn gốc.</p></div><div class="gallery-grid">${state.gallery.map(galleryCard).join('')}</div><p class="gallery-disclosure">Ảnh do người dùng cung cấp. Nhãn, logo hoặc mã trên ảnh không được sử dụng để xác nhận xuất xứ, chứng nhận hay quan hệ hợp tác của các sản phẩm minh họa.</p></section>
  <section class="explain-section section"><div class="container"><p class="eyebrow">GIÁ TRỊ NẰM Ở CÁCH HIỂU THÔNG TIN</p><h2>Một nguồn tin, đúng phạm vi.</h2><div class="explain-grid"><article><span class="number">01 / Quan sát</span><h3>Điều nhìn thấy tại điểm bán</h3><p>Ảnh và nhãn giúp nhận diện sản phẩm cụ thể. Giá trên ảnh chỉ có ý nghĩa tại thời điểm chụp.</p></article><article><span class="number">02 / Tham khảo</span><h3>Điều thương hiệu công bố</h3><p>Nguồn chính thức giúp hiểu sản phẩm và chương trình của thương hiệu, với đường dẫn để bạn tự đọc.</p></article><article><span class="number">03 / Giới hạn</span><h3>Điều cần thêm bằng chứng</h3><p>Công bố của thương hiệu chưa xác nhận một lô hàng. XuatXu làm rõ những phần chưa thể đối chiếu.</p></article></div></div></section>
  <section class="container section">${researchBanner()}</section>`;
}
function researchBanner() {
  return `<div class="research-banner"><div><p class="eyebrow">TỪ NGHIÊN CỨU ĐẾN TRẢI NGHIỆM</p><h2>Không chỉ tìm thấy.<br>Còn cần hiểu đúng.</h2><p>XuatXu được phát triển từ nghiên cứu về niềm tin xanh, nhận thức tẩy xanh và năng lực hiểu thông tin truy xuất của người tiêu dùng.</p><a class="link" href="#about">Khám phá ý tưởng & hướng ứng dụng <span aria-hidden="true">↗</span></a></div><div class="research-points"><div><b>01</b><span><strong>Thông tin đặt trong bối cảnh</strong><small>Kết nối ảnh sản phẩm tại điểm bán với nguồn tham khảo.</small></span></div><div><b>02</b><span><strong>Bằng chứng được giải thích</strong><small>Mỗi nguồn đi kèm phạm vi và giới hạn áp dụng.</small></span></div><div><b>03</b><span><strong>Ứng dụng theo từng bước</strong><small>Mở rộng khi có dữ liệu và đơn vị chịu trách nhiệm cập nhật.</small></span></div></div></div>`;
}
function catalog() {
  return `<section class="container section catalog-page"><div class="section-head"><div><p class="eyebrow">THƯ VIỆN SẢN PHẨM</p><h1>Khám phá từ nguồn.</h1><p>Hai hồ sơ có nguồn tại VICHI và tám ảnh sản phẩm minh họa cho hướng mở rộng.</p></div></div>${searchForm()}<div class="catalog-toolbar"><div class="filters" aria-label="Lọc sản phẩm"><button data-filter="all" aria-pressed="true">Tất cả</button><button data-filter="profiles" aria-pressed="false">Hồ sơ có nguồn</button><button data-filter="covers" aria-pressed="false">Ảnh minh họa</button></div><span class="result-count" aria-live="polite"></span></div><div id="catalog-results"></div></section>`;
}
function updateCatalog() {
  const query = normalize(catalogQuery.trim());
  const profiles = state.products.filter(p => catalogFilter !== 'covers' && normalize(`${p.display_name} ${p.product_id} ${p.brand}`).includes(query));
  const gallery = state.gallery.filter(p => catalogFilter !== 'profiles' && normalize(p.name).includes(query));
  document.querySelector('.result-count').textContent = `${profiles.length + gallery.length} sản phẩm`;
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === catalogFilter)));
  document.querySelector('#catalog-results').innerHTML = !profiles.length && !gallery.length ? '<div class="empty-state" role="status"><h3>Không tìm thấy thông tin</h3><p>Hãy thử tên như “ENVY”, “kiwi”, “cam”, hoặc kiểm tra lại mã hồ sơ.</p><button class="button secondary" data-reset-search>Xem tất cả sản phẩm</button></div>' : `${profiles.length ? `<div class="featured-grid">${profiles.map(profileCard).join('')}</div>` : ''}${gallery.length ? `<div class="gallery-heading"><h3>Ảnh sản phẩm minh họa</h3><p>Chỉ có ảnh bìa, chưa có hồ sơ hoặc bằng chứng theo lô.</p></div><div class="gallery-grid">${gallery.map(galleryCard).join('')}</div>` : ''}`;
}
function sourceButton(id, label='Xem nguồn') {return activeSources.has(id) ? `<button class="link" data-source="${attr(id)}">${esc(label)} <span aria-hidden="true">↗</span></button>` : '';}
function sourceCard(card) {
  return `<article class="source-card"><span class="badge">${esc(card.visual_status)}</span><h3>${esc(card.title)}</h3><p>${esc(card.display_text)}</p>${sourceButton(card.source_ids,'Đọc nguồn bằng chứng')}<div class="source-meta">${esc(card.source_ids)} · Phạm vi: ${esc(sourceScope(card.scope))}</div></article>`;
}
function profileView(data) {
  const p=data.product, apple=p.product_id==='P-ENVY-VICHI-01';
  const limit=data.display_cards.find(c=>c.section==='LIMIT');
  const firstSource=apple?'SRC-VICHI-03':'SRC-VICHI-02';
  const suggestions=data.questions.map(q=>`<button data-question="${attr(q.qa_id)}">${esc(q.user_question)}</button>`);
  return `<div class="container"><div class="page-heading"><div class="breadcrumbs"><a href="#home">Trang chủ</a><span>/</span><a href="#catalog">Sản phẩm</a><span>/</span><span>${esc(p.brand)}</span></div></div><section class="profile-hero"><figure><img src="${safeUrl(p.image_url)}" alt="${attr(p.image_alt)}" width="560" height="430"><figcaption>Ảnh do nhóm nghiên cứu cung cấp tại VICHI MARKET. ${sourceButton(firstSource,'Mở ảnh nguồn')}</figcaption></figure><div><span class="badge">Ghi nhận tại VICHI MARKET</span><h1>${esc(names[p.product_id])}</h1><p class="intro">${esc(p.description)}</p><dl class="facts"><div><dt>Quy cách trên nhãn</dt><dd>${esc(p.packaging_demo)}</dd></div><div><dt>Giá ghi nhận trên ảnh</dt><dd>${apple?'185.000 đ / túi':'170.000 đ / hộp'}<small>Tại thời điểm chụp, không phải giá hiện hành</small></dd></div><div><dt>${apple?'Thương hiệu trên bao bì':'Xuất xứ trên nhãn'}</dt><dd>${apple?'ENVY · T&G / TONY FRUIT':'New Zealand · Chưa đối chiếu theo lô'}</dd></div><div><dt>Bộ dữ liệu cập nhật</dt><dd>24/10/2026</dd></div></dl><div class="actions"><button class="button" data-jump="sources">Đọc nguồn bằng chứng ↓</button><button class="button secondary" data-qr="${attr(p.product_id)}">▦ QR hồ sơ</button></div></div></section>
  <div class="profile-layout"><div class="profile-main" id="sources"><p class="eyebrow">TỪ QUAN SÁT ĐẾN THAM KHẢO</p><h2>Thông tin đi cùng nguồn.</h2>${data.display_cards.filter(c=>c.section!=='LIMIT').map(sourceCard).join('')}<section class="scope-box"><h3>${esc(limit.title)}</h3><p>${esc(limit.display_text)}</p></section><details class="detail-disclosure"><summary>Tuyên bố môi trường & phạm vi áp dụng</summary><div class="detail-content">${data.claims.map(c=>`<article class="evidence-item"><h3>${esc(c.claim_text)}</h3><span class="claim-status">${esc(c.display_status)}</span><p>${esc(c.consumer_explanation)}</p><small>Bên công bố: ${esc(c.claimant)}</small>${sourceButton(c.source_id)}</article>`).join('')}${!apple?'<div class="organic-compare"><img src="/static/images/vichi_zespri_organic_3_REFERENCE.jpg" alt="Hộp Organic 3 quả: biến thể tham khảo khác" loading="lazy"><p><strong>Hai biến thể khác nhau.</strong><br>Ảnh này là hộp Organic 3 quả, không phải hộp kiwi vàng 4 quả trong hồ sơ.</p></div>':''}</div></details><details class="detail-disclosure"><summary>Xem bằng chứng chi tiết · ${data.evidences.length} mục</summary><div class="detail-content">${data.evidences.map(e=>`<article class="evidence-item"><h3>${esc(e.title)}</h3><span class="badge neutral">${esc(sourceScope(e.verification_scope))}</span><p>${esc(e.description)}</p><small>${esc(e.owner)} · ${esc(e.evidence_id)}</small>${sourceButton(e.source_id)}<small>Phạm vi: chưa xác minh theo lô tại VICHI.</small></article>`).join('')}</div></details><p class="technical-route-note">Tìm hiểu cách phát hiện dữ liệu thay đổi? <a class="link" href="#tech">Mở mô phỏng SHA-256 riêng ↗</a></p></div>
  <aside class="assistant" aria-label="Trợ lý giải thích"><div class="assistant-head"><h2>Trợ lý giải thích XuatXu</h2><p>Giải thích dễ hiểu, có nguồn để đọc.</p></div><div class="assistant-body"><p>Chọn điều bạn muốn hiểu về <strong>${esc(p.brand)}</strong>.</p><div class="suggestions">${suggestions.slice(0,4).join('')}</div><details class="more-questions"><summary>Thêm ${suggestions.length-4} câu hỏi</summary><div class="suggestions">${suggestions.slice(4).join('')}</div></details><div class="chat-log" role="log" aria-live="polite" aria-label="Hỏi đáp về sản phẩm"></div><form class="chat-form"><label class="sr-only" for="question">Câu hỏi về sản phẩm</label><input id="question" maxlength="500" placeholder="Nhập câu hỏi của bạn…" required><button aria-label="Gửi câu hỏi" type="submit">↑</button></form><p class="assistant-footnote">Trả lời từ bộ hỏi đáp biên soạn theo nguồn. Chưa kết nối mô hình AI sinh câu trả lời tự do.</p><button class="link assistant-clear" data-clear-chat>Xóa cuộc trò chuyện</button></div></aside></div></div>`;
}
function about() {
  return `<section class="container section"><div class="about-intro"><p class="eyebrow">CÂU CHUYỆN XUATXU</p><h1>Từ thông tin được nhìn thấy<br>đến bằng chứng được hiểu.</h1><p class="intro">XuatXu là nguyên mẫu ứng dụng nghiên cứu, hỗ trợ người tiêu dùng Việt Nam tra cứu nông sản nhập khẩu và đối chiếu thông tin trong bối cảnh điểm bán.</p></div><div class="about-grid"><article class="about-card"><h2>Vì sao có XuatXu?</h2><p>Nghiên cứu của nhóm xem xét đặc tính blockchain được cảm nhận, thực hành môi trường, nhận thức tẩy xanh, niềm tin xanh và năng lực hiểu thông tin truy xuất.</p><p>Từ đó, nhóm đề xuất một trải nghiệm giúp người mua tiếp cận nguồn và hiểu giới hạn của nguồn. Giao diện là một hướng ứng dụng cần được đánh giá, chưa phải bằng chứng về tác động lên niềm tin hay hành vi mua.</p></article><article class="about-card"><h2>Khác biệt trong cách trình bày</h2><p>Cùng một hồ sơ kết nối ảnh tại điểm bán, thông tin thương hiệu và lời giải thích bằng tiếng Việt. Mỗi bằng chứng cho biết mình hỗ trợ nội dung gì, ở phạm vi nào.</p><p>Người dùng có thể mở nguồn gốc của thông tin, phân biệt công bố chung với chứng từ của một lô hàng và nhận biết điều chưa thể kết luận.</p></article></div>
  <section class="section"><p class="eyebrow">LIÊN HỆ NGHIÊN CỨU & THIẾT KẾ</p><h2>Hàm ý được đưa vào trải nghiệm.</h2><div class="research-map"><div><strong>Khả năng tiếp cận và đối chiếu</strong><p>QR mở đúng hồ sơ; mỗi thẻ thông tin có nguồn cụ thể để người dùng tự kiểm tra.</p></div><div><strong>Năng lực hiểu thông tin truy xuất</strong><p>Tóm tắt trước, chi tiết khi cần; hỏi đáp giải thích theo nguồn của đúng sản phẩm.</p></div><div><strong>Tuyên bố môi trường và niềm tin xanh</strong><p>Phân biệt chính sách của thương hiệu với bằng chứng áp dụng cho sản phẩm tại điểm bán; không suy diễn thiếu tài liệu là tẩy xanh.</p></div></div><p class="gallery-disclosure">Theo tài liệu định hướng của nhóm. Mối quan hệ chữ U trong nghiên cứu không tự chứng minh người dùng bị quá tải thông tin; thiết kế nhiều lớp vẫn cần kiểm thử người dùng.</p></section>
  <div class="about-grid"><article class="about-card"><h2>Bối cảnh VICHI MARKET</h2><p>Hai hồ sơ chính dựa trên ảnh tại điểm bán: táo ENVY túi 1 kg và kiwi vàng Zespri hộp 4 quả. Nguồn chính thức của thương hiệu được dùng để bổ sung bối cảnh, chưa xác minh lô hàng tại VICHI.</p><p>Bộ dữ liệu hiện có ảnh sản phẩm, chưa có kết quả khảo sát, log quét QR hoặc biên bản để công bố hiệu quả thí điểm.</p></article><article class="about-card"><h2>Tiềm năng ứng dụng</h2><p>Cửa hàng có thể tổ chức thông tin sản phẩm và nguồn tham khảo trong một hồ sơ dễ đọc. Hướng tiếp theo là bổ sung tài liệu theo lô khi được nhà phân phối cung cấp.</p><p>Mở rộng hoặc chuyển giao cần người chịu trách nhiệm cập nhật, quyền sử dụng dữ liệu, lưu trữ bền vững và thỏa thuận với đơn vị tiếp nhận.</p></article></div>
  <section class="section" id="presentation"><p class="eyebrow">LỘ TRÌNH GIỚI THIỆU GỢI Ý · 90 GIÂY</p><h2>Một vòng khám phá XuatXu.</h2><div class="walkthrough"><a href="#detail/P-ENVY-VICHI-01"><small>00–30 GIÂY · BỐI CẢNH & NGUỒN</small><strong>Mở hồ sơ ENVY ↗</strong><p>Từ ảnh túi tại VICHI, mở nguồn và giải thích thông tin quan sát khác chứng từ lô như thế nào.</p></a><a href="#detail/P-ZESPRI-VICHI-01"><small>30–60 GIÂY · ĐIỂM KHÁC BIỆT</small><strong>Đọc đúng hồ sơ Zespri ↗</strong><p>Phân biệt hộp 4 quả với Organic 3 quả; chọn câu hỏi để xem giải thích có nguồn.</p></a><a href="#tech"><small>60–90 GIÂY · HƯỚNG PHÁT TRIỂN</small><strong>Thử kiểm tra dữ liệu ↗</strong><p>Mô phỏng hash phát hiện thay đổi. Nêu điều kiện bổ sung dữ liệu theo lô và khả năng áp dụng cho điểm bán.</p></a></div></section>
  <section class="scope-box"><h3>Góp ý sau trải nghiệm</h3>${state.feedback_url?`<p>Gửi góp ý qua biểu mẫu của nhóm nghiên cứu.</p><a class="link" href="${safeUrl(state.feedback_url)}" target="_blank" rel="noopener noreferrer">Mở biểu mẫu góp ý ↗</a>`:'<p>Nhóm chưa cung cấp đường dẫn biểu mẫu thu phản hồi cho phiên bản này. Website chưa thu hoặc công bố kết quả phản hồi của người dùng.</p>'}</section></section>`;
}
function techView(records) {
  return `<section class="container section"><div class="tech-intro"><p class="eyebrow">KHÔNG THUỘC HỒ SƠ SẢN PHẨM VICHI</p><h1>Khi dữ liệu thay đổi,<br>dấu vết có còn khớp?</h1><p>Mô phỏng SHA-256 với 5 sự kiện giả định, độc lập với hai hồ sơ sản phẩm. Không phải giao dịch blockchain, không có xác nhận on-chain.</p><span class="badge neutral">Dữ liệu giả lập · Không phải chứng từ của VICHI</span></div><div class="tech-actions"><button class="button" data-verify>Kiểm tra 5 bản ghi</button><button class="button secondary" data-tamper>Thử sửa một dữ liệu</button><button class="link" data-reset-demo>Khôi phục bản gốc</button></div><div class="tech-result" role="status">Chọn “Kiểm tra 5 bản ghi” để tính lại hash từ dữ liệu đang hiển thị.</div><div class="chain">${records.map((r,i)=>{const p=JSON.parse(r.canonical_payload);return `<article class="chain-record" data-record="${i}"><p class="eyebrow">${String(i+1).padStart(2,'0')} · ${esc(r.record_id)}</p><h3>${esc(p.title)}</h3><dl><dt>Ngày ghi trong tình huống giả định</dt><dd>${esc(p.event_date)}</dd><dt>Hash của bản ghi trước</dt><dd><code>${esc(r.previous_hash)}</code></dd><dt>SHA-256 đã lưu</dt><dd><code>${esc(r.sha256)}</code></dd></dl><details><summary>Xem dữ liệu dùng để tính hash</summary><pre>${esc(r.canonical_payload)}</pre></details></article>`;}).join('')}</div><div class="scope-box"><h3>Hash khớp nói lên điều gì?</h3><p>Hash giúp phát hiện dữ liệu khác với bản đã ghi và kiểm tra liên kết trong chuỗi này. Nó không tự chứng minh nội dung ban đầu là đúng, sản phẩm chính hãng hay chứng từ hợp lệ. Người có quyền thay toàn bộ dữ liệu và tính lại chuỗi vẫn có thể tạo một chuỗi khớp mới.</p></div></section>`;
}
function qrView() { return `<section class="container section"><p class="eyebrow">ĐƯA HỒ SƠ ĐẾN ĐIỆN THOẠI</p><h1>Quét QR. Mở đúng sản phẩm.</h1><p class="tech-intro">Dùng camera điện thoại quét mã bên dưới. QR dẫn đến hồ sơ công khai, không phải mã lô hoặc chứng nhận sản phẩm.</p><div class="qr-grid">${state.products.map(p=>`<article class="qr-card"><h2>${esc(names[p.product_id])}</h2><img src="/api/generate-qr?product_id=${encodeURIComponent(p.product_id)}" alt="QR hồ sơ ${attr(names[p.product_id])}" width="245" height="245"><p>Đích đến: hồ sơ ${esc(p.brand)} trên XuatXu.</p><div class="actions"><a class="button" href="#detail/${attr(p.product_id)}">Mở hồ sơ ↗</a><a class="button secondary" href="/api/generate-qr?product_id=${encodeURIComponent(p.product_id)}&download=1" download>Tải QR</a></div></article>`).join('')}</div></section>`; }

async function route() {
  const version = ++routeVersion;
  profile=null; activeSources=new Map();
  if(modal.open)closeModal();
  document.querySelector('nav').classList.remove('open');document.querySelector('.menu-button').setAttribute('aria-expanded','false');
  const route=(location.hash.slice(1)||'home').split('/');
  document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===route[0])a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  main.classList.remove('fade-in');
  try {
    let content;
    if(route[0]==='detail') {
      main.innerHTML='<div class="loading container" role="status">Đang mở hồ sơ…</div>';
      const data=await api(`/api/product-detail/${encodeURIComponent(route[1]||'')}`);
      if(version!==routeVersion)return;
      profile=data; data.sources.forEach(s=>activeSources.set(s.source_id,s));content=profileView(data);
      document.title=`${names[data.product.product_id]} — XuatXu`;
    } else if(route[0]==='catalog'){content=catalog();document.title='Khám phá sản phẩm — XuatXu';}
    else if(route[0]==='about'){content=about();document.title='Nghiên cứu & hướng ứng dụng — XuatXu';}
    else if(route[0]==='qr'){content=qrView();document.title='QR sản phẩm — XuatXu';}
    else if(route[0]==='tech'){
      main.innerHTML='<div class="loading container" role="status">Đang mở mô phỏng…</div>';
      const data=await api('/api/tech-demo');if(version!==routeVersion)return;
      demoRecords=data.records;demoEdited=false;content=techView(demoRecords);document.title='Mô phỏng SHA-256 — XuatXu';
    } else {content=home();document.title='XuatXu — Biết nguồn, hiểu bằng chứng';}
    main.innerHTML=content;main.classList.add('fade-in');
    if(route[0]==='catalog'){document.querySelector('#search').value=catalogQuery;updateCatalog();}
    window.scrollTo({top:0,behavior:'instant'});
    main.focus({preventScroll:true});
  } catch(error) { if(version===routeVersion) main.innerHTML=`<section class="container section empty-state"><h1>Chưa mở được hồ sơ</h1><p role="alert">${esc(error.message)}</p><button class="button" data-retry>Thử lại</button> <a class="link" href="#catalog">Về danh sách sản phẩm</a></section>`; }
}
async function ask(qaId, question) {
  if(!profile)return;
  const context=profile, version=routeVersion;
  const selected=context.questions.find(q=>q.qa_id===qaId);
  const value=(selected?.user_question||question||'').trim();if(!value)return;
  const log=document.querySelector('.chat-log');
  const turn=document.createElement('div');turn.className='chat-turn';
  const query=document.createElement('p');query.className='chat-question';query.textContent=value;
  const answer=document.createElement('div');answer.className='chat-answer';answer.textContent='Đang mở câu trả lời…';
  turn.append(query,answer);log.append(turn);log.scrollTop=log.scrollHeight;
  try {
    const result=await api('/api/ai-ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:context.product.product_id,qa_id:qaId||'',question:value})});
    if(version!==routeVersion)return;
    result.sources.forEach(s=>activeSources.set(s.source_id,s));
    answer.innerHTML=`<p>${esc(result.answer)}</p><div class="source-links">${result.source_ids.map(id=>sourceButton(id,id)).join('')}</div>`;
  } catch(error){answer.textContent=error.message;}
  log.scrollTop=log.scrollHeight;
}
async function verifyDemo() {
  let prior='GENESIS_SHA256_SIM_ONLY', valid=0;
  for(const [index,r] of demoRecords.entries()) {
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(prior+'|'+r.canonical_payload));
    const computed=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const match=r.previous_hash===prior&&computed===r.sha256;
    if(match)valid++;
    const node=document.querySelector(`[data-record="${index}"]`);if(!node)return;
    node.querySelector('.record-result')?.remove();
    node.insertAdjacentHTML('beforeend',`<p class="record-result ${match?'muted':'error'}">${match?'Khớp dữ liệu đã ghi':'KHÔNG KHỚP — dữ liệu hoặc liên kết đã thay đổi'}</p>`);
    prior=computed;
  }
  const result=document.querySelector('.tech-result');if(!result)return;
  result.classList.toggle('fail',valid!==5);result.textContent=valid===5?'5/5 bản ghi khớp. Đây là kiểm tra tính toàn vẹn trong mô phỏng, không xác minh sự thật của dữ liệu.':`${valid}/5 bản ghi khớp. Đã phát hiện dữ liệu thay đổi và các liên kết phía sau không còn khớp với chuỗi gốc.`;
}
document.addEventListener('submit',event=>{
  if(event.target.matches('.search-form')){event.preventDefault();catalogQuery=new FormData(event.target).get('search')||'';updateCatalog();}
  if(event.target.matches('.chat-form')){event.preventDefault();const input=event.target.querySelector('input');ask('',input.value);input.value='';}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-preview')) {
    const p=state.gallery.find(x=>x.id===button.dataset.preview);if(!p)return;
    openModal(`${p.name} · Ảnh minh họa`,`<img src="${safeUrl(p.image_url)}" alt="${attr(p.name)}"><span class="badge neutral">Chỉ có ảnh bìa · Chưa có hồ sơ</span><p>Ảnh sản phẩm do người dùng cung cấp để minh họa danh mục mở rộng. Chưa có hồ sơ nguồn gốc, nguồn tham chiếu hoặc chứng từ để đối chiếu sản phẩm này.</p><p class="modal-note">Nhãn, thương hiệu, QR hoặc chứng nhận xuất hiện trong ảnh không được XuatXu xác nhận. Bạn có thể khám phá hai hồ sơ có nguồn ở danh mục ENVY và Zespri.</p>`);
  }
  if(button.hasAttribute('data-source')) {
    const s=activeSources.get(button.dataset.source);if(!s)return;
    openModal(s.title,`<span class="badge">${esc(sourceScope(s.scope))}</span><p>${esc(s.supported_fact)}</p><dl><div><dt>Bên cung cấp</dt><dd>${esc(s.organization)}</dd></div><div><dt>Mã nguồn</dt><dd>${esc(s.source_id)}</dd></div><div><dt>Ngày kiểm tra ghi trong bộ dữ liệu</dt><dd>${esc(s.checked_at)}</dd></div><div><dt>Phạm vi sử dụng</dt><dd>${esc(sourceScope(s.scope))} · Chưa xác minh theo lô VICHI.</dd></div></dl>${s.image_url?`<a href="${safeUrl(s.image_url)}" target="_blank" rel="noopener noreferrer"><img class="source-photo" src="${safeUrl(s.image_url)}" alt="${attr(s.title)}"></a><a class="link" href="${safeUrl(s.image_url)}" target="_blank" rel="noopener noreferrer">Mở ảnh gốc ↗</a>`:''}${s.url?`<a class="button" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">Mở nguồn công khai ↗</a>`:''}${s.source_status.includes('NOT_RETRIEVED')?'<p class="error">Theo bộ dữ liệu, trang này chưa truy cập được ở lần kiểm tra gần nhất. Đây là tham chiếu của cửa hàng khác, không phải chứng từ VICHI.</p>':''}`);
  }
  if(button.hasAttribute('data-qr')) {
    const p=state.products.find(p=>p.product_id===button.dataset.qr);if(!p)return;
    openModal(`QR · ${names[p.product_id]}`,`<img class="qr-modal" src="/api/generate-qr?product_id=${encodeURIComponent(p.product_id)}" alt="Mã QR hồ sơ sản phẩm"><p>Dùng camera điện thoại để mở hồ sơ ${esc(p.brand)}. QR là đường dẫn đến hồ sơ, không phải bằng chứng xác thực.</p><a class="button" href="/api/generate-qr?product_id=${encodeURIComponent(p.product_id)}&download=1" download>Tải ảnh QR</a><p class="modal-note">${esc(profile?.qr_target_url||'')}</p>`);
  }
  if(button.hasAttribute('data-filter')){catalogFilter=button.dataset.filter;updateCatalog();}
  if(button.hasAttribute('data-reset-search')){catalogQuery='';catalogFilter='all';document.querySelector('#search').value='';updateCatalog();}
  if(button.hasAttribute('data-question'))await ask(button.dataset.question);
  if(button.hasAttribute('data-clear-chat'))document.querySelector('.chat-log').replaceChildren();
  if(button.hasAttribute('data-jump'))document.getElementById(button.dataset.jump)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  if(button.hasAttribute('data-retry'))await route();
  if(button.hasAttribute('data-verify')) {try{await verifyDemo();}catch{document.querySelector('.tech-result').textContent='Trình duyệt cần HTTPS hoặc localhost để tính SHA-256. Vui lòng mở website qua HTTPS.';}}
  if(button.hasAttribute('data-tamper')) {
    if(!demoEdited){const payload=JSON.parse(demoRecords[1].canonical_payload);payload.location='Địa điểm đã sửa trong mô phỏng';demoRecords[1].canonical_payload=JSON.stringify(payload);demoEdited=true;document.querySelector('[data-record="1"] pre').textContent=demoRecords[1].canonical_payload;document.querySelector('[data-record="1"] details').open=true;}
    try{await verifyDemo();}catch{document.querySelector('.tech-result').textContent='Vui lòng dùng HTTPS hoặc localhost để kiểm tra SHA-256.';}
  }
  if(button.hasAttribute('data-reset-demo'))await route();
});
window.addEventListener('hashchange',()=>{if(state)route();});
async function start(){try{state=await api('/api/init');await route();}catch(error){main.innerHTML=`<section class="container section"><h1>Chưa tải được dữ liệu</h1><p role="alert">${esc(error.message)}</p><button class="button" id="reload-data">Tải lại</button></section>`;document.querySelector('#reload-data').addEventListener('click',start);}}
start();
