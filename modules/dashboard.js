// Dashboard presentation layer. Data calculation remains in app.js for now;
// this module owns density, hierarchy and the visible data context.
(function initDashboardModule() {
  function setup() {
    const dashboard = document.getElementById('dashboard');
    const kpiGrid = dashboard?.querySelector('.kpi-grid');
    if (!dashboard || !kpiGrid || dashboard.dataset.uiReady === 'true') return;

    dashboard.dataset.uiReady = 'true';

    const heading = dashboard.querySelector('.dashboard-heading');
    if (heading) {
      const context = document.createElement('p');
      context.id = 'dashboardContext';
      context.className = 'dashboard-context';
      context.setAttribute('aria-live', 'polite');
      context.textContent = 'กำลังสรุปข้อมูลตามโรงผลิตและช่วงเวลาที่เลือก';
      heading.appendChild(context);
    }

    const cards = [...kpiGrid.children];
    cards.forEach((card, index) => {
      card.classList.add(index < 6 ? 'kpi-primary' : 'kpi-secondary');
    });

    const moreButton = document.createElement('button');
    moreButton.type = 'button';
    moreButton.className = 'dashboard-more-btn';
    moreButton.setAttribute('aria-expanded', 'false');
    moreButton.setAttribute('aria-controls', 'dashboardSecondaryKpis');
    moreButton.textContent = 'แสดง KPI เพิ่มเติม';

    const secondary = document.createElement('div');
    secondary.id = 'dashboardSecondaryKpis';
    secondary.className = 'dashboard-secondary-kpis';
    cards.slice(6).forEach(card => secondary.appendChild(card));
    kpiGrid.appendChild(secondary);
    kpiGrid.parentNode.insertBefore(moreButton, kpiGrid.nextSibling);

    moreButton.addEventListener('click', () => {
      const expanded = moreButton.getAttribute('aria-expanded') === 'true';
      moreButton.setAttribute('aria-expanded', String(!expanded));
      secondary.classList.toggle('is-open', !expanded);
      moreButton.textContent = expanded ? 'แสดง KPI เพิ่มเติม' : 'ซ่อน KPI เพิ่มเติม';
    });

    const advancedNodes = [
      dashboard.querySelector('.charts-grid'),
      ...dashboard.querySelectorAll('.charts-grid-3'),
      dashboard.querySelector('.work-calendar-card')
    ].filter(Boolean);
    const advancedDetails = document.createElement('details');
    advancedDetails.className = 'dashboard-details';
    advancedDetails.open = true;
    const summary = document.createElement('summary');
    summary.textContent = 'วิเคราะห์เชิงลึกและการตั้งค่า';
    advancedDetails.appendChild(summary);
    advancedNodes.forEach(node => advancedDetails.appendChild(node));
    dashboard.appendChild(advancedDetails);

    window.dashboardUi = {
      updateContext(text) {
        const el = document.getElementById('dashboardContext');
        if (el && text) el.textContent = text;
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, {once: true});
  } else {
    setup();
  }
})();
