/* ============================================================
   financial-center.js - صفحة المركز المالي (V2)
   (تحليلات + مقارنة + نصائح + تنبؤات)
   ============================================================ */

import * as db from '../core/db.js';
import { money, formatDate } from '../core/utils.js';
import {
  getFinancialSummary,
  getMonthlyComparison,
  getIncomeBreakdown,
  getBreakEvenAnalysis,
  getSmartTips,
  getForecast
} from '../core/financial-calculator.js';

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                     'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function renderFinancialCenterPage(container) {
  const summary = getFinancialSummary();
  const comparison = getMonthlyComparison();
  const breakdown = getIncomeBreakdown();
  const breakEven = getBreakEvenAnalysis();
  const tips = getSmartTips();
  const forecast = getForecast();

  // حساب أعلى قيمة للرسم البياني
  const maxRevenue = Math.max(...breakdown.map(b => b.revenue), 1);

  // ترتيب النصائح حسب الأهمية
  const tipPriority = { danger: 1, warning: 2, success: 3, info: 4 };
  const sortedTips = [...tips].sort((a, b) => (tipPriority[a.type] || 5) - (tipPriority[b.type] || 5));

  let html = `
    <!-- ============================================================
         ملخص مالي أساسي
         ============================================================ -->
    <div class="card" style="background: linear-gradient(135deg, ${summary.isProfitable ? 'var(--primary-color), var(--primary-dark)' : '#C62828, #8E0000'}); color: white; border: none;">
      <h2 style="color: white; margin-bottom: 4px;">💰 المركز المالي</h2>
      <p style="color: rgba(255,255,255,0.8); margin: 0 0 16px 0; font-size: 13px;">تحليلات مالية شاملة لورشتك</p>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; opacity: 0.85;">💰 الإيرادات</div>
          <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">${money(summary.totalRevenue)}</div>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; opacity: 0.85;">📉 المصروفات</div>
          <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">${money(summary.totalExpenses)}</div>
        </div>
        <div style="background: rgba(255,255,255,0.25); padding: 12px; border-radius: var(--radius-md); grid-column: span 2;">
          <div style="font-size: 11px; opacity: 0.9;">✨ صافي الربح</div>
          <div style="font-size: 26px; font-weight: 800; margin-top: 4px; color: ${summary.isProfitable ? '#FFD54F' : '#FF8A80'};">
            ${summary.isProfitable ? '' : '-'}${money(Math.abs(summary.netProfit))} <span style="font-size: 14px;">جنيه</span>
          </div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
            هامش الربح: ${summary.profitMargin}%
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================
         المتبقي على العملاء
         ============================================================ -->
    ${summary.pendingPayments > 0 ? `
      <div class="card" style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); border: none;">
        <div class="flex-between">
          <div>
            <div style="font-size: 12px; color: #F57F17; font-weight: 700; margin-bottom: 4px;">💸 متبقي على العملاء</div>
            <div style="font-size: 22px; font-weight: 800; color: #E65100;">${money(summary.pendingPayments)} ج</div>
          </div>
          <div style="font-size: 32px;">💰</div>
        </div>
      </div>
    ` : ''}

    <!-- ============================================================
         مقارنة الشهور
         ============================================================ -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📊 هذا الشهر vs الشهر الماضي</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
        <div style="background: var(--bg-color); padding: 10px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">💰 الإيرادات</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--primary-color);">${money(comparison.current.revenue)} ج</div>
          <div style="font-size: 11px; margin-top: 4px; color: ${comparison.changes.revenue >= 0 ? '#2E7D32' : '#C62828'};">
            ${comparison.changes.revenue >= 0 ? '📈' : '📉'} ${Math.abs(comparison.changes.revenue)}% ${comparison.last.revenue > 0 ? 'مقارنة بالشهر الماضي' : ''}
          </div>
        </div>
        <div style="background: var(--bg-color); padding: 10px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">📉 المصروفات</div>
          <div style="font-size: 16px; font-weight: 800; color: #C62828;">${money(comparison.current.expenses)} ج</div>
          <div style="font-size: 11px; margin-top: 4px; color: ${comparison.changes.expenses <= 0 ? '#2E7D32' : '#C62828'};">
            ${comparison.changes.expenses >= 0 ? '📈' : '📉'} ${Math.abs(comparison.changes.expenses)}% ${comparison.last.expenses > 0 ? 'مقارنة بالشهر الماضي' : ''}
          </div>
        </div>
        <div style="background: var(--bg-color); padding: 10px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">✨ صافي الربح</div>
          <div style="font-size: 16px; font-weight: 800; color: ${comparison.current.profit >= 0 ? 'var(--primary-color)' : '#C62828'};">${money(comparison.current.profit)} ج</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">الشهر الماضي: ${money(comparison.last.profit)} ج</div>
        </div>
        <div style="background: var(--bg-color); padding: 10px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">📋 عدد الطلبات</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--primary-color);">${comparison.current.orders}</div>
          <div style="font-size: 11px; margin-top: 4px; color: ${comparison.changes.orders >= 0 ? '#2E7D32' : '#C62828'};">
            ${comparison.changes.orders >= 0 ? '📈' : '📉'} ${Math.abs(comparison.changes.orders)}% ${comparison.last.orders > 0 ? 'مقارنة بالشهر الماضي' : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================
         رسم بياني للمبيعات
         ============================================================ -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📈 الإيرادات آخر 6 شهور</h3>
      <div style="display: flex; align-items: flex-end; gap: 6px; height: 150px; padding: 10px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
        ${breakdown.map(m => {
          const height = maxRevenue > 0 ? Math.max(5, (m.revenue / maxRevenue) * 130) : 5;
          return `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
              <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 4px; text-align: center;">${m.revenue > 0 ? money(m.revenue) : ''}</div>
              <div style="width: 100%; height: ${height}px; background: linear-gradient(180deg, var(--primary-color), var(--primary-dark)); border-radius: 4px 4px 0 0;"></div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display: flex; gap: 6px;">
        ${breakdown.map(m => `
          <div style="flex: 1; text-align: center; font-size: 10px; color: var(--text-muted);">${MONTH_NAMES[m.month - 1].slice(0, 3)}</div>
        `).join('')}
      </div>
    </div>

    <!-- ============================================================
         نقطة التعادل
         ============================================================ -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">⚖️ نقطة التعادل (Break-even)</h3>
      <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
        كم تحتاج شهرياً لتغطية مصروفاتك؟
      </p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
        <div style="text-align: center; padding: 12px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">متوسط قيمة الطلب</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--primary-color);">${money(breakEven.avgOrderValue)} ج</div>
        </div>
        <div style="text-align: center; padding: 12px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">مصروفات شهرية</div>
          <div style="font-size: 18px; font-weight: 800; color: #C62828;">${money(breakEven.monthlyExpenses)} ج</div>
        </div>
        <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, #FFF8E1, #FFECB3); border-radius: var(--radius-md); grid-column: span 2;">
          <div style="font-size: 12px; color: #F57F17; font-weight: 700; margin-bottom: 4px;">📊 عدد الطلبات المطلوبة شهرياً</div>
          <div style="font-size: 24px; font-weight: 800; color: #E65100;">${breakEven.ordersNeededMonthly} طلب</div>
          <div style="font-size: 11px; color: #F57F17; margin-top: 4px;">
            لتغطية مصروفاتك بالكامل
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================
         التنبؤ المالي
         ============================================================ -->
    ${forecast ? `
      <div class="card">
        <h3 class="card-title" style="font-size: 15px;">🔮 توقعات الشهور القادمة</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
          <span style="font-size: 12px; color: var(--text-muted);">الاتجاه العام:</span>
          <strong style="font-size: 13px; color: ${forecast.trend >= 0 ? '#2E7D32' : '#C62828'};">
            ${forecast.trend >= 0 ? '📈' : '📉'} ${Math.abs(forecast.trend)}%
          </strong>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          ${forecast.forecast.map(f => `
            <div style="text-align: center; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md);">
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">${MONTH_NAMES[f.month - 1].slice(0, 3)}</div>
              <div style="font-size: 14px; font-weight: 800; color: var(--primary-color);">${money(f.predicted)} ج</div>
            </div>
          `).join('')}
        </div>
        <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">
          💡 تنبؤ تقديري بناءً على الاتجاه الحالي
        </div>
      </div>
    ` : ''}

    <!-- ============================================================
         النصائح المالية الذكية
         ============================================================ -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">💡 نصائح مالية ذكية</h3>
      ${sortedTips.length === 0 ? `
        <div class="empty-state" style="padding: 20px;">
          <div style="font-size: 32px; margin-bottom: 8px;">🌟</div>
          <p style="font-size: 13px;">لا توجد نصائح حالياً — كل شيء على ما يرام!</p>
        </div>
      ` : sortedTips.map(tip => {
        const colors = {
          danger: { bg: '#FFEBEE', border: '#C62828', text: '#B71C1C' },
          warning: { bg: '#FFF3E0', border: '#F57C00', text: '#E65100' },
          success: { bg: '#E8F5E9', border: '#2E7D32', text: '#1B5E20' },
          info: { bg: '#E3F2FD', border: '#1565C0', text: '#0D47A1' }
        };
        const c = colors[tip.type] || colors.info;
        return `
          <div style="background: ${c.bg}; border-right: 4px solid ${c.border}; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 8px; display: flex; gap: 10px; align-items: flex-start;">
            <div style="font-size: 20px; flex-shrink: 0;">${tip.icon}</div>
            <div style="flex: 1; font-size: 13px; color: ${c.text}; line-height: 1.5;">${tip.text}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.innerHTML = html;
}
