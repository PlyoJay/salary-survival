// Paste into the inspected WebView console at the top of each page with the keyboard closed.
// This standalone script is not imported by the app and does not read stored budget data.
(() => {
  const px = value => {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : null;
  };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:0!important;height:env(safe-area-inset-top, 0px)!important;padding:0!important;margin:0!important;border:0!important;visibility:hidden!important;pointer-events:none!important;box-sizing:content-box!important;';
  let cssSafeAreaTop;
  try {
    document.body.appendChild(probe);
    cssSafeAreaTop = px(getComputedStyle(probe).height);
  } finally {
    probe.remove();
  }
  const selectors = ['html', 'body', '#root', '.app-shell', '.app-content', '.page', '.page-header', '.page-header .eyebrow', '.page-header h1', '.bottom-navigation'];
  const elements = selectors.map(selector => {
    const element = document.querySelector(selector);
    if (!element) return { selector, present: false };
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      selector,
      present: true,
      viewportTop: rect.top,
      documentTop: rect.top + window.scrollY,
      height: rect.height,
      paddingTop: px(style.paddingTop),
      marginTop: px(style.marginTop),
      borderTop: px(style.borderTopWidth),
      contentBoxViewportTop: rect.top + px(style.borderTopWidth) + px(style.paddingTop),
      paddingBottom: px(style.paddingBottom),
      position: style.position,
      transform: style.transform,
    };
  });
  const page = elements.find(element => element.selector === '.page');
  const header = elements.find(element => element.selector === '.page-header');
  const eyebrow = elements.find(element => element.selector === '.page-header .eyebrow');
  const viewport = window.visualViewport;
  const report = {
    path: location.pathname,
    cssSafeAreaSupported: CSS.supports('height', 'env(safe-area-inset-top)'),
    cssSafeAreaTop,
    // Provider snapshot from SDK; this variable itself does NOT apply padding.
    tdsSdkSafeAreaTopSnapshot: px(getComputedStyle(document.body).getPropertyValue('--toss-safe-area-top')),
    scrollY: window.scrollY,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      visualHeight: viewport?.height ?? null,
      visualOffsetTop: viewport?.offsetTop ?? null,
      scale: viewport?.scale ?? null,
    },
    appVisualTopSpacing: page?.present ? page.paddingTop - cssSafeAreaTop + (header?.paddingTop ?? 0) : null,
    firstLabelOffsetFromPage: page?.present && eyebrow?.present ? eyebrow.viewportTop - page.viewportTop : null,
    nativeHeaderViewportBoundary: 'Not measurable through DOM. Compare with device screenshot / native WebView bounds.',
    elements,
  };
  console.table(elements);
  console.log(JSON.stringify(report, null, 2));
  return report;
})();
