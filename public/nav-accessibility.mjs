// app.js의 selectView()는 선택 탭만 tabindex=0으로 두는 roving tabindex를 적용합니다.
// 이 UI에서는 사용자가 요청한 순서대로 Tab으로도 세 메뉴를 이동할 수 있어야 하므로
// 앱의 탭 상태 변경 뒤에도 세 버튼을 모두 순차 Tab 정지점으로 유지합니다.
const nav = document.getElementById('nav');

if (nav) {
  const getTabs = () => [...nav.querySelectorAll('[role="tab"]')];

  function keepMenuTabsInTabOrder() {
    for (const tab of getTabs()) {
      if (tab.tabIndex !== 0) tab.tabIndex = 0;
    }
  }

  // app.js의 selectView()가 비선택 탭을 -1로 바꾸므로, 그 변경 직후 보정합니다.
  // 이미 0인 값은 다시 쓰지 않아 MutationObserver 반복을 방지합니다.
  const observer = new MutationObserver(keepMenuTabsInTabOrder);
  observer.observe(nav, { subtree: true, attributes: true, attributeFilter: ['tabindex'] });
  keepMenuTabsInTabOrder();

  // 메뉴 다음 Tab은 선택된 화면 패널에 먼저 도달하고, 그 다음 Tab부터
  // 패널 안의 버튼으로 진행하도록 합니다. hidden 패널은 기본적으로 Tab에서 제외됩니다.
  for (const panel of document.querySelectorAll('[role="tabpanel"]')) {
    panel.tabIndex = 0;
  }

  const note = nav.parentElement?.querySelector('.sidebar-note');
  if (note) {
    note.textContent = 'Tab으로 보호 현황 → 업무 앱 → 보안 기록을 순서대로 이동하고 Enter로 선택합니다. 마지막 메뉴 다음 Tab은 선택한 화면으로 이동합니다. 방향키로도 메뉴를 이동할 수 있습니다.';
  }

  // 마우스로 선택한 메뉴에도 키보드 초점을 맞춥니다. app.js의 클릭 처리가
  // 선택 탭 외의 tabindex를 바꾼 경우도 동기적으로 보정합니다.
  nav.addEventListener('click', (event) => {
    const target = event.target;
    const tab = target instanceof Element ? target.closest('[role="tab"]') : null;
    if (!tab || !nav.contains(tab)) return;
    keepMenuTabsInTabOrder();
    tab.focus();
  });
}
