import { FORMS } from '../content/index.js';

export function mountForms(el) {
  const wrap = document.createElement('div');
  wrap.className = 'form-list';

  for (const form of FORMS) {
    const card = document.createElement('div');
    card.className = 'form-card';
    card.dataset.form = form.title;

    const heading = document.createElement('h3');
    heading.textContent = form.title;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Open ${form.title}`;
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = form.url;
      frame.title = form.title;
      frame.loading = 'lazy';
      frame.width = '100%';
      frame.height = '1000';
      button.replaceWith(frame);
    });

    card.append(heading, button);
    wrap.append(card);
  }

  el.append(wrap);
}
