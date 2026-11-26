// Enquiry form — progressive enhancement over a plain POST form.
const MESSAGES: Record<string, (el: HTMLInputElement | HTMLTextAreaElement) => string> = {
  name: () => 'Please enter your full name.',
  company: () => 'Please enter your company name.',
  email: (el) => (el.validity.valueMissing ? 'Please enter your email address.' : 'Please enter a valid email address, like name@company.com.'),
  message: () => 'Please tell us the count, application and quantity you need.',
};

export function initEnquiryForm() {
  const form = document.querySelector<HTMLFormElement>('form[data-enquiry]');
  if (!form) return;
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const card = form.closest<HTMLElement>('[data-form-card]')!;
  const success = card.querySelector<HTMLElement>('[data-form-success]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const select = form.querySelector<HTMLSelectElement>('#product_interest');

  // Pre-fill from ?product=
  const wanted = new URLSearchParams(location.search).get('product');
  if (wanted && select) {
    const match = [...select.options].find((o) => o.value.toLowerCase() === wanted.toLowerCase());
    if (match) select.value = match.value;
  }
  // Same-page "Request sample" links: set the product without a reload.
  document.querySelectorAll<HTMLAnchorElement>('[data-product-cta]').forEach((a) =>
    a.addEventListener('click', () => { if (select) select.value = a.dataset.productCta ?? ''; })
  );

  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required]')];

  const validate = (el: HTMLInputElement | HTMLTextAreaElement) => {
    el.value = el.value.trimStart();
    const err = document.getElementById(`${el.id}-error`);
    const ok = el.checkValidity() && el.value.trim() !== '';
    el.setAttribute('aria-invalid', String(!ok));
    if (err) err.textContent = ok ? '' : (MESSAGES[el.name]?.(el) ?? 'This field is required.');
    return ok;
  };
  fields.forEach((el) => {
    el.addEventListener('blur', () => { if (el.value || el.getAttribute('aria-invalid')) validate(el); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') validate(el); });
  });

  const setStatus = (msg: string, state: 'idle' | 'error' | 'success' | 'busy') => {
    status.dataset.state = state;
    status.textContent = msg;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = fields.filter((f) => !validate(f));
    if (invalid.length) {
      setStatus(`Please fix ${invalid.length} ${invalid.length === 1 ? 'field' : 'fields'} before sending.`, 'error');
      invalid[0]!.focus();
      return;
    }
    const data = new FormData(form);
    if (String(data.get('website') ?? '') !== '') { showSuccess(); return; } // honeypot: silently drop bots

    submit.disabled = true;
    setStatus('Sending your enquiry…', 'busy');
    try {
      const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      showSuccess();
    } catch {
      const body = encodeURIComponent(
        [`Name: ${data.get('name')}`, `Company: ${data.get('company')}`, `Email: ${data.get('email')}`, `Phone: ${data.get('phone') || '-'}`, `Product: ${data.get('product_interest') || '-'}`, '', String(data.get('message'))].join('\n')
      );
      const subject = encodeURIComponent(`Yarn enquiry — ${data.get('company')}`);
      status.dataset.state = 'error';
      status.innerHTML = '';
      status.append('We could not send the form right now. ');
      const a = document.createElement('a');
      a.href = `mailto:${form.dataset.mailto}?subject=${subject}&body=${body}`;
      a.textContent = 'Email your enquiry instead';
      status.append(a, ' — your details will be pre-filled.');
    } finally {
      submit.disabled = false;
    }
  });

  function showSuccess() {
    form!.hidden = true;
    success.hidden = false;
    success.focus();
  }
  card.querySelector('[data-form-reset]')?.addEventListener('click', () => {
    form.reset();
    fields.forEach((f) => f.removeAttribute('aria-invalid'));
    setStatus('', 'idle');
    success.hidden = true;
    form.hidden = false;
    form.querySelector<HTMLInputElement>('#name')?.focus();
  });
}
