import { MEDIA } from '../content/index.js';

export function mountMedia(el) {
  const list = document.createElement('div');
  list.className = 'media-list';

  for (const item of MEDIA) {
    const card = document.createElement('article');
    card.dataset.video = item.youtubeId;
    card.className = 'media-card';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-facade';
    button.setAttribute('aria-label', `Play ${item.name}`);
    button.style.backgroundImage = `url(https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg)`;

    const title = document.createElement('h3');
    title.textContent = item.name;

    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1`;
      frame.title = item.name;
      frame.loading = 'lazy';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      button.replaceWith(frame);
      // replaceWith removes the focused element, which resets focus to <body>.
      // Move focus onto the embed so keyboard users stay where they were.
      frame.tabIndex = -1;
      frame.focus();
    });

    card.append(button, title);
    list.append(card);
  }

  el.append(list);
}
