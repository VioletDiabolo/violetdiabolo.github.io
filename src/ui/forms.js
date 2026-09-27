import { FORMS } from '../content/index.js';

/**
 * A form from FORMS by its id. Throws rather than returning undefined: a card placed by
 * id that silently rendered nothing would be a Join us page missing its sign-up, with a
 * green suite, because nothing else on the page would look wrong.
 */
export function formById(id) {
  const form = FORMS.find((f) => f.id === id);
  if (!form) throw new Error(`no form with id "${id}" in FORMS`);
  return form;
}

/**
 * A button that swaps itself for the Google Form it opens.
 *
 * A facade, not an iframe up front: an embedded Form is a full page of third-party
 * script, and two of them on the Join us page would be loaded by everyone who only came
 * to read the practice times. The button costs nothing until it is pressed.
 *
 * One form per button, where this used to mount every form as a set. The Join us page
 * gives each form its own card, beside the Discord link, in the order it wants them.
 */
export function formButton(form) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  button.dataset.form = form.id;
  button.textContent = `Open ${form.title}`;
  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.className = 'form-frame';
    frame.src = form.url;
    frame.title = form.title;
    frame.loading = 'lazy';
    frame.width = '100%';
    frame.height = '1000';
    button.replaceWith(frame);
    // replaceWith removes the focused element, which resets focus to <body>.
    // Move focus onto the embed so keyboard users stay where they were.
    frame.tabIndex = -1;
    frame.focus();
  });
  return button;
}
