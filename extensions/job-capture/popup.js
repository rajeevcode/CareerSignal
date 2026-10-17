/* global chrome */
const originInput = document.getElementById('origin');
chrome.storage.local.get('careerOrigin').then(({ careerOrigin }) => {
  if (careerOrigin) originInput.value = careerOrigin;
});
document.getElementById('capture').addEventListener('click', async () => {
  const status = document.getElementById('status');
  try {
    const origin = new URL(originInput.value);
    if (
      origin.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(origin.hostname)
    )
      throw new Error('Use HTTPS for your app origin.');
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password
    )
      throw new Error('Invalid app origin.');
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        let job = null;
        function find(value) {
          if (!value || typeof value !== 'object') return;
          if (value['@type'] === 'JobPosting') job = value;
          if (Array.isArray(value)) value.forEach(find);
          else if (value['@graph']) find(value['@graph']);
        }
        for (const script of document.querySelectorAll(
          'script[type="application/ld+json"]',
        ))
          try {
            find(JSON.parse(script.textContent));
          } catch {
            /* Unrelated invalid page metadata. */
          }
        const descriptionText = new DOMParser().parseFromString(
          typeof job?.description === 'string' ? job.description : '',
          'text/html',
        ).body.textContent;
        return {
          url: location.href,
          title: String(
            job?.title ||
              document.querySelector('h1')?.textContent ||
              document.title,
          ).slice(0, 300),
          company: String(job?.hiringOrganization?.name || '').slice(0, 300),
          description: (
            getSelection()?.toString() ||
            descriptionText ||
            document.querySelector('main')?.innerText ||
            ''
          ).slice(0, 50000),
          country: String(
            job?.jobLocation?.address?.addressCountry || '',
          ).slice(0, 100),
        };
      },
    });
    const encoded = btoa(
      Array.from(new TextEncoder().encode(JSON.stringify(result)), (byte) =>
        String.fromCharCode(byte),
      ).join(''),
    );
    await chrome.storage.local.set({ careerOrigin: origin.origin });
    await chrome.tabs.create({
      url: `${origin.origin}/career#capture=${encodeURIComponent(encoded)}`,
    });
    status.textContent = 'Captured for review. No application was submitted.';
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? error.message
        : 'Unable to capture this page. Copy the job details manually.';
  }
});
