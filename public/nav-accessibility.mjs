// Tab 키를 누를 때 주 메뉴의 각 탭에 순서대로 초점을 이동한다.
// Enter/Space 활성화와 방향키 처리는 기존 app.js의 버튼 동작에 맡긴다.
const nav = document.getElementById('nav');

nav?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab' || !(event.target instanceof HTMLElement)) return;

  const tabs = [...nav.querySelectorAll('[role="tab"]')];
  const currentIndex = tabs.indexOf(event.target);
  if (currentIndex < 0) return;

  const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
  if (nextIndex < 0 || nextIndex >= tabs.length) return;

  event.preventDefault();
  tabs[nextIndex].focus();
});
