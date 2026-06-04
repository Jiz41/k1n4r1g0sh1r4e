// ========================================
// 華耀天輪 己成拵 貳ツ目 - Player Profile Generator
// Ver 1.0
// 2026年6月
//
// 作成者: Musyn Reagan (ファン制作)
// 非公式ツールです。公式とは一切関係ありません。
// ========================================

// ========== 車番カラー定義 ==========
const WAKU_COLORS = {
    "1": { bg: "#ffffff", tx: "#000000" },
    "2": { bg: "#000000", tx: "#ffffff" },
    "3": { bg: "#e60012", tx: "#ffffff" },
    "4": { bg: "#0062ad", tx: "#ffffff" },
    "5": { bg: "#ffdb00", tx: "#000000" },
    "6": { bg: "#009944", tx: "#ffffff" },
    "7": { bg: "#f39800", tx: "#ffffff" },
    "8": { bg: "#e5007f", tx: "#ffffff" },
    "9": { bg: "#7b2d8b", tx: "#ffffff" }
};

// ========== テキストデフォルト値 ==========
const DEFAULT_PLACEHOLDER = "---";
const DEFAULT_COMMENT     = "...よろしくお願いします";

// ========== カードサイズ ==========
const CARD_WIDTH  = 850;
const CARD_HEIGHT = 580;

// ========== レイアウト定数 ==========
const WAKU_BAR_WIDTH    = 100;
const HEADER_HEIGHT     = 155;
const GREY_OVERLAY_X    = 340;
const ICON_X            = 185;
const ICON_Y            = 77.5;
const ICON_RADIUS_OUTER = 55;
const ICON_RADIUS_INNER = 50;
const ICON_RADIUS_EMPTY = 40;
const TEXT_X            = 260;
const CONTENT_LEFT      = 130;
const COL2_X            = 475;
const CONTENT_WIDTH     = 690;
const COMMENT_LINE_Y    = 470;
const DOT_PITCH         = 12;

// ========== 状態変数 ==========
let dotPatternCanvas = null;
let watermarkImages  = { keirin3: null, keirin4: null, keirin5: null };
let currentWaku      = "3";
let currentPattern   = "無地";
let userIconImage    = null;
let updateTimer      = null;

const cardData = {
    waku:      "3",
    name:      "RIDER NAME",
    sns:       "---",
    exp:       "競輪歴 / Keirin History: ---",
    favRider:  "---",
    region:    "---",
    bank:      "---",
    memorable: "---",
    style:     "---",
    time:      "---",
    comment:   "...よろしくお願いします"
};

// ========== DOM参照 ==========
const canvas = document.getElementById('preview-canvas');
const ctx    = canvas.getContext('2d');

const inputs = {
    waku:      document.getElementById('in-waku'),
    icon:      document.getElementById('in-icon'),
    n:         document.getElementById('in-n'),
    sns:       document.getElementById('in-sns'),
    exp:       document.getElementById('in-exp'),
    favRider:  document.getElementById('in-fav-rider'),
    region:    document.getElementById('in-region'),
    bank:      document.getElementById('in-bank'),
    memorable: document.getElementById('in-memorable'),
    style:     document.getElementById('in-style'),
    time:      document.getElementById('in-time'),
    com:       document.getElementById('in-com')
};

const counters = {
    n:         document.getElementById('counter-n'),
    sns:       document.getElementById('counter-sns'),
    exp:       document.getElementById('counter-exp'),
    favRider:  document.getElementById('counter-fav-rider'),
    region:    document.getElementById('counter-region'),
    bank:      document.getElementById('counter-bank'),
    memorable: document.getElementById('counter-memorable'),
    time:      document.getElementById('counter-time'),
    com:       document.getElementById('counter-com')
};

const saveBtn        = document.getElementById('save-btn');
const loadingOverlay = document.getElementById('loading-overlay');

// ========== トリミングUI DOM参照 ==========
const cropModal      = document.getElementById('crop-modal');
const cropCanvas     = document.getElementById('crop-canvas');
const cropCtx        = cropCanvas.getContext('2d');
const cropSlider     = document.getElementById('crop-slider');
const cropConfirmBtn = document.getElementById('crop-confirm');
const cropCancelBtn  = document.getElementById('crop-cancel');

// ========== 初期化 ==========

function createDotPattern() {
    const patCanvas = document.createElement('canvas');
    patCanvas.width  = CARD_WIDTH;
    patCanvas.height = CARD_HEIGHT;
    const patCtx = patCanvas.getContext('2d');

    patCtx.fillStyle = '#e8e8e8';
    for (let x = 0; x < CARD_WIDTH; x += DOT_PITCH) {
        for (let y = 0; y < CARD_HEIGHT; y += DOT_PITCH) {
            patCtx.beginPath();
            patCtx.arc(x, y, 1.2, 0, Math.PI * 2);
            patCtx.fill();
        }
    }
    dotPatternCanvas = patCanvas;
}

function initWatermark() {
    [['keirin3', 'images/keirin3.png'], ['keirin4', 'images/keirin4.png'], ['keirin5', 'images/keirin5.png']].forEach(([key, src]) => {
        const img = new Image();
        img.onload = () => { watermarkImages[key] = img; drawCard(); };
        img.onerror = () => {};
        img.src = src;
    });
}

function drawWatermarkPattern(targetCtx) {
    const img    = watermarkImages[currentPattern];
    const TARGET = 110;
    const STEP   = 170;

    targetCtx.save();
    targetCtx.globalAlpha = 0.07;
    targetCtx.translate(CARD_WIDTH / 2, CARD_HEIGHT / 2);
    targetCtx.rotate(-Math.PI / 4);

    const reach = Math.ceil(Math.sqrt(CARD_WIDTH * CARD_WIDTH + CARD_HEIGHT * CARD_HEIGHT) / 2) + STEP;
    const count = Math.ceil(reach / STEP);

    targetCtx.fillStyle    = '#000000';
    targetCtx.font         = 'bold 20px sans-serif';
    targetCtx.textAlign    = 'center';
    targetCtx.textBaseline = 'middle';

    for (let row = -count; row <= count; row++) {
        for (let col = -count; col <= count; col++) {
            const x = col * STEP;
            const y = row * STEP;
            if ((row + col) % 2 === 0) {
                if (img) {
                    const scale = Math.min(TARGET / img.naturalWidth, TARGET / img.naturalHeight);
                    const drawW = img.naturalWidth  * scale;
                    const drawH = img.naturalHeight * scale;
                    targetCtx.drawImage(img, x - drawW / 2, y - drawH / 2, drawW, drawH);
                }
            } else {
                targetCtx.fillText('KEIRIN', x, y);
            }
        }
    }

    targetCtx.restore();
}

// ========== 描画 ==========

function getShadowColor(hex) {
    if (hex === "#000000") return "#555555";
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.floor(r*0.4)},${Math.floor(g*0.4)},${Math.floor(b*0.4)})`;
}

function drawCard(targetCtx = ctx) {
    const theme = WAKU_COLORS[currentWaku];

    targetCtx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    targetCtx.fillStyle = '#f2f2f2';
    targetCtx.beginPath();
    targetCtx.moveTo(GREY_OVERLAY_X, 0);
    targetCtx.lineTo(CARD_WIDTH, 0);
    targetCtx.lineTo(CARD_WIDTH, CARD_HEIGHT);
    targetCtx.lineTo(0, CARD_HEIGHT);
    targetCtx.closePath();
    targetCtx.fill();

    if (currentPattern === '無地') {
        if (dotPatternCanvas) targetCtx.drawImage(dotPatternCanvas, 0, 0);
    } else {
        drawWatermarkPattern(targetCtx);
    }

    targetCtx.strokeStyle = '#000000';
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(2, 2, CARD_WIDTH - 4, CARD_HEIGHT - 4);
    targetCtx.strokeStyle = '#cccccc';
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(6, 6, CARD_WIDTH - 12, CARD_HEIGHT - 12);

    targetCtx.fillStyle = theme.bg;
    targetCtx.fillRect(0, 0, WAKU_BAR_WIDTH, CARD_HEIGHT);
    targetCtx.strokeStyle = '#000000';
    targetCtx.lineWidth = 4;
    targetCtx.beginPath();
    targetCtx.moveTo(WAKU_BAR_WIDTH, 0);
    targetCtx.lineTo(WAKU_BAR_WIDTH, CARD_HEIGHT);
    targetCtx.stroke();

    targetCtx.fillStyle = theme.tx;
    targetCtx.font = '900 85px sans-serif';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(currentWaku, WAKU_BAR_WIDTH / 2, CARD_HEIGHT / 2);

    targetCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    targetCtx.fillRect(WAKU_BAR_WIDTH, 0, CARD_WIDTH - WAKU_BAR_WIDTH, HEADER_HEIGHT);
    targetCtx.strokeStyle = '#000000';
    targetCtx.lineWidth = 4;
    targetCtx.beginPath();
    targetCtx.moveTo(WAKU_BAR_WIDTH, HEADER_HEIGHT);
    targetCtx.lineTo(CARD_WIDTH, HEADER_HEIGHT);
    targetCtx.stroke();

    targetCtx.strokeStyle = theme.bg;
    targetCtx.lineWidth = 5;
    targetCtx.beginPath();
    targetCtx.arc(ICON_X, ICON_Y, ICON_RADIUS_OUTER, 0, Math.PI * 2);
    targetCtx.stroke();

    targetCtx.fillStyle = '#ffffff';
    targetCtx.fill();

    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    targetCtx.arc(ICON_X, ICON_Y, 52, 0, Math.PI * 2);
    targetCtx.stroke();

    if (userIconImage) {
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.arc(ICON_X, ICON_Y, ICON_RADIUS_INNER, 0, Math.PI * 2);
        targetCtx.closePath();
        targetCtx.clip();
        targetCtx.drawImage(
            userIconImage,
            ICON_X - ICON_RADIUS_INNER,
            ICON_Y - ICON_RADIUS_INNER,
            ICON_RADIUS_INNER * 2,
            ICON_RADIUS_INNER * 2
        );
        targetCtx.restore();
    } else {
        targetCtx.fillStyle = '#cccccc';
        targetCtx.beginPath();
        targetCtx.arc(ICON_X, ICON_Y, ICON_RADIUS_EMPTY, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = '#888888';
        targetCtx.font = 'bold 60px sans-serif';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('?', ICON_X, ICON_Y);
    }

    targetCtx.fillStyle = '#000000';
    targetCtx.textAlign = 'left';
    targetCtx.textBaseline = 'top';

    const nameLength   = cardData.name.length;
    const nameFontSize = nameLength > 15 ? 28 : nameLength > 10 ? 34 : 44;
    targetCtx.font = `900 ${nameFontSize}px sans-serif`;
    wrapText(targetCtx, cardData.name, TEXT_X, 16, CARD_WIDTH - TEXT_X - 30, nameFontSize * 1.1, 2);

    targetCtx.font = '800 13px sans-serif';
    targetCtx.fillStyle = '#333333';
    targetCtx.fillText(cardData.exp, TEXT_X, 83);

    targetCtx.fillStyle = '#000000';
    targetCtx.font = '900 14px sans-serif';
    targetCtx.fillText('SNS: ' + cardData.sns, TEXT_X, 100);

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(WAKU_BAR_WIDTH, HEADER_HEIGHT + 10, CARD_WIDTH - WAKU_BAR_WIDTH - 20, CARD_HEIGHT - HEADER_HEIGHT - 10 - 60);
    targetCtx.clip();

    function drawItem(x, y, label, value, width) {
        const height = 26;
        targetCtx.fillStyle = getShadowColor(theme.bg);
        targetCtx.fillRect(x + 2, y + 2, 6, height);
        targetCtx.fillStyle = theme.bg;
        targetCtx.fillRect(x, y, 6, height);

        targetCtx.fillStyle = '#888888';
        targetCtx.font = '900 10px sans-serif';
        targetCtx.fillText(label, x + 12, y + 2);

        targetCtx.fillStyle = '#000000';
        targetCtx.font = '900 17px sans-serif';
        wrapText(targetCtx, value, x + 12, y + 14, width - 30, 20, 1);
    }

    // 競輪の好みセクション
    const SEC1_Y = HEADER_HEIGHT + 22;   // 177
    targetCtx.fillStyle = '#1a1a1a';
    targetCtx.fillRect(CONTENT_LEFT, SEC1_Y, CONTENT_WIDTH, 21);
    targetCtx.fillStyle = '#e8e8e8';
    targetCtx.font = '900 13px sans-serif';
    targetCtx.fillText('競輪の好み / Favorite (Keirin)', CONTENT_LEFT + 12, SEC1_Y + 5);

    const R1 = SEC1_Y + 46;   // 223
    const R2 = R1 + 51;       // 274
    drawItem(CONTENT_LEFT, R1, '推し選手 / Fav Rider',              cardData.favRider,  330);
    drawItem(COL2_X,       R1, '好きな地区・ライン / Fav Region & Line', cardData.region,    330);
    drawItem(CONTENT_LEFT, R2, '好きなバンク / Fav Velodrome',       cardData.bank,      330);
    drawItem(COL2_X,       R2, '思い出のレース / Memorable',         cardData.memorable, 330);

    // プレイの傾向セクション
    const SEC2_Y = R2 + 76;   // 350
    targetCtx.fillStyle = '#1a1a1a';
    targetCtx.fillRect(CONTENT_LEFT, SEC2_Y, CONTENT_WIDTH, 21);
    targetCtx.fillStyle = '#e8e8e8';
    targetCtx.font = '900 13px sans-serif';
    targetCtx.fillText('プレイの傾向 / Playstyle (Game)', CONTENT_LEFT + 12, SEC2_Y + 5);

    const R4 = SEC2_Y + 46;   // 396
    drawItem(CONTENT_LEFT, R4, '好きな脚質 / Favorite Strategy',   cardData.style, 330);
    drawItem(COL2_X,       R4, 'よく遊ぶ時間帯 / Usual Play Time', cardData.time,  330);

    targetCtx.restore();

    targetCtx.strokeStyle = '#555555';
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    targetCtx.moveTo(WAKU_BAR_WIDTH, COMMENT_LINE_Y);
    targetCtx.lineTo(CARD_WIDTH, COMMENT_LINE_Y);
    targetCtx.stroke();

    targetCtx.fillStyle = '#000000';
    const commentLength   = cardData.comment.length;
    const commentFontSize = commentLength > 60 ? 15 : commentLength > 30 ? 18 : 21;
    targetCtx.font = `900 ${commentFontSize}px sans-serif`;
    wrapText(targetCtx, cardData.comment, CONTENT_LEFT, COMMENT_LINE_Y + 12, CONTENT_WIDTH, commentFontSize * 1.3, 3);

    targetCtx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    targetCtx.font = 'bold 11px sans-serif';
    targetCtx.textAlign = 'right';
    targetCtx.fillText('© 2026 Musyn Reagan', CARD_WIDTH - 12, CARD_HEIGHT - 12);
}

function updateCardData() {
    cardData.waku = currentWaku;
    cardData.name = inputs.n.value.trim() || "RIDER NAME";

    cardData.sns = inputs.sns.value.trim() || '---';

    cardData.exp       = "競輪歴 / Keirin History: " + (inputs.exp.value.trim() || DEFAULT_PLACEHOLDER);
    cardData.favRider  = inputs.favRider.value.trim()  || DEFAULT_PLACEHOLDER;
    cardData.region    = inputs.region.value.trim()    || DEFAULT_PLACEHOLDER;
    cardData.bank      = inputs.bank.value.trim()      || DEFAULT_PLACEHOLDER;
    cardData.memorable = inputs.memorable.value.trim() || DEFAULT_PLACEHOLDER;
    cardData.style     = inputs.style.value            || "---";
    cardData.time      = inputs.time.value.trim()      || DEFAULT_PLACEHOLDER;
    cardData.comment   = inputs.com.value.trim()       || DEFAULT_COMMENT;
}

function updatePreview() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
        updateCardData();
        drawCard();
    }, 50);
}

// ========== イベントハンドラ ==========

function updateWaku() {
    currentWaku = inputs.waku.value;
    const theme = WAKU_COLORS[currentWaku];

    const uiColor = (theme.bg === "#ffffff" || theme.bg === "#000000") ? "#ccc" : theme.bg;
    document.documentElement.style.setProperty('--k-color',   uiColor);
    document.documentElement.style.setProperty('--txt-color', theme.tx);

    document.querySelectorAll('.g-title').forEach(el => {
        el.style.color       = uiColor;
        el.style.borderColor = uiColor;
    });

    updatePreview();
}

function loadImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('画像サイズは5MB以下にしてください', 'error');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            openCropModal(img);
        };
        img.src = event.target.result;
    };
    reader.onerror = () => showToast('画像の読み込みに失敗しました', 'error');
    reader.readAsDataURL(file);
}

// ========== トリミングUI ==========
const CROP_SIZE   = 240;
const CROP_RADIUS = 120;

let cropSourceImage    = null;
let cropOffsetX        = 0;
let cropOffsetY        = 0;
let cropScale          = 1;
let cropIsDragging     = false;
let cropDragStartX     = 0;
let cropDragStartY     = 0;
let cropDragStartOX    = 0;
let cropDragStartOY    = 0;
let cropRafId          = null;

function openCropModal(img) {
    cropSourceImage = img;
    cropOffsetX = 0;
    cropOffsetY = 0;
    const minDim   = Math.min(img.naturalWidth, img.naturalHeight);
    const initScale = CROP_SIZE / minDim;
    cropScale = initScale;
    cropSlider.min   = initScale;
    cropSlider.max   = initScale * 4;
    cropSlider.step  = initScale * 0.01;
    cropSlider.value = initScale;
    cropModal.classList.add('active');
    scheduleCropDraw();
}

function closeCropModal() {
    cropModal.classList.remove('active');
    cropSourceImage = null;
    if (cropRafId !== null) {
        cancelAnimationFrame(cropRafId);
        cropRafId = null;
    }
}

function drawCropPreview() {
    cropRafId = null;
    if (!cropSourceImage) return;

    cropCtx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    cropCtx.fillStyle = '#111';
    cropCtx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);

    cropCtx.save();
    cropCtx.beginPath();
    cropCtx.arc(CROP_RADIUS, CROP_RADIUS, CROP_RADIUS, 0, Math.PI * 2);
    cropCtx.clip();

    const drawW = cropSourceImage.naturalWidth  * cropScale;
    const drawH = cropSourceImage.naturalHeight * cropScale;
    cropCtx.drawImage(
        cropSourceImage,
        CROP_RADIUS + cropOffsetX - drawW / 2,
        CROP_RADIUS + cropOffsetY - drawH / 2,
        drawW, drawH
    );
    cropCtx.restore();

    cropCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    cropCtx.lineWidth = 1;
    cropCtx.beginPath();
    cropCtx.arc(CROP_RADIUS, CROP_RADIUS, CROP_RADIUS - 1, 0, Math.PI * 2);
    cropCtx.stroke();
}

function scheduleCropDraw() {
    if (cropRafId === null) {
        cropRafId = requestAnimationFrame(drawCropPreview);
    }
}

cropCanvas.addEventListener('mousedown', e => {
    cropIsDragging  = true;
    cropDragStartX  = e.clientX;
    cropDragStartY  = e.clientY;
    cropDragStartOX = cropOffsetX;
    cropDragStartOY = cropOffsetY;
    e.preventDefault();
});

window.addEventListener('mousemove', e => {
    if (!cropIsDragging) return;
    cropOffsetX = cropDragStartOX + (e.clientX - cropDragStartX);
    cropOffsetY = cropDragStartOY + (e.clientY - cropDragStartY);
    scheduleCropDraw();
});

window.addEventListener('mouseup', () => { cropIsDragging = false; });

cropCanvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    cropIsDragging  = true;
    cropDragStartX  = t.clientX;
    cropDragStartY  = t.clientY;
    cropDragStartOX = cropOffsetX;
    cropDragStartOY = cropOffsetY;
    e.preventDefault();
}, { passive: false });

window.addEventListener('touchmove', e => {
    if (!cropIsDragging) return;
    const t = e.touches[0];
    cropOffsetX = cropDragStartOX + (t.clientX - cropDragStartX);
    cropOffsetY = cropDragStartOY + (t.clientY - cropDragStartY);
    scheduleCropDraw();
}, { passive: true });

window.addEventListener('touchend', () => { cropIsDragging = false; });

cropSlider.addEventListener('input', () => {
    cropScale = parseFloat(cropSlider.value);
    scheduleCropDraw();
});

cropConfirmBtn.addEventListener('click', () => {
    const outSize = ICON_RADIUS_INNER * 2;
    const ratio   = outSize / CROP_SIZE;

    const offCanvas    = document.createElement('canvas');
    offCanvas.width    = outSize;
    offCanvas.height   = outSize;
    const offCtx       = offCanvas.getContext('2d');

    offCtx.beginPath();
    offCtx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    offCtx.clip();

    const drawW = cropSourceImage.naturalWidth  * cropScale * ratio;
    const drawH = cropSourceImage.naturalHeight * cropScale * ratio;
    offCtx.drawImage(
        cropSourceImage,
        (outSize / 2) + cropOffsetX * ratio - drawW / 2,
        (outSize / 2) + cropOffsetY * ratio - drawH / 2,
        drawW, drawH
    );

    const finalImg = new Image();
    finalImg.onload = () => {
        userIconImage = finalImg;
        closeCropModal();
        updatePreview();
    };
    finalImg.src = offCanvas.toDataURL('image/png');
});

cropCancelBtn.addEventListener('click', closeCropModal);

function saveImage() {
    saveBtn.disabled = true;
    saveBtn.classList.add('saving');
    saveBtn.textContent = '生成中...';
    loadingOverlay.classList.add('active');

    setTimeout(() => {
        try {
            const outputCanvas        = document.createElement('canvas');
            outputCanvas.width        = CARD_WIDTH * 2;
            outputCanvas.height       = CARD_HEIGHT * 2;
            const outputCtx           = outputCanvas.getContext('2d');

            outputCtx.scale(2, 2);
            drawCard(outputCtx);

            const filename = 'keirincardprofile.png';

            outputCanvas.toBlob(blob => {
                if (!blob) throw new Error('画像生成失敗');

                const url  = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = filename;
                link.href     = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast('画像を保存しました！', 'success');

                saveBtn.disabled = false;
                saveBtn.classList.remove('saving');
                saveBtn.textContent = '画像を保存する / Save Image 📸';
                loadingOverlay.classList.remove('active');
            }, 'image/png');
        } catch (err) {
            console.error('保存エラー:', err);
            showToast('画像の保存に失敗しました', 'error');
            saveBtn.disabled = false;
            saveBtn.classList.remove('saving');
            saveBtn.textContent = '画像を保存する / Save Image 📸';
            loadingOverlay.classList.remove('active');
        }
    }, 0);
}

function adjustScale() {
    const container = document.querySelector('.card-container');
    const scaleX    = container.offsetWidth  / (CARD_WIDTH  + 8);
    const scaleY    = container.offsetHeight / (CARD_HEIGHT + 8);
    const scale     = Math.min(scaleX, scaleY, 1.0);
    canvas.style.transform = `scale(${scale})`;
}

// ========== ユーティリティ ==========

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className   = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

function updateCounter(input, counter, maxLength) {
    const length = input.value.length;
    counter.textContent = `${length} / ${maxLength}`;

    counter.classList.remove('warning', 'danger');
    if (length > maxLength * 0.9) {
        counter.classList.add('danger');
    } else if (length > maxLength * 0.7) {
        counter.classList.add('warning');
    }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = text.split('');
    let line  = '';
    let lines = [];

    for (let i = 0; i < chars.length; i++) {
        const testLine = line + chars[i];
        const metrics  = ctx.measureText(testLine);

        if (metrics.width > maxWidth && line !== '') {
            lines.push(line);
            line = chars[i];
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        let last = lines[maxLines - 1];
        if (last.length > 3) {
            lines[maxLines - 1] = last.slice(0, -3) + '...';
        }
    }

    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

// ========== イベントリスナー登録 ==========
inputs.waku.addEventListener('change', updateWaku);

document.getElementById('in-pattern').addEventListener('change', e => {
    currentPattern = e.target.value;
    updatePreview();
});
inputs.icon.addEventListener('change', loadImage);

const inputCounterPairs = [
    { input: inputs.n,         counter: counters.n,         max: 20  },
    { input: inputs.sns,       counter: counters.sns,       max: 30  },
    { input: inputs.exp,       counter: counters.exp,       max: 30  },
    { input: inputs.favRider,  counter: counters.favRider,  max: 17  },
    { input: inputs.region,    counter: counters.region,    max: 17  },
    { input: inputs.bank,      counter: counters.bank,      max: 17  },
    { input: inputs.memorable, counter: counters.memorable, max: 17  },
    { input: inputs.time,      counter: counters.time,      max: 15  },
    { input: inputs.com,       counter: counters.com,       max: 130 }
];

inputCounterPairs.forEach(({ input, counter, max }) => {
    input.addEventListener('input', () => {
        updateCounter(input, counter, max);
        updatePreview();
    });
});

inputs.style.addEventListener('change', updatePreview);
saveBtn.addEventListener('click', saveImage);
window.addEventListener('resize', () => { adjustScale(); fitBpSub(); });

// bp-subをbp-banner-rowの幅にscaleXで合わせる
function fitBpSub() {
    document.querySelectorAll('.bp-banner-block').forEach(block => {
        const row = block.querySelector('.bp-banner-row');
        const sub = block.querySelector('.bp-sub');
        if (!row || !sub) return;
        sub.style.transform = 'scaleX(1)';
        const rowW = row.getBoundingClientRect().width;
        const subW = sub.getBoundingClientRect().width;
        if (rowW > 0 && subW > 0) {
            sub.style.transform = `scaleX(${rowW / subW})`;
        }
    });
}

// ========== 起動処理 ==========
window.addEventListener('load', () => {
    createDotPattern();
    initWatermark();
    adjustScale();
    updateWaku();
    updateCardData();
    drawCard();

    inputCounterPairs.forEach(({ input, counter, max }) => {
        updateCounter(input, counter, max);
    });

    // フォント読み込み完了後に再計算
    if (document.fonts) {
        document.fonts.ready.then(fitBpSub);
    } else {
        setTimeout(fitBpSub, 400);
    }

    const howtoToggle = document.getElementById('howto-toggle');
    const howtoBody   = document.getElementById('howto-body');
    if (howtoToggle && howtoBody) {
        howtoToggle.addEventListener('click', () => {
            const open = howtoToggle.getAttribute('aria-expanded') === 'true';
            howtoToggle.setAttribute('aria-expanded', String(!open));
            howtoBody.classList.toggle('open', !open);
            howtoToggle.querySelector('.howto-arrow').textContent = open ? '▼' : '▲';
        });
    }

});
