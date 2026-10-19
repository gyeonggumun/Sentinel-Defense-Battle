// app.js의 selectView()는 선택 탭만 tabindex=0으로 두는 roving tabindex를 씁니다.
// 이 화면은 별도 요구사항에 따라 Tab으로도 세 메뉴를 순서대로 이동하므로,
// Tab 기본 동작 전에 동기적으로 다음 메뉴에 초점을 옮깁니다.
const nav = document.getElementById('nav');

if (nav) {
  const getTabs = () => [...nav.querySelectorAll('[role="tab"]')];

  function keepMenuTabsInTabOrder() {
    for (const tab of getTabs()) {
      if (tab.tabIndex !== 0) tab.tabIndex = 0;
    }
  }

  // Tab 기본 동작보다 먼저 보정합니다. MutationObserver만으로는 selectView()
  // 가 tabindex=-1을 설정한 직후의 브라우저 포커스 계산을 보장하지 못합니다.
  nav.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    const tabs = getTabs();
    const current = event.target instanceof Element
      ? event.target.closest('[role="tab"]')
      : null;
    const index = tabs.indexOf(current);
    if (index < 0) return;

    // 선택 상태 변경과 무관하게 모든 메뉴가 순차 Tab 정지점이어야 합니다.
    keepMenuTabsInTabOrder();

    const nextIndex = index + (event.shiftKey ? -1 : 1);
    if (nextIndex >= 0 && nextIndex < tabs.length) {
      event.preventDefault();
      tabs[nextIndex].focus();
    }
    // 메뉴 양 끝에서는 기본 Tab 이동을 유지합니다. 앞으로는 선택된 패널,
    // 뒤로는 메뉴 앞의 일반적인 포커스 순서를 따릅니다.
  }, true);

  // 앱이 선택 탭 외의 tabindex를 바꿔도 다음 Tab 전까지 복구하고,
  // Tab 키 핸들러가 실제 포커스 이동을 동기적으로 보장합니다.
  const observer = new MutationObserver(keepMenuTabsInTabOrder);
  observer.observe(nav, {
    subtree: true,
    attributes: true,
    attributeFilter: ['tabindex'],
  });
  keepMenuTabsInTabOrder();

  // 메뉴 다음 Tab은 선택된 패널 자체에 도달하고, 이후에는 패널 내부로 이동합니다.
  // hidden 패널은 브라우저 기본 순서에서 제외됩니다.
  for (const panel of document.querySelectorAll('[role="tabpanel"]')) {
    panel.tabIndex = 0;
  }

  const note = nav.parentElement?.querySelector('.sidebar-note');
  if (note) {
    note.textContent = 'Tab으로 보호 현황 → 업무 앱 → 보안 기록을 순서대로 이동하고 Enter로 화면을 선택합니다. 마지막 메뉴 다음 Tab은 선택한 화면으로 이동합니다. Shift+Tab으로 이전 메뉴로 돌아갈 수 있습니다.';
  }

  // 마우스 클릭으로 선택한 메뉴에 초점을 두어 이후 키보드 이동이 자연스럽게 이어집니다.
  nav.addEventListener('click', (event) => {
    const target = event.target;
    const tab = target instanceof Element ? target.closest('[role="tab"]') : null;
    if (!tab || !nav.contains(tab)) return;
    keepMenuTabsInTabOrder();
    tab.focus();
  });
}
