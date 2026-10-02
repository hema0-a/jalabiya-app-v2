/* ============================================================
   pricing-calculator.js - حاسبة تسعير الجلابية (V2)
   (تحسب السعر بناءً على التكاليف + هامش الربح + حفظ السجل)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { money, uid, today } from '../core/utils.js';

// مفتاح التخزين لسجل الحسابات
const HISTORY_KEY = 'jalabiya_v2_pricing_history';

/* ============================================================
   قراءة/حفظ سجل الحسابات
   ============================================================ */
function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('فشل حفظ سجل التسعير:', e);
  }
}

/* ============================================================
   صفحة حاسبة التسعير
   ============================================================ */
export function renderPricingCalculatorPage(container) {
  container.innerHTML = `
    <div class="card">
      <h2 class="card-title no-border">💰 حاسبة تسعير الجلابية</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        احسب سعر البيع المناسب بناءً على التكاليف وهامش الربح.
      </p>

      <form id="pricing-form">
        <!-- نوع الجلابية -->
        <div class="form-group">
          <label>نوع الجلابية / الوصف</label>
          <input type="text" id="pc-type" class="form-control" placeholder="مثال: جلابية سادة رجالي">
        </div>

        <!-- القماش -->
        <div class="card" style="background: var(--bg-color); border: none; padding: 12px; margin-bottom: 12px;">
          <h4 style="font-size: 14px; margin-bottom: 10px;">🧵 تكاليف القماش والخامات</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 12px;">الأمتار المطلوبة</label>
              <input type="number" id="pc-meters" class="form-control" value="3" min="0" step="0.5">
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 12px;">سعر المتر</label>
              <input type="number" id="pc-meter-price" class="form-control" value="0" min="0" step="any">
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-size: 12px;">تكاليف إضافية (خيوط، أزرار، إكسسوارات)</label>
            <input type="number" id="pc-extras" class="form-control" value="0" min="0" step="any">
          </div>
        </div>

        <!-- أجور العمال -->
        <div class="card" style="background: var(--bg-color); border: none; padding: 12px; margin-bottom: 12px;">
          <h4 style="font-size: 14px; margin-bottom: 10px;">👷 أجور العمال</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 12px;">ساعات العمل</label>
              <input type="number" id="pc-hours" class="form-control" value="0" min="0" step="0.5">
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 12px;">سعر الساعة</label>
              <input type="number" id="pc-hourly" class="form-control" value="0" min="0" step="any">
            </div>
          </div>
        </div>

        <!-- مصاريف غير مباشرة -->
        <div class="form-group">
          <label>المصاريف غير المباشرة (إيجار، كهرباء، إلخ)</label>
          <input type="number" id="pc-overhead" class="form-control" value="0" min="0" step="any" placeholder="0">
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            💡 يمكنك احتساب نسبة ثابتة لكل جلابية (مثلاً 20 جنيه).
          </div>
        </div>

        <!-- هامش الربح -->
        <div class="form-group">
          <label>هامش الربح المطلوب (%)</label>
          <input type="number" id="pc-margin" class="form-control" value="30" min="0" max="500" step="1">
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <button type="button" class="btn btn-outline margin-preset" data-margin="20" style="flex: 1; font-size: 11px; min-height: 30px; padding: 4px;">20%</button>
            <button type="button" class="btn btn-outline margin-preset" data-margin="30" style="flex: 1; font-size: 11px; min-height: 30px; padding: 4px;">30%</button>
            <button type="button" class="btn btn-outline margin-preset" data-margin="50" style="flex: 1; font-size: 11px; min-height: 30px; padding: 4px;">50%</button>
            <button type="button" class="btn btn-outline margin-preset" data-margin="100" style="flex: 1; font-size: 11px; min-height: 30px; padding: 4px;">100%</button>
          </div>
        </div>
      </form>

      <!-- النتيجة -->
      <div id="pricing-result" style="margin-top: 16px;"></div>
    </div>

    <!-- سجل الحسابات -->
    <div class="card">
      <div class="flex-between mb-2">
        <h3 class="card-title no-border" style="margin: 0; font-size: 16px;">📋 سجل الحسابات</h3>
        <button class="btn btn-outline" id="clear-history-btn" style="font-size: 12px; padding: 6px 12px; min-height: 32px;">🗑️ مسح</button>
      </div>
      <div id="pricing-history"></div>
    </div>
  `;

  const form = container.querySelector('#pricing-form');
  const resultDiv = container.querySelector('#pricing-result');
  const historyDiv = container.querySelector('#pricing-history');

  // ============================================================
  // حساب السعر
  // ============================================================
  function calculate() {
    const type = form.querySelector('#pc-type').value.trim() || 'جلابية';
    const meters = parseFloat(form.querySelector('#pc-meters').value) || 0;
    const meterPrice = parseFloat(form.querySelector('#pc-meter-price').value) || 0;
    const extras = parseFloat(form.querySelector('#pc-extras').value) || 0;
    const hours = parseFloat(form.querySelector('#pc-hours').value) || 0;
    const hourly = parseFloat(form.querySelector('#pc-hourly').value) || 0;
    const overhead = parseFloat(form.querySelector('#pc-overhead').value) || 0;
    const margin = parseFloat(form.querySelector('#pc-margin').value) || 0;

    // الحسابات
    const fabricCost = meters * meterPrice;
    const laborCost = hours * hourly;
    const totalCost = fabricCost + extras + laborCost + overhead;
    const profit = totalCost * (margin / 100);
    const sellingPrice = totalCost + profit;

    // عرض النتيجة
    resultDiv.innerHTML = `
      <div class="card" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; border: none;">
        <h3 style="color: white; margin-bottom: 12px; font-size: 16px;">📊 نتائج الحساب</h3>
        
        <div style="background: rgba(255,255,255,0.15); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 12px; opacity: 0.9;">سعر البيع المقترح</div>
          <div style="font-size: 32px; font-weight: 800; margin-top: 4px;">${money(sellingPrice)} <span style="font-size: 16px;">جنيه</span></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
          <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: var(--radius-sm);">
            <div style="opacity: 0.8; font-size: 11px;">تكلفة القماش</div>
            <div style="font-weight: 700;">${money(fabricCost)}</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: var(--radius-sm);">
            <div style="opacity: 0.8; font-size: 11px;">أجر العمال</div>
            <div style="font-weight: 700;">${money(laborCost)}</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: var(--radius-sm);">
            <div style="opacity: 0.8; font-size: 11px;">إضافات ومصاريف</div>
            <div style="font-weight: 700;">${money(extras + overhead)}</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: var(--radius-sm);">
            <div style="opacity: 0.8; font-size: 11px;">إجمالي التكلفة</div>
            <div style="font-weight: 700;">${money(totalCost)}</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: var(--radius-sm); grid-column: span 2;">
            <div style="opacity: 0.8; font-size: 11px;">الربح المتوقع (${margin}%)</div>
            <div style="font-weight: 800; font-size: 16px;">${money(profit)}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
          <button type="button" class="btn btn-accent" id="save-calc-btn" style="background: white; color: var(--primary-color);">💾 حفظ الحساب</button>
          <button type="button" class="btn" id="use-in-order-btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4);">📋 إنشاء طلب</button>
        </div>
      </div>
    `;

    // زر حفظ الحساب
    resultDiv.querySelector('#save-calc-btn').addEventListener('click', () => {
      const history = getHistory();
      history.unshift({
        id: uid(),
        type,
        meters,
        meterPrice,
        extras,
        hours,
        hourly,
        overhead,
        margin,
        fabricCost,
        laborCost,
        totalCost,
        profit,
        sellingPrice,
        date: today(),
        createdAt: Date.now()
      });
      // الاحتفاظ بآخر 50 حساب فقط
      if (history.length > 50) history.length = 50;
      saveHistory(history);
      toast.success('تم حفظ الحساب');
      renderHistory();
    });

    // زر إنشاء طلب
    resultDiv.querySelector('#use-in-order-btn').addEventListener('click', () => {
      toast.info('انتقل إلى صفحة الطلبات وأضف الطلب بالسعر: ' + money(sellingPrice) + ' جنيه');
      window.location.hash = '/orders';
    });
  }

  // ============================================================
  // عرض السجل
  // ============================================================
  function renderHistory() {
    const history = getHistory();

    if (history.length === 0) {
      historyDiv.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
          <p style="font-size: 13px;">لا توجد حسابات محفوظة بعد.</p>
        </div>
      `;
      return;
    }

    let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    history.forEach(h => {
      html += `
        <div class="history-item" data-id="${h.id}" style="border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 4px;">
            <div style="font-weight: 700; font-size: 14px;">${h.type}</div>
            <div style="font-weight: 800; color: var(--primary-color); font-size: 15px;">${money(h.sellingPrice)}</div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">
            📅 ${h.date} | 💰 التكلفة: ${money(h.totalCost)} | 📈 الربح: ${money(h.profit)} (${h.margin}%)
          </div>
        </div>
      `;
    });
    html += `</div>`;
    historyDiv.innerHTML = html;

    // النقر على عنصر لاستعادته في الحاسبة
    historyDiv.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const calc = history.find(h => h.id === item.dataset.id);
        if (!calc) return;
        form.querySelector('#pc-type').value = calc.type;
        form.querySelector('#pc-meters').value = calc.meters;
        form.querySelector('#pc-meter-price').value = calc.meterPrice;
        form.querySelector('#pc-extras').value = calc.extras;
        form.querySelector('#pc-hours').value = calc.hours;
        form.querySelector('#pc-hourly').value = calc.hourly;
        form.querySelector('#pc-overhead').value = calc.overhead;
        form.querySelector('#pc-margin').value = calc.margin;
        calculate();
        toast.info('تم استعادة الحساب');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // مراقبة التغييرات في جميع الحقول وحساب تلقائي
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', calculate);
  });

  // أزرار النسب الجاهزة
  container.querySelectorAll('.margin-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      form.querySelector('#pc-margin').value = btn.dataset.margin;
      calculate();
    });
  });

  // زر مسح السجل
  container.querySelector('#clear-history-btn').addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح سجل الحسابات؟')) {
      saveHistory([]);
      renderHistory();
      toast.success('تم مسح السجل');
    }
  });

  // الحساب الأولي + عرض السجل
  calculate();
  renderHistory();
}
